import { Data, Effect } from "effect";
import { DBFunctionsService } from "./db-service.server";
import { RepoWriteService } from "./repo-write-service";
import {
  toSlug,
  computeInsertionPlan,
  parseLessonPath,
  buildLessonPath,
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

      /**
       * Creates a ghost lesson in the database (no filesystem operations).
       * Appends at the end of the section's lesson order.
       */
      const addGhostLesson = Effect.fn("addGhostLesson")(function* (
        sectionId: string,
        title: string
      ) {
        const existingLessons = yield* db.getLessonsBySectionId(sectionId);
        const maxOrder =
          existingLessons.length > 0
            ? Math.max(...existingLessons.map((l) => l.order))
            : 0;

        const slug = toSlug(title) || "untitled";

        const [newLesson] = yield* db.createGhostLesson(sectionId, {
          title,
          path: slug,
          order: maxOrder + 1,
        });

        return { success: true, lessonId: newLesson!.id };
      });

      /**
       * Deletes a lesson. If real, removes the directory from disk first.
       * Then deletes the DB record.
       */
      const deleteLesson = Effect.fn("deleteLesson")(function* (
        lessonId: string
      ) {
        const lesson = yield* db.getLessonWithHierarchyById(lessonId);

        if (lesson.fsStatus !== "ghost") {
          const repoPath = lesson.section.repoVersion.repo.filePath;
          const sectionPath = lesson.section.path;

          yield* repoWrite.deleteLesson({
            repoPath,
            sectionPath,
            lessonDirName: lesson.path,
          });
        }

        yield* db.deleteLesson(lessonId);

        return { success: true };
      });

      /**
       * Converts a real lesson to a ghost.
       * Deletes the directory from disk, renumbers remaining real lessons
       * to close the numbering gap, and marks the lesson as ghost in DB.
       */
      const convertToGhost = Effect.fn("convertToGhost")(function* (
        lessonId: string
      ) {
        const lesson = yield* db.getLessonWithHierarchyById(lessonId);

        if (lesson.fsStatus !== "real") {
          return yield* new CourseWriteError({
            cause: null,
            message: "Lesson is already a ghost",
          });
        }

        const repoPath = lesson.section.repoVersion.repo.filePath;
        const sectionPath = lesson.section.path;
        const parsed = parseSectionPath(sectionPath);
        const sectionNumber = parsed?.sectionNumber ?? 1;

        // Delete the lesson directory from disk
        yield* repoWrite.deleteLesson({
          repoPath,
          sectionPath,
          lessonDirName: lesson.path,
        });

        // Mark lesson as ghost in DB
        yield* db.updateLesson(lessonId, {
          fsStatus: "ghost",
        });

        // Renumber remaining real lessons to close the gap
        const sectionLessons = yield* db.getLessonsBySectionId(
          lesson.sectionId
        );
        const remainingReal = sectionLessons.filter(
          (l) => l.fsStatus !== "ghost" && l.id !== lessonId
        );

        if (remainingReal.length > 0) {
          const renames: { id: string; oldPath: string; newPath: string }[] =
            [];
          for (let i = 0; i < remainingReal.length; i++) {
            const l = remainingReal[i]!;
            const p = parseLessonPath(l.path);
            if (!p) continue;
            const newPath = buildLessonPath(sectionNumber, i + 1, p.slug);
            if (newPath !== l.path) {
              renames.push({ id: l.id, oldPath: l.path, newPath });
            }
          }

          if (renames.length > 0) {
            yield* repoWrite.renameLessons({
              repoPath,
              sectionPath,
              renames: renames.map((r) => ({
                oldPath: r.oldPath,
                newPath: r.newPath,
              })),
            });

            for (const rename of renames) {
              yield* db.updateLesson(rename.id, {
                path: rename.newPath,
              });
            }
          }
        }

        return { success: true };
      });

      /**
       * Renames a lesson's slug (preserves lesson number).
       * If the slug hasn't changed, this is a no-op.
       * For ghost lessons (unparseable paths), updates the DB path directly.
       */
      const renameLesson = Effect.fn("renameLesson")(function* (
        lessonId: string,
        newSlug: string
      ) {
        const lesson = yield* db.getLessonWithHierarchyById(lessonId);

        const oldParsed = parseLessonPath(lesson.path);

        // Ghost lesson with unparseable path — just update the slug in DB
        if (!oldParsed) {
          if (lesson.path === newSlug) {
            return { success: true, path: lesson.path };
          }
          yield* db.updateLesson(lessonId, { path: newSlug });
          return { success: true, path: newSlug };
        }

        if (oldParsed.slug === newSlug) {
          return { success: true, path: lesson.path };
        }

        const sectionNumber =
          oldParsed.sectionNumber ??
          parseSectionPath(lesson.section.path)?.sectionNumber ??
          1;
        const newPath = buildLessonPath(
          sectionNumber,
          oldParsed.lessonNumber,
          newSlug
        );

        if (lesson.fsStatus !== "ghost") {
          const repoPath = lesson.section.repoVersion.repo.filePath;
          const sectionPath = lesson.section.path;

          yield* repoWrite.renameLesson({
            repoPath,
            sectionPath,
            oldLessonDirName: lesson.path,
            newSlug,
          });
        }

        yield* db.updateLesson(lessonId, {
          path: newPath,
        });

        return { success: true, path: newPath };
      });

      return {
        materializeGhost,
        addGhostLesson,
        deleteLesson,
        convertToGhost,
        renameLesson,
      };
    }),
    dependencies: [DBFunctionsService.Default, RepoWriteService.Default],
  }
) {}
