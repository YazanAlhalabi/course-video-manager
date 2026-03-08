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
  describe("Plan Title (1-4)", () => {
    it("1. plan-title-clicked: enter edit mode with current title", () => {
      const plan = createTestPlan({ title: "My Course" });
      const tester = new ReducerTester(
        planStateReducer,
        createInitialState(plan)
      );

      const state = tester.send({ type: "plan-title-clicked" }).getState();

      expect(state.editingTitle).toEqual({ active: true, value: "My Course" });
    });

    it("2. plan-title-changed: update edited value", () => {
      const plan = createTestPlan({ title: "My Course" });
      const tester = new ReducerTester(
        planStateReducer,
        createInitialState(plan)
      );

      const state = tester
        .send({ type: "plan-title-clicked" })
        .send({ type: "plan-title-changed", value: "New Title" })
        .getState();

      expect(state.editingTitle).toEqual({ active: true, value: "New Title" });
    });

    it("2b. plan-title-changed: does nothing if not editing", () => {
      const plan = createTestPlan({ title: "My Course" });
      const tester = new ReducerTester(
        planStateReducer,
        createInitialState(plan)
      );

      const state = tester
        .send({ type: "plan-title-changed", value: "New Title" })
        .getState();

      expect(state.editingTitle).toEqual({ active: false });
      expect(state.plan.title).toBe("My Course");
    });

    it("3. plan-title-save-requested: if valid, update plan + emit plan-changed", () => {
      const plan = createTestPlan({ title: "My Course" });
      const tester = new ReducerTester(
        planStateReducer,
        createInitialState(plan)
      );

      const state = tester
        .send({ type: "plan-title-clicked" })
        .resetExec()
        .send({ type: "plan-title-changed", value: "New Title" })
        .send({ type: "plan-title-save-requested" })
        .getState();

      expect(state.editingTitle).toEqual({ active: false });
      expect(state.plan.title).toBe("New Title");
      expect(tester.getExec()).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "plan-changed",
        })
      );
    });

    it("3b. plan-title-save-requested: does nothing if empty", () => {
      const plan = createTestPlan({ title: "My Course" });
      const tester = new ReducerTester(
        planStateReducer,
        createInitialState(plan)
      );

      const state = tester
        .send({ type: "plan-title-clicked" })
        .resetExec()
        .send({ type: "plan-title-changed", value: "   " })
        .send({ type: "plan-title-save-requested" })
        .getState();

      // Still in edit mode, title unchanged
      expect(state.editingTitle).toEqual({ active: true, value: "   " });
      expect(state.plan.title).toBe("My Course");
      expect(tester.getExec()).not.toHaveBeenCalled();
    });

    it("3c. plan-title-save-requested: does nothing if not editing", () => {
      const plan = createTestPlan({ title: "My Course" });
      const tester = new ReducerTester(
        planStateReducer,
        createInitialState(plan)
      );

      const state = tester
        .send({ type: "plan-title-save-requested" })
        .getState();

      expect(state.plan.title).toBe("My Course");
      expect(tester.getExec()).not.toHaveBeenCalled();
    });

    it("4. plan-title-cancel-requested: exit edit mode", () => {
      const plan = createTestPlan({ title: "My Course" });
      const tester = new ReducerTester(
        planStateReducer,
        createInitialState(plan)
      );

      const state = tester
        .send({ type: "plan-title-clicked" })
        .send({ type: "plan-title-changed", value: "New Title" })
        .send({ type: "plan-title-cancel-requested" })
        .getState();

      expect(state.editingTitle).toEqual({ active: false });
      expect(state.plan.title).toBe("My Course"); // unchanged
    });
  });

  describe("Add Section (5-8)", () => {
    it("5. add-section-clicked: enter add section mode", () => {
      const tester = new ReducerTester(planStateReducer, createInitialState());

      const state = tester.send({ type: "add-section-clicked" }).getState();

      expect(state.addingSection).toEqual({ active: true, value: "" });
    });

    it("6. new-section-title-changed: update value", () => {
      const tester = new ReducerTester(planStateReducer, createInitialState());

      const state = tester
        .send({ type: "add-section-clicked" })
        .send({ type: "new-section-title-changed", value: "New Section" })
        .getState();

      expect(state.addingSection).toEqual({
        active: true,
        value: "New Section",
      });
    });

    it("7. new-section-save-requested: add section + emit plan-changed + emit focus", () => {
      const tester = new ReducerTester(planStateReducer, createInitialState());

      const state = tester
        .send({ type: "add-section-clicked" })
        .resetExec()
        .send({ type: "new-section-title-changed", value: "New Section" })
        .send({ type: "new-section-save-requested" })
        .getState();

      expect(state.addingSection).toEqual({ active: false });
      expect(state.plan.sections).toHaveLength(1);
      expect(state.plan.sections[0]?.title).toBe("New Section");
      expect(state.plan.sections[0]?.order).toBe(1);
      expect(state.plan.sections[0]?.lessons).toEqual([]);

      const sectionId = state.plan.sections[0]!.id;
      expect(state.focusRequest).toEqual({
        type: "add-lesson-button",
        sectionId,
      });

      expect(tester.getExec()).toHaveBeenCalledWith(
        expect.objectContaining({ type: "plan-changed" })
      );
      expect(tester.getExec()).toHaveBeenCalledWith({
        type: "focus-element",
        target: { type: "add-lesson-button", sectionId },
      });
    });

    it("7b. new-section-save-requested: calculates order correctly with existing sections", () => {
      const plan = createTestPlan({
        sections: [
          { id: "s1", title: "Section 1", order: 0, lessons: [] },
          { id: "s2", title: "Section 2", order: 2, lessons: [] },
        ],
      });
      const tester = new ReducerTester(
        planStateReducer,
        createInitialState(plan)
      );

      const state = tester
        .send({ type: "add-section-clicked" })
        .send({ type: "new-section-title-changed", value: "Section 3" })
        .send({ type: "new-section-save-requested" })
        .getState();

      expect(state.plan.sections).toHaveLength(3);
      expect(state.plan.sections[2]?.order).toBe(3); // max(0, 2) + 1
    });

    it("8. new-section-cancel-requested: exit add mode", () => {
      const tester = new ReducerTester(planStateReducer, createInitialState());

      const state = tester
        .send({ type: "add-section-clicked" })
        .send({ type: "new-section-title-changed", value: "New Section" })
        .send({ type: "new-section-cancel-requested" })
        .getState();

      expect(state.addingSection).toEqual({ active: false });
      expect(state.plan.sections).toHaveLength(0);
    });
  });

  describe("Edit Section (9-11)", () => {
    const planWithSection = createTestPlan({
      sections: [
        { id: "s1", title: "Existing Section", order: 0, lessons: [] },
      ],
    });

    it("9. section-title-clicked: enter edit mode with current title", () => {
      const tester = new ReducerTester(
        planStateReducer,
        createInitialState(planWithSection)
      );

      const state = tester
        .send({ type: "section-title-clicked", sectionId: "s1" })
        .getState();

      expect(state.editingSection).toEqual({
        sectionId: "s1",
        value: "Existing Section",
      });
    });

    it("10. section-save-requested: update section + emit plan-changed", () => {
      const tester = new ReducerTester(
        planStateReducer,
        createInitialState(planWithSection)
      );

      const state = tester
        .send({ type: "section-title-clicked", sectionId: "s1" })
        .resetExec()
        .send({ type: "section-title-changed", value: "Updated Section" })
        .send({ type: "section-save-requested" })
        .getState();

      expect(state.editingSection).toBeNull();
      expect(state.plan.sections[0]?.title).toBe("Updated Section");
      expect(tester.getExec()).toHaveBeenCalledWith(
        expect.objectContaining({ type: "plan-changed" })
      );
    });

    it("11. section-cancel-requested: exit edit mode", () => {
      const tester = new ReducerTester(
        planStateReducer,
        createInitialState(planWithSection)
      );

      const state = tester
        .send({ type: "section-title-clicked", sectionId: "s1" })
        .send({ type: "section-title-changed", value: "Changed" })
        .send({ type: "section-cancel-requested" })
        .getState();

      expect(state.editingSection).toBeNull();
      expect(state.plan.sections[0]?.title).toBe("Existing Section");
    });
  });

  describe("Delete Section (12)", () => {
    it("12a. section-delete-clicked: empty section deletes immediately + emit plan-changed", () => {
      const plan = createTestPlan({
        sections: [
          { id: "s1", title: "Section 1", order: 0, lessons: [] },
          { id: "s2", title: "Section 2", order: 1, lessons: [] },
        ],
      });
      const tester = new ReducerTester(
        planStateReducer,
        createInitialState(plan)
      );

      const state = tester
        .send({ type: "section-delete-clicked", sectionId: "s1" })
        .getState();

      expect(state.plan.sections).toHaveLength(1);
      expect(state.plan.sections[0]?.id).toBe("s2");
      expect(state.deletingSection).toBeNull();
      expect(tester.getExec()).toHaveBeenCalledWith(
        expect.objectContaining({ type: "plan-changed" })
      );
    });

    it("12b. section-delete-clicked: section with lessons shows confirmation modal", () => {
      const plan = createTestPlan({
        sections: [
          {
            id: "s1",
            title: "Section 1",
            order: 0,
            lessons: [
              { id: "l1", title: "Lesson 1", order: 0 },
              { id: "l2", title: "Lesson 2", order: 1 },
            ],
          },
          { id: "s2", title: "Section 2", order: 1, lessons: [] },
        ],
      });
      const tester = new ReducerTester(
        planStateReducer,
        createInitialState(plan)
      );

      const state = tester
        .send({ type: "section-delete-clicked", sectionId: "s1" })
        .getState();

      // Section not deleted yet
      expect(state.plan.sections).toHaveLength(2);
      // Modal is shown with section info
      expect(state.deletingSection).toEqual({
        sectionId: "s1",
        lessonCount: 2,
      });
      // No plan-changed yet
      expect(tester.getExec()).not.toHaveBeenCalled();
    });

    it("12c. section-delete-confirmed: deletes section + emits plan-changed + closes modal", () => {
      const plan = createTestPlan({
        sections: [
          {
            id: "s1",
            title: "Section 1",
            order: 0,
            lessons: [{ id: "l1", title: "Lesson 1", order: 0 }],
          },
          { id: "s2", title: "Section 2", order: 1, lessons: [] },
        ],
      });
      const tester = new ReducerTester(
        planStateReducer,
        createInitialState(plan)
      );

      const state = tester
        .send({ type: "section-delete-clicked", sectionId: "s1" })
        .resetExec()
        .send({ type: "section-delete-confirmed" })
        .getState();

      expect(state.plan.sections).toHaveLength(1);
      expect(state.plan.sections[0]?.id).toBe("s2");
      expect(state.deletingSection).toBeNull();
      expect(tester.getExec()).toHaveBeenCalledWith(
        expect.objectContaining({ type: "plan-changed" })
      );
    });

    it("12d. section-delete-cancelled: closes modal without deleting", () => {
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
        .send({ type: "section-delete-clicked", sectionId: "s1" })
        .send({ type: "section-delete-cancelled" })
        .getState();

      expect(state.plan.sections).toHaveLength(1);
      expect(state.deletingSection).toBeNull();
      expect(tester.getExec()).not.toHaveBeenCalled();
    });

    it("12e. section-delete-confirmed: does nothing if no pending deletion", () => {
      const plan = createTestPlan({
        sections: [{ id: "s1", title: "Section 1", order: 0, lessons: [] }],
      });
      const tester = new ReducerTester(
        planStateReducer,
        createInitialState(plan)
      );

      const state = tester
        .send({ type: "section-delete-confirmed" })
        .getState();

      expect(state.plan.sections).toHaveLength(1);
      expect(tester.getExec()).not.toHaveBeenCalled();
    });
  });
});
