"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { GameState } from "@/lib/types";

const MAX_HEARTS = 5;

function todayKey(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function dayDiff(a: string, b: string): number {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.round(ms / 86_400_000);
}

interface GameStore extends GameState {
  maxHearts: number;
  addXp: (amount: number) => void;
  loseHeart: () => void;
  refillHearts: () => void;
  completeLesson: (lessonId: string, bonusXp: number) => void;
  registerActivity: () => void;
  reset: () => void;
}

const initialState: GameState = {
  xp: 0,
  streak: 0,
  lastActiveDay: null,
  hearts: MAX_HEARTS,
  completedLessons: [],
};

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      ...initialState,
      maxHearts: MAX_HEARTS,

      addXp: (amount) => set((s) => ({ xp: s.xp + amount })),

      loseHeart: () => set((s) => ({ hearts: Math.max(0, s.hearts - 1) })),

      refillHearts: () => set({ hearts: MAX_HEARTS }),

      // Update the daily streak based on the last active day.
      registerActivity: () => {
        const today = todayKey();
        const { lastActiveDay, streak } = get();
        if (lastActiveDay === today) return; // already counted today
        let nextStreak = 1;
        if (lastActiveDay) {
          const diff = dayDiff(lastActiveDay, today);
          if (diff === 1) nextStreak = streak + 1; // consecutive day
          else if (diff <= 0) nextStreak = streak || 1; // clock weirdness
          // diff > 1 → streak resets to 1
        }
        set({ streak: nextStreak, lastActiveDay: today });
      },

      completeLesson: (lessonId, bonusXp) =>
        set((s) => ({
          xp: s.xp + bonusXp,
          completedLessons: s.completedLessons.includes(lessonId)
            ? s.completedLessons
            : [...s.completedLessons, lessonId],
        })),

      reset: () => set({ ...initialState }),
    }),
    {
      name: "lang-game-state",
      // Only persist the serializable game fields.
      partialize: (s) => ({
        xp: s.xp,
        streak: s.streak,
        lastActiveDay: s.lastActiveDay,
        hearts: s.hearts,
        completedLessons: s.completedLessons,
      }),
    }
  )
);
