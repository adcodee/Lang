import type { Level, Lesson } from "@/lib/types";
import { beginner } from "@/lib/content/levels/beginner";
import { intermediate } from "@/lib/content/levels/intermediate";
import { advanced } from "@/lib/content/levels/advanced";
import { fluent } from "@/lib/content/levels/fluent";

// The full curriculum, ordered from easiest to hardest.
export const levels: Level[] = [beginner, intermediate, advanced, fluent];

// Flat, ordered list of every lesson across all levels/units.
// Order defines progression: the first non-completed lesson is "current".
export function allLessons(): Lesson[] {
  return levels.flatMap((lvl) => lvl.units.flatMap((u) => u.lessons));
}

export function getLesson(id: string): Lesson | undefined {
  return allLessons().find((l) => l.id === id);
}

export function getLessonIndex(id: string): number {
  return allLessons().findIndex((l) => l.id === id);
}

// The next lesson in tree order, crossing unit/level boundaries.
export function getNextLesson(id: string): Lesson | undefined {
  const all = allLessons();
  const idx = all.findIndex((l) => l.id === id);
  if (idx === -1) return undefined;
  return all[idx + 1];
}
