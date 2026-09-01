"use client";

import { useMemo } from "react";
import { unitsInOrder } from "@/lib/content/ja/curriculum";
import { useGameStore } from "@/lib/store/gameStore";
import type { Lesson } from "@/lib/types";

export interface CurrentLesson {
  currentKey: string;
  lessonId: string;
  href: string;
  lesson: Lesson;
}

// Returns the next unfinished lesson (and its URL) for the current user, or
// null if the full curriculum is complete.
export function useCurrentLesson(): CurrentLesson | null {
  const completed = useGameStore((s) => s.completedLessons);
  const learned = useGameStore((s) => s.learnedLessons);
  const examsPassed = useGameStore((s) => s.examsPassed);

  return useMemo(() => {
    const units = unitsInOrder();
    const completedSet = new Set(completed);
    const learnedSet = new Set(learned);
    const examsPassedSet = new Set(examsPassed);

    const hasTeach = (l: Lesson) => Boolean(l.teach?.length);

    for (let i = 0; i < units.length; i++) {
      const unitUnlocked =
        i === 0 || examsPassedSet.has(units[i - 1].id);
      if (!unitUnlocked) break;

      for (const l of units[i].lessons) {
        if (hasTeach(l) && !learnedSet.has(l.id)) {
          return {
            currentKey: `${l.id}:learn`,
            lessonId: l.id,
            href: `/lesson/${l.id}?part=learn`,
            lesson: l,
          };
        }
        if (!completedSet.has(l.id)) {
          return {
            currentKey: `${l.id}:test`,
            lessonId: l.id,
            href: `/lesson/${l.id}`,
            lesson: l,
          };
        }
      }

      if (!examsPassedSet.has(units[i].id)) break;
    }

    return null;
  }, [completed, learned, examsPassed]);
}
