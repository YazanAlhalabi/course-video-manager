import { Console, Data, Effect, Schema } from "effect";
import type { Route } from "./+types/api.lessons.$lessonId.update-name";
import { DBFunctionsService } from "@/services/db-service.server";
import { RepoWriteService } from "@/services/repo-write-service";
import { runtimeLive } from "@/services/layer.server";
import { withDatabaseDump } from "@/services/dump-service";
import { parseLessonPath } from "@/services/lesson-path-service";
import { data } from "react-router";

const updateLessonNameSchema = Schema.Struct({
  path: Schema.String.pipe(
    Schema.minLength(1, { message: () => "Lesson name cannot be empty" }),
    Schema.filter(
      (s) => {
        // Basic validation: no filesystem-unsafe characters
        const invalidChars = /[<>:"|?*\x00-\x1F]/;
        return !invalidChars.test(s);
      },
      { message: () => "Lesson name contains invalid characters" }
    )
  ),
});

class InvalidOrderError extends Data.TaggedError("InvalidOrderError")<{
  message: string;
}> {}

export const action = async (args: Route.ActionArgs) => {
  const formData = await args.request.formData();
  const formDataObject = Object.fromEntries(formData);

  return Effect.gen(function* () {
    const { path: newPath } = yield* Schema.decodeUnknown(
      updateLessonNameSchema
    )(formDataObject);

    const db = yield* DBFunctionsService;
    const repoWrite = yield* RepoWriteService;

    const order = Number(newPath.split("-")[0]);

    if (isNaN(order)) {
      return yield* new InvalidOrderError({
        message: "String does not contain a valid order",
      });
    }

    // Fetch current lesson with hierarchy to get repo and section paths
    const currentLesson = yield* db.getLessonWithHierarchyById(
      args.params.lessonId
    );

    // If the slug has changed, perform git mv on the filesystem
    const oldParsed = parseLessonPath(currentLesson.path);
    const newParsed = parseLessonPath(newPath.trim());

    if (oldParsed && newParsed && oldParsed.slug !== newParsed.slug) {
      const repoPath = currentLesson.section.repoVersion.repo.filePath;
      const sectionPath = currentLesson.section.path;

      yield* repoWrite.renameLesson({
        repoPath,
        sectionPath,
        oldLessonDirName: currentLesson.path,
        newSlug: newParsed.slug,
      });
    }

    yield* db.updateLesson(args.params.lessonId, {
      path: newPath.trim(),
      sectionId: currentLesson.sectionId,
      lessonNumber: order,
    });

    return { success: true };
  }).pipe(
    withDatabaseDump,
    Effect.tapErrorCause((e) => Console.dir(e, { depth: null })),
    Effect.catchTag("ParseError", () => {
      return Effect.die(data("Invalid request", { status: 400 }));
    }),
    Effect.catchTag("InvalidOrderError", () => {
      return Effect.die(data("Invalid order in path", { status: 400 }));
    }),
    Effect.catchTag("NotFoundError", () => {
      return Effect.die(data("Lesson not found", { status: 404 }));
    }),
    Effect.catchAll(() => {
      return Effect.die(data("Internal server error", { status: 500 }));
    }),
    runtimeLive.runPromise
  );
};
