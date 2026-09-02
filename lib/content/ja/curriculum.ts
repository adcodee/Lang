import type { Level, Lesson, Unit } from "@/lib/types";
import { beginner } from "@/lib/content/ja/levels/beginner";
import { intermediate } from "@/lib/content/ja/levels/intermediate";
import { advanced } from "@/lib/content/ja/levels/advanced";
import { fluent } from "@/lib/content/ja/levels/fluent";

// The full curriculum, ordered from easiest to hardest.
export const levels: Level[] = [beginner, intermediate, advanced, fluent];

// All units that have authored content, in progression order. Drives the
// end-of-unit exam gating.
export function unitsInOrder(): Unit[] {
  return levels.filter((l) => !l.comingSoon).flatMap((l) => l.units);
}

export function getUnit(unitId: string): Unit | undefined {
  return unitsInOrder().find((u) => u.id === unitId);
}

// The unit that follows a given one in progression order (gated by its exam).
export function getNextUnit(unitId: string): Unit | undefined {
  const units = unitsInOrder();
  const idx = units.findIndex((u) => u.id === unitId);
  if (idx === -1) return undefined;
  return units[idx + 1];
}

export function getUnitForLesson(lessonId: string): Unit | undefined {
  return unitsInOrder().find((u) =>
    u.lessons.some((l) => l.id === lessonId)
  );
}

// A unit is unlocked if it's first in order, or the previous unit's exam passed.
export function isUnitUnlocked(unitId: string, examsPassed: string[]): boolean {
  const units = unitsInOrder();
  const idx = units.findIndex((u) => u.id === unitId);
  if (idx <= 0) return true; // first unit (or unknown) is open
  return examsPassed.includes(units[idx - 1].id);
}

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

// Patch 1.2.2 (checkpoint lives): the most recent checkpoint strictly
// before `lessonId`, or null if none has been passed yet (the span runs
// back to the start of the course). Walks the global lesson order, not
// per-unit lists — checkpoint spans already cross unit boundaries in the
// real curriculum (e.g. u1b-checkpoint's span runs into u2-greetings-core).
export function priorCheckpoint(lessonId: string): Lesson | null {
  const all = allLessons();
  const idx = all.findIndex((l) => l.id === lessonId);
  if (idx === -1) return null;
  for (let i = idx - 1; i >= 0; i--) {
    if (all[i].checkpoint) return all[i];
  }
  return null;
}

// Every lesson from (exclusive) the most recent checkpoint before
// `lessonId` through `lessonId` itself (inclusive) — the span reset when
// the checkpoint-lives pool hits zero. If `lessonId` is itself an
// unpassed checkpoint, it's included (it still needs to be cleared).
export function lessonsSincePriorCheckpoint(lessonId: string): string[] {
  const all = allLessons();
  const idx = all.findIndex((l) => l.id === lessonId);
  if (idx === -1) return [];
  const span: string[] = [all[idx].id];
  for (let i = idx - 1; i >= 0; i--) {
    if (all[i].checkpoint) break;
    span.unshift(all[i].id);
  }
  return span;
}
