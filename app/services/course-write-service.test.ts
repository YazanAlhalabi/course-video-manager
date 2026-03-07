import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "@/db/schema";
import { describe, it, expect, afterEach } from "vitest";
import { Effect, Layer } from "effect";
import { pushSchema } from "drizzle-kit/api";
import { DBFunctionsService } from "@/services/db-service.server";
import { DrizzleService } from "@/services/drizzle-service.server";
import { CourseWriteService } from "@/services/course-write-service";
import { NodeContext } from "@effect/platform-node";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { tmpdir } from "node:os";

let tempDir: string;

const setupTempGitRepo = () => {
  tempDir = fs.mkdtempSync(path.join(tmpdir(), "course-write-test-"));
  execSync("git init", { cwd: tempDir });
  execSync('git config user.email "test@test.com"', { cwd: tempDir });
  execSync('git config user.name "Test"', { cwd: tempDir });
  fs.writeFileSync(path.join(tempDir, ".gitkeep"), "");
  execSync("git add . && git commit -m 'init'", { cwd: tempDir });
};

/**
 * Creates test infrastructure: PGlite DB + temp git repo + composed layer.
 * Returns seed helpers and a run function for executing effects.
 */
const setup = async () => {
  setupTempGitRepo();

  const pglite = new PGlite();
  const testDb = drizzle(pglite, { schema });
  const { apply } = await pushSchema(schema, testDb as any);
  await apply();

  const drizzleLayer = Layer.succeed(DrizzleService, testDb as any);

  const testLayer = Layer.mergeAll(
    CourseWriteService.Default,
    DBFunctionsService.Default
  ).pipe(Layer.provide(drizzleLayer), Layer.provide(NodeContext.layer));

  const dbLayer = DBFunctionsService.Default.pipe(Layer.provide(drizzleLayer));

  const run = <A, E>(effect: Effect.Effect<A, E, CourseWriteService>) =>
    Effect.runPromise(effect.pipe(Effect.provide(testLayer)));

  // Seed repo + version
  const repo = await Effect.gen(function* () {
    const db = yield* DBFunctionsService;
    return yield* db.createRepo({ filePath: tempDir, name: "test-repo" });
  }).pipe(Effect.provide(dbLayer), Effect.runPromise);

  const version = await Effect.gen(function* () {
    const db = yield* DBFunctionsService;
    return yield* db.createRepoVersion({ repoId: repo.id, name: "v1" });
  }).pipe(Effect.provide(dbLayer), Effect.runPromise);

  const createSection = async (sectionPath: string, order: number) => {
    const sectionDir = path.join(tempDir, sectionPath);
    fs.mkdirSync(sectionDir, { recursive: true });
    fs.writeFileSync(path.join(sectionDir, ".gitkeep"), "");
    execSync(`git add . && git commit -m 'add ${sectionPath}'`, {
      cwd: tempDir,
    });
    const sections = await Effect.gen(function* () {
      const db = yield* DBFunctionsService;
      return yield* db.createSections({
        repoVersionId: version.id,
        sections: [
          { sectionPathWithNumber: sectionPath, sectionNumber: order },
        ],
      });
    }).pipe(Effect.provide(dbLayer), Effect.runPromise);
    return sections[0]!;
  };

  const createRealLesson = async (
    sectionId: string,
    sectionPath: string,
    lessonPath: string,
    order: number
  ) => {
    const explainerDir = path.join(
      tempDir,
      sectionPath,
      lessonPath,
      "explainer"
    );
    fs.mkdirSync(explainerDir, { recursive: true });
    fs.writeFileSync(path.join(explainerDir, "readme.md"), "# Test\n");
    execSync(`git add . && git commit -m 'add ${lessonPath}'`, {
      cwd: tempDir,
    });
    const lessons = await Effect.gen(function* () {
      const db = yield* DBFunctionsService;
      return yield* db.createLessons(sectionId, [
        { lessonPathWithNumber: lessonPath, lessonNumber: order },
      ]);
    }).pipe(Effect.provide(dbLayer), Effect.runPromise);
    return lessons[0]!;
  };

  const createGhostLesson = async (
    sectionId: string,
    title: string,
    slug: string,
    order: number
  ) => {
    const lesson = await Effect.gen(function* () {
      const db = yield* DBFunctionsService;
      return yield* db.createGhostLesson(sectionId, {
        title,
        path: slug,
        order,
      });
    }).pipe(Effect.provide(dbLayer), Effect.runPromise);
    return lesson[0]!;
  };

  const getLesson = (lessonId: string) =>
    Effect.gen(function* () {
      const db = yield* DBFunctionsService;
      return yield* db.getLessonWithHierarchyById(lessonId);
    }).pipe(Effect.provide(dbLayer), Effect.runPromise);

  return {
    run,
    createSection,
    createRealLesson,
    createGhostLesson,
    getLesson,
  };
};

describe("CourseWriteService", () => {
  afterEach(() => {
    if (tempDir) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe("materializeGhost", () => {
    it("ghost at the end: creates directory, no shifts needed", async () => {
      const {
        run,
        createSection,
        createRealLesson,
        createGhostLesson,
        getLesson,
      } = await setup();

      const section = await createSection("01-intro", 1);
      await createRealLesson(section.id, "01-intro", "01.01-first-lesson", 1);
      const ghost = await createGhostLesson(
        section.id,
        "Second Lesson",
        "second-lesson",
        2
      );

      const result = await run(
        Effect.gen(function* () {
          const service = yield* CourseWriteService;
          return yield* service.materializeGhost(ghost.id);
        })
      );

      expect(result.path).toBe("01.02-second-lesson");

      // Verify directory was created
      expect(
        fs.existsSync(
          path.join(
            tempDir,
            "01-intro",
            "01.02-second-lesson",
            "explainer",
            "readme.md"
          )
        )
      ).toBe(true);

      // Verify DB updated
      const updated = await getLesson(ghost.id);
      expect(updated.fsStatus).toBe("real");
      expect(updated.path).toBe("01.02-second-lesson");
    });

    it("ghost in the middle: creates directory AND shifts subsequent real lessons", async () => {
      const {
        run,
        createSection,
        createRealLesson,
        createGhostLesson,
        getLesson,
      } = await setup();

      const section = await createSection("01-intro", 1);
      const real1 = await createRealLesson(
        section.id,
        "01-intro",
        "01.01-first-lesson",
        1
      );
      const ghost = await createGhostLesson(
        section.id,
        "Middle Lesson",
        "middle-lesson",
        2
      );
      const real2 = await createRealLesson(
        section.id,
        "01-intro",
        "01.02-third-lesson",
        3
      );

      const result = await run(
        Effect.gen(function* () {
          const service = yield* CourseWriteService;
          return yield* service.materializeGhost(ghost.id);
        })
      );

      // Ghost (order=2) is between real1 (order=1) and real2 (order=3)
      // insertAtIndex = 1, new lesson = 01.02, real2 shifts 01.02 → 01.03
      expect(result.path).toBe("01.02-middle-lesson");

      // New directory created
      expect(
        fs.existsSync(path.join(tempDir, "01-intro", "01.02-middle-lesson"))
      ).toBe(true);

      // Shifted lesson directory renamed
      expect(
        fs.existsSync(path.join(tempDir, "01-intro", "01.03-third-lesson"))
      ).toBe(true);
      expect(
        fs.existsSync(path.join(tempDir, "01-intro", "01.02-third-lesson"))
      ).toBe(false);

      // DB: ghost is now real
      const updatedGhost = await getLesson(ghost.id);
      expect(updatedGhost.fsStatus).toBe("real");
      expect(updatedGhost.path).toBe("01.02-middle-lesson");

      // DB: shifted lesson path updated
      const updatedReal2 = await getLesson(real2.id);
      expect(updatedReal2.path).toBe("01.03-third-lesson");

      // DB: first real lesson unchanged
      const updatedReal1 = await getLesson(real1.id);
      expect(updatedReal1.path).toBe("01.01-first-lesson");
    });

    it("ghost at the beginning: shifts all real lessons", async () => {
      const {
        run,
        createSection,
        createRealLesson,
        createGhostLesson,
        getLesson,
      } = await setup();

      const section = await createSection("01-intro", 1);
      const ghost = await createGhostLesson(
        section.id,
        "Before All",
        "before-all",
        0
      );
      const real1 = await createRealLesson(
        section.id,
        "01-intro",
        "01.01-first-lesson",
        1
      );
      const real2 = await createRealLesson(
        section.id,
        "01-intro",
        "01.02-second-lesson",
        2
      );

      const result = await run(
        Effect.gen(function* () {
          const service = yield* CourseWriteService;
          return yield* service.materializeGhost(ghost.id);
        })
      );

      // Ghost (order=0) before all reals, insertAtIndex = 0
      // New = 01.01, real1 shifts 01.01 → 01.02, real2 shifts 01.02 → 01.03
      expect(result.path).toBe("01.01-before-all");

      // Verify directories
      expect(
        fs.existsSync(path.join(tempDir, "01-intro", "01.01-before-all"))
      ).toBe(true);
      expect(
        fs.existsSync(path.join(tempDir, "01-intro", "01.02-first-lesson"))
      ).toBe(true);
      expect(
        fs.existsSync(path.join(tempDir, "01-intro", "01.03-second-lesson"))
      ).toBe(true);

      // Old paths gone
      expect(
        fs.existsSync(path.join(tempDir, "01-intro", "01.01-first-lesson"))
      ).toBe(false);
      expect(
        fs.existsSync(path.join(tempDir, "01-intro", "01.02-second-lesson"))
      ).toBe(false);

      // Verify DB
      const updatedGhost = await getLesson(ghost.id);
      expect(updatedGhost.path).toBe("01.01-before-all");

      const updatedReal1 = await getLesson(real1.id);
      expect(updatedReal1.path).toBe("01.02-first-lesson");

      const updatedReal2 = await getLesson(real2.id);
      expect(updatedReal2.path).toBe("01.03-second-lesson");
    });

    it("multiple ghosts interspersed: only real lessons are shifted", async () => {
      const {
        run,
        createSection,
        createRealLesson,
        createGhostLesson,
        getLesson,
      } = await setup();

      const section = await createSection("01-intro", 1);

      // Order: real1(1), ghost1(2), ghost2(3), real2(4)
      const real1 = await createRealLesson(
        section.id,
        "01-intro",
        "01.01-first",
        1
      );
      await createGhostLesson(section.id, "Ghost One", "ghost-one", 2);
      const ghost2 = await createGhostLesson(
        section.id,
        "Ghost Two",
        "ghost-two",
        3
      );
      const real2 = await createRealLesson(
        section.id,
        "01-intro",
        "01.02-fourth",
        4
      );

      // Materialize ghost2 (order=3)
      // Real lessons: real1(order=1), real2(order=4)
      // insertAtIndex = 1 (real2 order=4 > ghost order=3)
      // New = 01.02, real2 shifts 01.02 → 01.03
      const result = await run(
        Effect.gen(function* () {
          const service = yield* CourseWriteService;
          return yield* service.materializeGhost(ghost2.id);
        })
      );

      expect(result.path).toBe("01.02-ghost-two");

      // Verify filesystem
      expect(fs.existsSync(path.join(tempDir, "01-intro", "01.01-first"))).toBe(
        true
      );
      expect(
        fs.existsSync(path.join(tempDir, "01-intro", "01.02-ghost-two"))
      ).toBe(true);
      expect(
        fs.existsSync(path.join(tempDir, "01-intro", "01.03-fourth"))
      ).toBe(true);
      expect(
        fs.existsSync(path.join(tempDir, "01-intro", "01.02-fourth"))
      ).toBe(false);

      // Verify DB
      const updatedReal1 = await getLesson(real1.id);
      expect(updatedReal1.path).toBe("01.01-first");

      const updatedReal2 = await getLesson(real2.id);
      expect(updatedReal2.path).toBe("01.03-fourth");
    });

    it("rejects materializing a lesson that is already on disk", async () => {
      const { run, createSection, createRealLesson } = await setup();

      const section = await createSection("01-intro", 1);
      const real = await createRealLesson(
        section.id,
        "01-intro",
        "01.01-already-real",
        1
      );

      await expect(
        run(
          Effect.gen(function* () {
            const service = yield* CourseWriteService;
            return yield* service.materializeGhost(real.id);
          })
        )
      ).rejects.toThrow();
    });
  });
});
