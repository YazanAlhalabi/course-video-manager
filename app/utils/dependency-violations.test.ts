import { describe, expect, it } from "vitest";
import {
  findNewOrderViolations,
  type LessonForViolationCheck,
} from "./dependency-violations";

const makeLesson = (id: string, deps?: string[]): LessonForViolationCheck => ({
  id,
  title: `Lesson ${id}`,
  path: `01.0${id}-lesson-${id}`,
  dependencies: deps ?? [],
});

describe("findNewOrderViolations", () => {
  it("returns empty when no dependencies exist", () => {
    const lessons = [makeLesson("1"), makeLesson("2"), makeLesson("3")];
    const reordered = [lessons[2]!, lessons[0]!, lessons[1]!];

    expect(findNewOrderViolations(lessons, reordered)).toEqual([]);
  });

  it("returns empty when reorder does not introduce violations", () => {
    // B depends on A. A is before B in both old and new order.
    const A = makeLesson("A");
    const B = makeLesson("B", ["A"]);
    const C = makeLesson("C");

    const oldOrder = [A, B, C];
    const newOrder = [A, C, B]; // B still after A

    expect(findNewOrderViolations(oldOrder, newOrder)).toEqual([]);
  });

  it("detects new violation when dependency moves after the lesson", () => {
    // B depends on A. Old order: A, B (ok). New order: B, A (violation).
    const A = makeLesson("A");
    const B = makeLesson("B", ["A"]);

    const oldOrder = [A, B];
    const newOrder = [B, A];

    const violations = findNewOrderViolations(oldOrder, newOrder);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toEqual({
      lessonId: "B",
      lessonLabel: "Lesson B",
      depId: "A",
      depLabel: "Lesson A",
    });
  });

  it("does not report pre-existing violations", () => {
    // B depends on A. Old order: B, A (already violated). New order: B, C, A (still violated).
    const A = makeLesson("A");
    const B = makeLesson("B", ["A"]);
    const C = makeLesson("C");

    const oldOrder = [B, A, C];
    const newOrder = [B, C, A];

    expect(findNewOrderViolations(oldOrder, newOrder)).toEqual([]);
  });

  it("ignores cross-section dependencies", () => {
    // B depends on X (not in this section). Reordering should not flag it.
    const A = makeLesson("A");
    const B = makeLesson("B", ["X"]);

    const oldOrder = [A, B];
    const newOrder = [B, A];

    expect(findNewOrderViolations(oldOrder, newOrder)).toEqual([]);
  });

  it("detects multiple new violations", () => {
    // C depends on A, D depends on B. Old: A, B, C, D. New: C, D, A, B.
    const A = makeLesson("A");
    const B = makeLesson("B");
    const C = makeLesson("C", ["A"]);
    const D = makeLesson("D", ["B"]);

    const oldOrder = [A, B, C, D];
    const newOrder = [C, D, A, B];

    const violations = findNewOrderViolations(oldOrder, newOrder);
    expect(violations).toHaveLength(2);
    expect(violations).toContainEqual({
      lessonId: "C",
      lessonLabel: "Lesson C",
      depId: "A",
      depLabel: "Lesson A",
    });
    expect(violations).toContainEqual({
      lessonId: "D",
      lessonLabel: "Lesson D",
      depId: "B",
      depLabel: "Lesson B",
    });
  });

  it("reports only new violations when some pre-exist", () => {
    // B depends on A, C depends on A.
    // Old: B, A, C (B→A violated, C→A ok).
    // New: C, B, A (B→A still violated, C→A now violated).
    const A = makeLesson("A");
    const B = makeLesson("B", ["A"]);
    const C = makeLesson("C", ["A"]);

    const oldOrder = [B, A, C];
    const newOrder = [C, B, A];

    const violations = findNewOrderViolations(oldOrder, newOrder);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toEqual({
      lessonId: "C",
      lessonLabel: "Lesson C",
      depId: "A",
      depLabel: "Lesson A",
    });
  });

  it("handles lessons with no dependencies field (null)", () => {
    const A: LessonForViolationCheck = {
      id: "A",
      path: "01.01-a",
      dependencies: null,
    };
    const B = makeLesson("B");

    expect(findNewOrderViolations([A, B], [B, A])).toEqual([]);
  });

  it("returns empty for identical orderings", () => {
    const A = makeLesson("A");
    const B = makeLesson("B", ["A"]);

    expect(findNewOrderViolations([A, B], [A, B])).toEqual([]);
  });

  it("uses path as label when title is null", () => {
    const A: LessonForViolationCheck = {
      id: "A",
      title: null,
      path: "01.01-intro",
      dependencies: [],
    };
    const B: LessonForViolationCheck = {
      id: "B",
      title: null,
      path: "01.02-setup",
      dependencies: ["A"],
    };

    const violations = findNewOrderViolations([A, B], [B, A]);
    expect(violations[0]!.lessonLabel).toBe("01.02-setup");
    expect(violations[0]!.depLabel).toBe("01.01-intro");
  });
});
