import { Console, Effect, Schema } from "effect";
import type { Route } from "./+types/api.lessons.delete";
import { DBFunctionsService } from "@/services/db-service.server";
import { RepoWriteService } from "@/services/repo-write-service";
import { runtimeLive } from "@/services/layer.server";
import { withDatabaseDump } from "@/services/dump-service";
import { data } from "react-router";

const deleteLessonSchema = Schema.Struct({
  lessonId: Schema.String,
});

export const action = async (args: Route.ActionArgs) => {
  const formData = await args.request.formData();
  const formDataObject = Object.fromEntries(formData);

  return Effect.gen(function* () {
    const { lessonId } =
      yield* Schema.decodeUnknown(deleteLessonSchema)(formDataObject);

    const db = yield* DBFunctionsService;
    const repoWrite = yield* RepoWriteService;

    // Fetch lesson with hierarchy to get filesystem paths
    const lesson = yield* db.getLessonWithHierarchyById(lessonId);
    const repoPath = lesson.section.repoVersion.repo.filePath;
    const sectionPath = lesson.section.path;

    // Remove from disk (handles both tracked and untracked files)
    yield* repoWrite.deleteLesson({
      repoPath,
      sectionPath,
      lessonDirName: lesson.path,
    });

    yield* db.deleteLesson(lessonId);

    return { success: true };
  }).pipe(
    withDatabaseDump,
    Effect.tapErrorCause((e) => Console.dir(e, { depth: null })),
    Effect.catchTag("ParseError", () => {
      return Effect.die(data("Invalid request", { status: 400 }));
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
