import type { DrizzleDB } from "@/services/drizzle-service.server";
import { planLessons, plans, planSections } from "@/db/schema";
import {
  NotFoundError,
  UnknownDBServiceError,
} from "@/services/db-service-errors";
import { asc, desc, eq } from "drizzle-orm";
import { Effect } from "effect";

const makeDbCall = <T>(fn: () => Promise<T>) => {
  return Effect.tryPromise({
    try: fn,
    catch: (e) => new UnknownDBServiceError({ cause: e }),
  });
};

export const createPlanOperations = (db: DrizzleDB) => {
  const getPlans = Effect.fn("getPlans")(function* () {
    const allPlans = yield* makeDbCall(() =>
      db.query.plans.findMany({
        where: eq(plans.archived, false),
        orderBy: desc(plans.updatedAt),
        with: {
          sections: {
            orderBy: asc(planSections.order),
            with: {
              lessons: {
                orderBy: asc(planLessons.order),
              },
            },
          },
        },
      })
    );

    // Transform to match the Plan type expected by the frontend
    return allPlans.map((plan) => ({
      id: plan.id,
      title: plan.title,
      createdAt: plan.createdAt.toISOString(),
      updatedAt: plan.updatedAt.toISOString(),
      sections: plan.sections.map((section) => ({
        id: section.id,
        title: section.title,
        order: section.order,
        lessons: section.lessons.map((lesson) => ({
          id: lesson.id,
          title: lesson.title,
          order: lesson.order,
          description: lesson.description,
          icon: lesson.icon as "watch" | "code" | "discussion" | undefined,
          status: lesson.status as "todo" | "done" | "maybe" | undefined,
          priority: lesson.priority as 1 | 2 | 3 | undefined,
          dependencies: lesson.dependencies ?? undefined,
        })),
      })),
    }));
  });

  /**
   * Sync a single plan - deletes the existing plan with given ID and inserts the new one.
   * This is a simple "last write wins" approach for single-user app.
   */
  const syncPlan = Effect.fn("syncPlan")(function* (plan: {
    readonly id: string;
    readonly title: string;
    readonly createdAt: string;
    readonly updatedAt: string;
    readonly sections: readonly {
      readonly id: string;
      readonly title: string;
      readonly order: number;
      readonly lessons: readonly {
        readonly id: string;
        readonly title: string;
        readonly order: number;
        readonly description?: string;
        readonly icon?: "watch" | "code" | "discussion" | null;
        readonly status?: "todo" | "done" | "maybe" | null;
        readonly priority?: 1 | 2 | 3 | null;
        readonly dependencies?: readonly string[];
      }[];
    }[];
  }) {
    // Delete the existing plan with this ID (cascades to sections and lessons)
    yield* makeDbCall(() => db.delete(plans).where(eq(plans.id, plan.id)));

    // Insert the plan
    yield* makeDbCall(() =>
      db.insert(plans).values({
        id: plan.id,
        title: plan.title,
        createdAt: new Date(plan.createdAt),
        updatedAt: new Date(plan.updatedAt),
      })
    );

    // Insert sections for this plan
    for (const section of plan.sections) {
      yield* makeDbCall(() =>
        db.insert(planSections).values({
          id: section.id,
          planId: plan.id,
          title: section.title,
          order: section.order,
        })
      );

      // Insert lessons for this section
      if (section.lessons.length > 0) {
        yield* makeDbCall(() =>
          db.insert(planLessons).values(
            section.lessons.map((lesson) => ({
              id: lesson.id,
              sectionId: section.id,
              title: lesson.title,
              order: lesson.order,
              description: lesson.description,
              icon: lesson.icon ?? null,
              status: lesson.status ?? "todo",
              priority: lesson.priority ?? 2,
              dependencies: lesson.dependencies
                ? [...lesson.dependencies]
                : null,
            }))
          )
        );
      }
    }

    return { success: true };
  });

  /**
   * Delete a plan by ID. Sections and lessons are cascade deleted.
   */
  const deletePlan = Effect.fn("deletePlan")(function* (planId: string) {
    yield* makeDbCall(() => db.delete(plans).where(eq(plans.id, planId)));
    return { success: true };
  });

  /**
   * Rename a plan by ID.
   */
  const renamePlan = Effect.fn("renamePlan")(function* (
    planId: string,
    newTitle: string
  ) {
    yield* makeDbCall(() =>
      db
        .update(plans)
        .set({ title: newTitle, updatedAt: new Date() })
        .where(eq(plans.id, planId))
    );
    return { success: true };
  });

  const getArchivedPlans = Effect.fn("getArchivedPlans")(function* () {
    const archivedPlansList = yield* makeDbCall(() =>
      db.query.plans.findMany({
        where: eq(plans.archived, true),
        orderBy: desc(plans.updatedAt),
        with: {
          sections: {
            orderBy: asc(planSections.order),
            with: {
              lessons: {
                orderBy: asc(planLessons.order),
              },
            },
          },
        },
      })
    );

    return archivedPlansList.map((plan) => ({
      id: plan.id,
      title: plan.title,
      createdAt: plan.createdAt.toISOString(),
      updatedAt: plan.updatedAt.toISOString(),
      sections: plan.sections.map((section) => ({
        id: section.id,
        title: section.title,
        order: section.order,
        lessons: section.lessons.map((lesson) => ({
          id: lesson.id,
          title: lesson.title,
          order: lesson.order,
          description: lesson.description,
          icon: lesson.icon as "watch" | "code" | "discussion" | undefined,
          status: lesson.status as "todo" | "done" | "maybe" | undefined,
          priority: lesson.priority as 1 | 2 | 3 | undefined,
          dependencies: lesson.dependencies ?? undefined,
        })),
      })),
    }));
  });

  const updatePlanArchiveStatus = Effect.fn("updatePlanArchiveStatus")(
    function* (opts: { planId: string; archived: boolean }) {
      const { planId, archived } = opts;
      const [updated] = yield* makeDbCall(() =>
        db
          .update(plans)
          .set({ archived })
          .where(eq(plans.id, planId))
          .returning()
      );

      if (!updated) {
        return yield* new NotFoundError({
          type: "updatePlanArchiveStatus",
          params: { planId },
        });
      }

      return updated;
    }
  );

  return {
    getPlans,
    syncPlan,
    deletePlan,
    renamePlan,
    getArchivedPlans,
    updatePlanArchiveStatus,
  };
};
