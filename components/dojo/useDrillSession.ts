"use client";

import { useState } from "react";
import { useGameStore } from "@/lib/store/gameStore";
import type { SkillCategory } from "@/lib/types";

const XP_PER_CORRECT = 2;

export interface DrillSession {
  count: number; // items attempted
  correct: number;
  streak: number;
  bestStreak: number;
  record: (isCorrect: boolean) => void;
  reset: () => void;
}

// Shared scoring/streak state for endless Dojo drills. Each answer also feeds
// the Rank skill stats via recordAnswer, so grinding improves the dashboard.
export function useDrillSession(skill: SkillCategory): DrillSession {
  const recordAnswer = useGameStore((s) => s.recordAnswer);
  const registerActivity = useGameStore((s) => s.registerActivity);
  const [count, setCount] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);

  function record(isCorrect: boolean) {
    recordAnswer(skill, isCorrect, isCorrect ? XP_PER_CORRECT : 0);
    // Drilling is real practice — keep the daily streak alive (idempotent:
    // registerActivity returns early once today is already counted).
    registerActivity();
    setCount((c) => c + 1);
    if (isCorrect) {
      setCorrect((c) => c + 1);
      setStreak((s) => {
        const next = s + 1;
        setBestStreak((b) => Math.max(b, next));
        return next;
      });
    } else {
      setStreak(0);
    }
  }

  function reset() {
    setCount(0);
    setCorrect(0);
    setStreak(0);
    setBestStreak(0);
  }

  return { count, correct, streak, bestStreak, record, reset };
}
