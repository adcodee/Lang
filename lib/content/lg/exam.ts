import type { Exercise, SkillCategory } from "@/lib/types";
import { getUnit } from "@/lib/content/lg/curriculum";
import { exerciseSkill } from "@/lib/exercise";

const EXAM_LENGTH = 30;

export interface ExamItem {
  exercise: Exercise;
  skill: SkillCategory;
}

export interface Exam {
  unitId: string;
  title: string;
  items: ExamItem[];
}

export function buildExam(unitId: string): Exam | null {
  const unit = getUnit(unitId);
  if (!unit) return null;

  const pool: ExamItem[] = unit.lessons.flatMap((lesson) =>
    lesson.exercises.map((exercise) => ({
      exercise,
      skill: exerciseSkill(exercise, lesson.skill),
    }))
  );
  if (pool.length === 0) return null;

  const items = shuffle(pool).slice(0, EXAM_LENGTH);
  return { unitId, title: unit.title, items };
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
