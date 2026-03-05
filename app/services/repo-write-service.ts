import { FileSystem } from "@effect/platform";
import { NodeFileSystem } from "@effect/platform-node";
import { Data, Effect } from "effect";
import path from "node:path";
import { buildLessonPath, parseLessonPath } from "./lesson-path-service";

export class RepoWriteError extends Data.TaggedError("RepoWriteError")<{
  cause: unknown;
  message: string;
}> {}

/**
 * Derives a human-readable title from a slug.
 * e.g., "my-awesome-lesson" → "My Awesome Lesson"
 */
const titleFromSlug = (slug: string): string =>
  slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

export class RepoWriteService extends Effect.Service<RepoWriteService>()(
  "RepoWriteService",
  {
    effect: Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;

      /**
       * Creates a lesson directory with an `explainer/readme.md` stub.
       *
       * @param repoPath - Absolute path to the course repo root
       * @param sectionPath - Section directory name (e.g., "01-intro")
       * @param lessonDirName - Full lesson directory name (e.g., "01.03-my-lesson")
       */
      const createLessonDirectory = Effect.fn("createLessonDirectory")(
        function* (opts: {
          repoPath: string;
          sectionPath: string;
          lessonDirName: string;
        }) {
          const explainerDir = path.join(
            opts.repoPath,
            opts.sectionPath,
            opts.lessonDirName,
            "explainer"
          );
          const readmePath = path.join(explainerDir, "readme.md");

          const parsed = parseLessonPath(opts.lessonDirName);
          const slug = parsed?.slug ?? opts.lessonDirName;
          const title = titleFromSlug(slug);

          yield* fs.makeDirectory(explainerDir, { recursive: true });
          yield* fs.writeFileString(readmePath, `# ${title}\n`);
        }
      );

      /**
       * Adds a new lesson to a section, appended at the end.
       * Reads the section directory to determine the next lesson number,
       * then creates the directory structure.
       *
       * @param repoPath - Absolute path to the course repo root
       * @param sectionPath - Section directory name (e.g., "01-intro")
       * @param sectionNumber - The section's number (for building XX.YY format)
       * @param slug - The lesson slug (e.g., "my-lesson")
       * @returns The created lesson directory name and lesson number
       */
      const addLesson = Effect.fn("addLesson")(function* (opts: {
        repoPath: string;
        sectionPath: string;
        sectionNumber: number;
        slug: string;
      }) {
        const sectionDir = path.join(opts.repoPath, opts.sectionPath);

        const entries = yield* fs
          .readDirectory(sectionDir)
          .pipe(Effect.catchAll(() => Effect.succeed([] as string[])));

        let maxLessonNumber = 0;
        for (const entry of entries) {
          const parsed = parseLessonPath(entry);
          if (parsed) {
            maxLessonNumber = Math.max(maxLessonNumber, parsed.lessonNumber);
          }
        }

        const nextLessonNumber = maxLessonNumber + 1;
        const lessonDirName = buildLessonPath(
          opts.sectionNumber,
          nextLessonNumber,
          opts.slug
        );

        yield* createLessonDirectory({
          repoPath: opts.repoPath,
          sectionPath: opts.sectionPath,
          lessonDirName,
        });

        return { lessonDirName, lessonNumber: nextLessonNumber };
      });

      return { createLessonDirectory, addLesson };
    }),
    dependencies: [NodeFileSystem.layer],
  }
) {}
