"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { GameState, SkillCategory, SkillStats } from "@/lib/types";

const MAX_HEARTS = 5;

function emptySkillStats(): SkillStats {
  return {
    speaking: { correct: 0, total: 0, xp: 0 },
    writing: { correct: 0, total: 0, xp: 0 },
    listening: { correct: 0, total: 0, xp: 0 },
    punctuation: { correct: 0, total: 0, xp: 0 },
  };
}

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
  recordAnswer: (skill: SkillCategory, correct: boolean, xp: number) => void;
  flagRevision: (skill: SkillCategory, itemId: string) => void;
  clearRevision: () => void;
  loseHeart: () => void;
  refillHearts: () => void;
  completeLesson: (lessonId: string, bonusXp: number) => void;
  markLearned: (lessonId: string) => void;
  revokeLearned: (lessonId: string) => void;
  passExam: (unitId: string, bonusXp: number) => void;
  registerActivity: () => void;
  reset: () => void;
}

function emptyRevisionSkills(): Record<SkillCategory, number> {
  return { speaking: 0, writing: 0, listening: 0, punctuation: 0 };
}

const initialState: GameState = {
  xp: 0,
  streak: 0,
  lastActiveDay: null,
  hearts: MAX_HEARTS,
  completedLessons: [],
  learnedLessons: [],
  skillStats: emptySkillStats(),
  revisionItems: [],
  revisionSkills: emptyRevisionSkills(),
  examsPassed: [],
};

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      ...initialState,
      maxHearts: MAX_HEARTS,

      addXp: (amount) => set((s) => ({ xp: s.xp + amount })),

      // Record a single exercise answer against its skill (and global XP).
      recordAnswer: (skill, correct, xp) =>
        set((s) => {
          const prev = s.skillStats[skill];
          return {
            xp: s.xp + xp,
            skillStats: {
              ...s.skillStats,
              [skill]: {
                correct: prev.correct + (correct ? 1 : 0),
                total: prev.total + 1,
                xp: prev.xp + xp,
              },
            },
          };
        }),

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

      // Flag an item (and its skill) for revision; ignore duplicates.
      flagRevision: (skill, itemId) =>
        set((s) => {
          if (s.revisionItems.includes(itemId)) return s;
          return {
            revisionItems: [...s.revisionItems, itemId],
            revisionSkills: {
              ...s.revisionSkills,
              [skill]: s.revisionSkills[skill] + 1,
            },
          };
        }),

      // Clear all flagged items (after a Review session).
      clearRevision: () =>
        set({ revisionItems: [], revisionSkills: emptyRevisionSkills() }),

      completeLesson: (lessonId, bonusXp) =>
        set((s) => ({
          xp: s.xp + bonusXp,
          completedLessons: s.completedLessons.includes(lessonId)
            ? s.completedLessons
            : [...s.completedLessons, lessonId],
        })),

      // Mark a lesson's Learn part done (unlocks its Test part).
      markLearned: (lessonId) =>
        set((s) => ({
          learnedLessons: s.learnedLessons.includes(lessonId)
            ? s.learnedLessons
            : [...s.learnedLessons, lessonId],
        })),

      // Failing the Test re-locks it: the Learn part must be redone.
      revokeLearned: (lessonId) =>
        set((s) => ({
          learnedLessons: s.learnedLessons.filter((id) => id !== lessonId),
        })),

      // Pass a unit's exam: award bonus XP and record the belt (opens the gate).
      passExam: (unitId, bonusXp) =>
        set((s) => ({
          xp: s.xp + bonusXp,
          examsPassed: s.examsPassed.includes(unitId)
            ? s.examsPassed
            : [...s.examsPassed, unitId],
        })),

      reset: () =>
        set({
          ...initialState,
          skillStats: emptySkillStats(),
          revisionSkills: emptyRevisionSkills(),
        }),
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
        learnedLessons: s.learnedLessons,
        skillStats: s.skillStats,
        revisionItems: s.revisionItems,
        revisionSkills: s.revisionSkills,
        examsPassed: s.examsPassed,
      }),
    }
  )
);
