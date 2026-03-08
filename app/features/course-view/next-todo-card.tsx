import { type DependencyLessonItem } from "@/components/dependency-selector";
import { courseViewReducer } from "@/features/course-view/course-view-reducer";
import { SortableLessonItem } from "./sortable-lesson-item";
import type { LoaderData, Section, Lesson } from "./course-view-types";
import { DndContext } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useNavigate, useFetcher } from "react-router";

function isTodoLesson(lesson: Lesson): boolean {
  if ((lesson.fsStatus ?? "real") !== "real") return false;
  if (lesson.videos.length === 0) return true;
  if (lesson.videos.every((v) => v.clips.length > 1)) return false;
  return lesson.videos.some((v) => v.clips.length === 0);
}

export function NextTodoCard({
  sections,
  data,
  navigate,
  addVideoToLessonId,
  editLessonId,
  convertToGhostLessonId,
  dispatch,
  startExportUpload,
  revealVideoFetcher,
  deleteVideoFileFetcher,
  deleteVideoFetcher,
  deleteLessonFetcher,
  allFlatLessons,
  dependencyMap,
}: {
  sections: Section[];
  data: LoaderData;
  navigate: ReturnType<typeof useNavigate>;
  addVideoToLessonId: string | null;
  editLessonId: string | null;
  convertToGhostLessonId: string | null;
  dispatch: (action: courseViewReducer.Action) => void;
  startExportUpload: (videoId: string, path: string) => void;
  revealVideoFetcher: ReturnType<typeof useFetcher>;
  deleteVideoFileFetcher: ReturnType<typeof useFetcher>;
  deleteVideoFetcher: ReturnType<typeof useFetcher>;
  deleteLessonFetcher: ReturnType<typeof useFetcher>;
  allFlatLessons: DependencyLessonItem[];
  dependencyMap: Record<string, string[]>;
}) {
  // Find highest priority todo lesson across all sections
  let bestLesson: Lesson | null = null;
  let bestSection: Section | null = null;
  let bestPriority = Infinity;

  for (const section of sections) {
    for (const lesson of section.lessons) {
      if (!isTodoLesson(lesson)) continue;
      const priority = lesson.priority ?? 2;
      if (priority < bestPriority) {
        bestPriority = priority;
        bestLesson = lesson;
        bestSection = section;
      }
    }
  }

  if (!bestLesson || !bestSection) return null;

  return (
    <div className="mb-6">
      <h3 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
        Next Up
      </h3>
      <div className="rounded-lg border bg-card">
        <div className="px-4 py-3 border-b bg-muted/30">
          <h2 className="font-medium text-sm">{bestSection.path}</h2>
        </div>
        <div className="p-2">
          <DndContext>
            <SortableContext
              items={[bestLesson.id]}
              strategy={verticalListSortingStrategy}
            >
              <SortableLessonItem
                lesson={bestLesson}
                lessonIndex={0}
                section={bestSection}
                data={data}
                navigate={navigate}
                addVideoToLessonId={addVideoToLessonId}
                editLessonId={editLessonId}
                convertToGhostLessonId={convertToGhostLessonId}
                dispatch={dispatch}
                startExportUpload={startExportUpload}
                revealVideoFetcher={revealVideoFetcher}
                deleteVideoFileFetcher={deleteVideoFileFetcher}
                deleteVideoFetcher={deleteVideoFetcher}
                deleteLessonFetcher={deleteLessonFetcher}
                allFlatLessons={allFlatLessons}
                dependencyMap={dependencyMap}
              />
            </SortableContext>
          </DndContext>
        </div>
      </div>
    </div>
  );
}
