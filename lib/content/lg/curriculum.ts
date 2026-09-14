import type { Level, Lesson, Unit } from "@/lib/types";
import { beginner } from "@/lib/content/lg/levels/beginner";
import { intermediate } from "@/lib/content/lg/levels/intermediate";
import { advanced } from "@/lib/content/lg/levels/advanced";
import { fluent } from "@/lib/content/lg/levels/fluent";

export const levels: Level[] = [beginner, intermediate, advanced, fluent];

export function unitsInOrder(): Unit[] {
  return levels.filter((l) => !l.comingSoon).flatMap((l) => l.units);
}

export function getUnit(unitId: string): Unit | undefined {
  return unitsInOrder().find((u) => u.id === unitId);
}

export function getNextUnit(unitId: string): Unit | undefined {
  const units = unitsInOrder();
  const idx = units.findIndex((u) => u.id === unitId);
  if (idx === -1) return undefined;
  return units[idx + 1];
}

export function getUnitForLesson(lessonId: string): Unit | undefined {
  return unitsInOrder().find((u) => u.lessons.some((l) => l.id === lessonId));
}

export function isUnitUnlocked(unitId: string, examsPassed: string[]): boolean {
  const units = unitsInOrder();
  const idx = units.findIndex((u) => u.id === unitId);
  if (idx <= 0) return true;
  return examsPassed.includes(units[idx - 1].id);
}

export function allLessons(): Lesson[] {
  return levels.flatMap((lvl) => lvl.units.flatMap((u) => u.lessons));
}

export function getLesson(id: string): Lesson | undefined {
  return allLessons().find((l) => l.id === id);
}

export function getLessonIndex(id: string): number {
  return allLessons().findIndex((l) => l.id === id);
}

export function getNextLesson(id: string): Lesson | undefined {
  const all = allLessons();
  const idx = all.findIndex((l) => l.id === id);
  if (idx === -1) return undefined;
  return all[idx + 1];
}

export function priorCheckpoint(lessonId: string): Lesson | null {
  const all = allLessons();
  const idx = all.findIndex((l) => l.id === lessonId);
  if (idx === -1) return null;
  for (let i = idx - 1; i >= 0; i--) {
    if (all[i].checkpoint) return all[i];
  }
  return null;
}

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
