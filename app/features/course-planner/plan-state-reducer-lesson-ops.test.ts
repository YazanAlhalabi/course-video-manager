import { describe, expect, it } from "vitest";
import { planStateReducer, createInitialPlanState } from "./plan-state-reducer";
import type { Plan } from "./types";
import { ReducerTester } from "@/test-utils/reducer-tester";

const createTestPlan = (overrides: Partial<Plan> = {}): Plan => ({
  id: "plan-1",
  title: "Test Plan",
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
  sections: [],
  ...overrides,
});

const createInitialState = (
  plan: Plan = createTestPlan()
): planStateReducer.State => createInitialPlanState(plan);

describe("planStateReducer", () => {
  describe("Add Lesson (13-16)", () => {
    const planWithSection = createTestPlan({
      sections: [{ id: "s1", title: "Section 1", order: 0, lessons: [] }],
    });

    it("13. add-lesson-clicked: enter add lesson mode for section", () => {
      const tester = new ReducerTester(
        planStateReducer,
        createInitialState(planWithSection)
      );

      const state = tester
        .send({ type: "add-lesson-clicked", sectionId: "s1" })
        .getState();

      expect(state.addingLesson).toEqual({ sectionId: "s1", value: "" });
    });

    it("14. new-lesson-title-changed: update value", () => {
      const tester = new ReducerTester(
        planStateReducer,
        createInitialState(planWithSection)
      );

      const state = tester
        .send({ type: "add-lesson-clicked", sectionId: "s1" })
        .send({ type: "new-lesson-title-changed", value: "New Lesson" })
        .getState();

      expect(state.addingLesson).toEqual({
        sectionId: "s1",
        value: "New Lesson",
      });
    });

    it("15. new-lesson-save-requested: add lesson + emit plan-changed + emit focus", () => {
      const tester = new ReducerTester(
        planStateReducer,
        createInitialState(planWithSection)
      );

      const state = tester
        .send({ type: "add-lesson-clicked", sectionId: "s1" })
        .resetExec()
        .send({ type: "new-lesson-title-changed", value: "New Lesson" })
        .send({ type: "new-lesson-save-requested" })
        .getState();

      expect(state.addingLesson).toBeNull();
      expect(state.plan.sections[0]?.lessons).toHaveLength(1);
      expect(state.plan.sections[0]?.lessons[0]?.title).toBe("New Lesson");
      expect(state.plan.sections[0]?.lessons[0]?.order).toBe(1);
      expect(state.plan.sections[0]?.lessons[0]?.description).toBe("");

      expect(state.focusRequest).toEqual({
        type: "add-lesson-button",
        sectionId: "s1",
      });

      expect(tester.getExec()).toHaveBeenCalledWith(
        expect.objectContaining({ type: "plan-changed" })
      );
      expect(tester.getExec()).toHaveBeenCalledWith({
        type: "focus-element",
        target: { type: "add-lesson-button", sectionId: "s1" },
      });
    });

    it("16. new-lesson-cancel-requested: exit add mode", () => {
      const tester = new ReducerTester(
        planStateReducer,
        createInitialState(planWithSection)
      );

      const state = tester
        .send({ type: "add-lesson-clicked", sectionId: "s1" })
        .send({ type: "new-lesson-title-changed", value: "New Lesson" })
        .send({ type: "new-lesson-cancel-requested" })
        .getState();

      expect(state.addingLesson).toBeNull();
      expect(state.plan.sections[0]?.lessons).toHaveLength(0);
    });
  });

  describe("Edit Lesson (17-20)", () => {
    const planWithLesson = createTestPlan({
      sections: [
        {
          id: "s1",
          title: "Section 1",
          order: 0,
          lessons: [{ id: "l1", title: "Existing Lesson", order: 0 }],
        },
      ],
    });

    it("17. lesson-title-clicked: enter edit mode", () => {
      const tester = new ReducerTester(
        planStateReducer,
        createInitialState(planWithLesson)
      );

      const state = tester
        .send({ type: "lesson-title-clicked", lessonId: "l1", sectionId: "s1" })
        .getState();

      expect(state.editingLesson).toEqual({
        lessonId: "l1",
        value: "Existing Lesson",
      });
    });

    it("18. lesson-title-changed: update value", () => {
      const tester = new ReducerTester(
        planStateReducer,
        createInitialState(planWithLesson)
      );

      const state = tester
        .send({ type: "lesson-title-clicked", lessonId: "l1", sectionId: "s1" })
        .send({ type: "lesson-title-changed", value: "Updated Lesson" })
        .getState();

      expect(state.editingLesson).toEqual({
        lessonId: "l1",
        value: "Updated Lesson",
      });
    });

    it("19. lesson-save-requested: update lesson + emit plan-changed", () => {
      const tester = new ReducerTester(
        planStateReducer,
        createInitialState(planWithLesson)
      );

      const state = tester
        .send({ type: "lesson-title-clicked", lessonId: "l1", sectionId: "s1" })
        .resetExec()
        .send({ type: "lesson-title-changed", value: "Updated Lesson" })
        .send({ type: "lesson-save-requested" })
        .getState();

      expect(state.editingLesson).toBeNull();
      expect(state.plan.sections[0]?.lessons[0]?.title).toBe("Updated Lesson");
      expect(tester.getExec()).toHaveBeenCalledWith(
        expect.objectContaining({ type: "plan-changed" })
      );
    });

    it("20. lesson-cancel-requested: exit edit mode", () => {
      const tester = new ReducerTester(
        planStateReducer,
        createInitialState(planWithLesson)
      );

      const state = tester
        .send({ type: "lesson-title-clicked", lessonId: "l1", sectionId: "s1" })
        .send({ type: "lesson-title-changed", value: "Changed" })
        .send({ type: "lesson-cancel-requested" })
        .getState();

      expect(state.editingLesson).toBeNull();
      expect(state.plan.sections[0]?.lessons[0]?.title).toBe("Existing Lesson");
    });
  });

  describe("Delete Lesson (21)", () => {
    it("21a. lesson-delete-clicked: shows confirmation modal", () => {
      const plan = createTestPlan({
        sections: [
          {
            id: "s1",
            title: "Section 1",
            order: 0,
            lessons: [{ id: "l1", title: "Lesson 1", order: 0 }],
          },
        ],
      });
      const tester = new ReducerTester(
        planStateReducer,
        createInitialState(plan)
      );

      const state = tester
        .send({
          type: "lesson-delete-clicked",
          sectionId: "s1",
          lessonId: "l1",
        })
        .getState();

      expect(state.deletingLesson).toEqual({
        sectionId: "s1",
        lessonId: "l1",
      });
      // Lesson not deleted yet
      expect(state.plan.sections[0]?.lessons).toHaveLength(1);
      // No plan-changed yet
      expect(tester.getExec()).not.toHaveBeenCalled();
    });

    it("21b. lesson-delete-confirmed: remove lesson + remove from dependencies + emit plan-changed", () => {
      const plan = createTestPlan({
        sections: [
          {
            id: "s1",
            title: "Section 1",
            order: 0,
            lessons: [
              { id: "l1", title: "Lesson 1", order: 0 },
              { id: "l2", title: "Lesson 2", order: 1, dependencies: ["l1"] },
              {
                id: "l3",
                title: "Lesson 3",
                order: 2,
                dependencies: ["l1", "l2"],
              },
            ],
          },
        ],
      });
      const tester = new ReducerTester(
        planStateReducer,
        createInitialState(plan)
      );

      const state = tester
        .send({
          type: "lesson-delete-clicked",
          sectionId: "s1",
          lessonId: "l1",
        })
        .resetExec()
        .send({ type: "lesson-delete-confirmed" })
        .getState();

      expect(state.plan.sections[0]?.lessons).toHaveLength(2);
      expect(state.plan.sections[0]?.lessons[0]?.id).toBe("l2");
      expect(state.plan.sections[0]?.lessons[0]?.dependencies).toEqual([]);
      expect(state.plan.sections[0]?.lessons[1]?.id).toBe("l3");
      expect(state.plan.sections[0]?.lessons[1]?.dependencies).toEqual(["l2"]);
      expect(state.deletingLesson).toBeNull();
      expect(tester.getExec()).toHaveBeenCalledWith(
        expect.objectContaining({ type: "plan-changed" })
      );
    });

    it("21c. lesson-delete-cancelled: closes modal without deleting", () => {
      const plan = createTestPlan({
        sections: [
          {
            id: "s1",
            title: "Section 1",
            order: 0,
            lessons: [{ id: "l1", title: "Lesson 1", order: 0 }],
          },
        ],
      });
      const tester = new ReducerTester(
        planStateReducer,
        createInitialState(plan)
      );

      const state = tester
        .send({
          type: "lesson-delete-clicked",
          sectionId: "s1",
          lessonId: "l1",
        })
        .send({ type: "lesson-delete-cancelled" })
        .getState();

      expect(state.plan.sections[0]?.lessons).toHaveLength(1);
      expect(state.deletingLesson).toBeNull();
      expect(tester.getExec()).not.toHaveBeenCalled();
    });

    it("21d. lesson-delete-confirmed: does nothing if no pending deletion", () => {
      const plan = createTestPlan({
        sections: [
          {
            id: "s1",
            title: "Section 1",
            order: 0,
            lessons: [{ id: "l1", title: "Lesson 1", order: 0 }],
          },
        ],
      });
      const tester = new ReducerTester(
        planStateReducer,
        createInitialState(plan)
      );

      const state = tester.send({ type: "lesson-delete-confirmed" }).getState();

      expect(state.plan.sections[0]?.lessons).toHaveLength(1);
      expect(tester.getExec()).not.toHaveBeenCalled();
    });
  });

  describe("Lesson Description (22-25)", () => {
    const planWithLesson = createTestPlan({
      sections: [
        {
          id: "s1",
          title: "Section 1",
          order: 0,
          lessons: [
            {
              id: "l1",
              title: "Lesson 1",
              order: 0,
              description: "Initial description",
            },
          ],
        },
      ],
    });

    it("22. lesson-description-clicked: enter description edit mode", () => {
      const tester = new ReducerTester(
        planStateReducer,
        createInitialState(planWithLesson)
      );

      const state = tester
        .send({
          type: "lesson-description-clicked",
          lessonId: "l1",
          sectionId: "s1",
        })
        .getState();

      expect(state.editingDescription).toEqual({
        lessonId: "l1",
        value: "Initial description",
      });
    });

    it("23. lesson-description-changed: update value", () => {
      const tester = new ReducerTester(
        planStateReducer,
        createInitialState(planWithLesson)
      );

      const state = tester
        .send({
          type: "lesson-description-clicked",
          lessonId: "l1",
          sectionId: "s1",
        })
        .send({ type: "lesson-description-changed", value: "New description" })
        .getState();

      expect(state.editingDescription).toEqual({
        lessonId: "l1",
        value: "New description",
      });
    });

    it("24. lesson-description-save-requested: update + emit plan-changed", () => {
      const tester = new ReducerTester(
        planStateReducer,
        createInitialState(planWithLesson)
      );

      const state = tester
        .send({
          type: "lesson-description-clicked",
          lessonId: "l1",
          sectionId: "s1",
        })
        .resetExec()
        .send({ type: "lesson-description-changed", value: "New description" })
        .send({ type: "lesson-description-save-requested" })
        .getState();

      expect(state.editingDescription).toBeNull();
      expect(state.plan.sections[0]?.lessons[0]?.description).toBe(
        "New description"
      );
      expect(tester.getExec()).toHaveBeenCalledWith(
        expect.objectContaining({ type: "plan-changed" })
      );
    });

    it("25. lesson-description-cancel-requested: exit edit mode", () => {
      const tester = new ReducerTester(
        planStateReducer,
        createInitialState(planWithLesson)
      );

      const state = tester
        .send({
          type: "lesson-description-clicked",
          lessonId: "l1",
          sectionId: "s1",
        })
        .send({ type: "lesson-description-changed", value: "Changed" })
        .send({ type: "lesson-description-cancel-requested" })
        .getState();

      expect(state.editingDescription).toBeNull();
      expect(state.plan.sections[0]?.lessons[0]?.description).toBe(
        "Initial description"
      );
    });
  });
});
