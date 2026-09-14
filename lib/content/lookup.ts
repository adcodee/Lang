import type { LanguageId } from "@/lib/languages";
import type { Level, Lesson, Unit } from "@/lib/types";
import * as ja from "@/lib/content/ja/curriculum";
import * as lg from "@/lib/content/lg/curriculum";
import { buildExam as buildJaExam } from "@/lib/content/ja/exam";
import { buildExam as buildLgExam } from "@/lib/content/lg/exam";

function pack(id: LanguageId) {
  return id === "lg" ? lg : ja;
}

export function levelsFor(id: LanguageId): Level[] {
  return pack(id).levels;
}

export function unitsInOrder(id: LanguageId): Unit[] {
  return pack(id).unitsInOrder();
}

export function allLessons(id?: LanguageId): Lesson[] {
  if (id) return pack(id).allLessons();
  return [...ja.allLessons(), ...lg.allLessons()];
}

export function getLesson(lessonId: string): Lesson | undefined {
  return ja.getLesson(lessonId) ?? lg.getLesson(lessonId);
}

export function getUnit(unitId: string): Unit | undefined {
  return ja.getUnit(unitId) ?? lg.getUnit(unitId);
}

export function getUnitForLesson(lessonId: string): Unit | undefined {
  return ja.getUnitForLesson(lessonId) ?? lg.getUnitForLesson(lessonId);
}

export function getNextUnit(unitId: string): Unit | undefined {
  return ja.getNextUnit(unitId) ?? lg.getNextUnit(unitId);
}

export function isUnitUnlocked(unitId: string, examsPassed: string[]): boolean {
  if (ja.getUnit(unitId)) return ja.isUnitUnlocked(unitId, examsPassed);
  if (lg.getUnit(unitId)) return lg.isUnitUnlocked(unitId, examsPassed);
  return true;
}

export function priorCheckpoint(lessonId: string): Lesson | null {
  if (ja.getLesson(lessonId)) return ja.priorCheckpoint(lessonId);
  if (lg.getLesson(lessonId)) return lg.priorCheckpoint(lessonId);
  return null;
}

export function lessonsSincePriorCheckpoint(lessonId: string): string[] {
  if (ja.getLesson(lessonId)) return ja.lessonsSincePriorCheckpoint(lessonId);
  if (lg.getLesson(lessonId)) return lg.lessonsSincePriorCheckpoint(lessonId);
  return [];
}

export function buildExamFor(unitId: string) {
  return buildJaExam(unitId) ?? buildLgExam(unitId);
}
