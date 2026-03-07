import { Data, Effect } from "effect";
import { DBFunctionsService } from "./db-service.server";
import { RepoWriteService } from "./repo-write-service";
import {
  toSlug,
  computeInsertionPlan,
  parseLessonPath,
} from "./lesson-path-service";
import { parseSectionPath } from "./section-path-service";

export class CourseWriteError extends Data.TaggedError("CourseWriteError")<{
  cause: unknown;
  message: string;
}> {}

export class CourseWriteService extends Effect.Service<CourseWriteService>()(
  "CourseWriteService",
  {
    effect: Effect.gen(function* () {
      const db = yield* DBFunctionsService;
      const repoWrite = yield* RepoWriteService;

      /**
       * Materializes a ghost lesson to disk.
       *
       * Fetches the ghost lesson and its section hierarchy, computes the
       * insertion position among real lessons, renames shifted lessons on
       * disk, creates the new lesson directory, and updates all affected
       * DB records.
       */
      const materializeGhost = Effect.fn("materializeGhost")(function* (
        lessonId: string
      ) {
        const lesson = yield* db.getLessonWithHierarchyById(lessonId);

        if (lesson.fsStatus !== "ghost") {
          return yield* new CourseWriteError({
            cause: null,
            message: "Lesson is already on disk",
          });
        }

        const repoPath = lesson.section.repoVersion.repo.filePath;
        const sectionPath = lesson.section.path;
        const parsed = parseSectionPath(sectionPath);
        const sectionNumber = parsed?.sectionNumber ?? 1;
        const slug =
          toSlug(lesson.title || "") || toSlug(lesson.path) || "untitled";

        // Get all lessons in the section to determine insert position
        const sectionLessons = yield* db.getLessonsBySectionId(
          lesson.sectionId
        );
        const ghostOrder = lesson.order;

        // Find the ghost's position among real lessons only (sorted by order)
        const realLessons = sectionLessons.filter(
          (l) => l.fsStatus !== "ghost"
        );
        let insertAtIndex = realLessons.length; // default: append at end
        for (let i = 0; i < realLessons.length; i++) {
          if (realLessons[i]!.order > ghostOrder) {
            insertAtIndex = i;
            break;
          }
        }

        const existingRealLessons = realLessons.map((l) => ({
          id: l.id,
          path: l.path,
        }));

        const plan = computeInsertionPlan({
          existingRealLessons,
          insertAtIndex,
          sectionNumber,
          slug,
        });

        // Rename shifted lessons on disk first
        if (plan.renames.length > 0) {
          yield* repoWrite.renameLessons({
            repoPath,
            sectionPath,
            renames: plan.renames.map((r) => ({
              oldPath: r.oldPath,
              newPath: r.newPath,
            })),
          });

          // Update DB paths for renamed lessons
          for (const rename of plan.renames) {
            const renamedParsed = parseLessonPath(rename.newPath);
            if (renamedParsed) {
              yield* db.updateLesson(rename.id, {
                path: rename.newPath,
              });
            }
          }
        }

        // Create the lesson directory on the filesystem
        yield* repoWrite.createLessonDirectory({
          repoPath,
          sectionPath,
          lessonDirName: plan.newLessonDirName,
        });

        // Update lesson: set fsStatus to real and update path
        yield* db.updateLesson(lessonId, {
          fsStatus: "real",
          path: plan.newLessonDirName,
          sectionId: lesson.sectionId,
        });

        return { success: true, path: plan.newLessonDirName };
      });

      return { materializeGhost };
    }),
    dependencies: [DBFunctionsService.Default, RepoWriteService.Default],
  }
) {}
