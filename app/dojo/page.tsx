"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Sword, Target, RotateCcw, Lock } from "lucide-react";
import {
  dojoDrills,
  getDrillForSkill,
  isDrillUnlocked,
  unlockLessonTitle,
  dueReviewCards,
} from "@/lib/content/dojo";
import { useGameStore } from "@/lib/store/gameStore";
import { kanaRowProgress } from "@/lib/content/kana";
import { SKILL_BADGE } from "@/components/LessonNode";
import type { SkillCategory } from "@/lib/types";

const SKILLS: SkillCategory[] = [
  "speaking",
  "writing",
  "listening",
  "punctuation",
];

export default function DojoPage() {
  const skillStats = useGameStore((s) => s.skillStats);
  const revisionSkills = useGameStore((s) => s.revisionSkills);
  const revisionCount = useGameStore((s) => s.revisionItems.length);
  const completed = useGameStore((s) => s.completedLessons);
  const seen = useGameStore((s) => s.seen);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const dueCount = mounted ? dueReviewCards(completed, seen).length : 0;
  const reviewCount = revisionCount + dueCount;

  // Weakness = skill with the most flagged items, else lowest accuracy.
  const weakest = mounted ? weakestSkill(skillStats, revisionSkills) : null;
  const weaknessDrill =
    mounted && weakest ? getDrillForSkill(weakest, completed) : null;

  return (
    <div className="flex flex-col gap-6">
      <header className="dojo-header rounded-2xl p-6 text-center text-white">
        <div className="flex items-center justify-center gap-2">
          <Sword className="h-6 w-6" />
          <h1 className="text-2xl font-extrabold">Training Grounds</h1>
        </div>
        <p className="mt-1 text-sm text-white/80">
          Free-play drills — grind any skill, no hearts at stake.
        </p>
      </header>

      {mounted && reviewCount > 0 && (
        <Link
          href="/dojo/review"
          className="flex items-center justify-between rounded-2xl border-2 border-torii bg-torii/10 p-4"
        >
          <div className="flex items-center gap-3">
            <RotateCcw className="h-6 w-6 text-torii" />
            <div>
              <div className="font-extrabold text-ink">Review</div>
              <div className="text-sm text-muted">
                {reviewCount} item{reviewCount === 1 ? "" : "s"} due
                {dueCount > 0 && revisionCount > 0
                  ? " (spaced + mistakes)"
                  : dueCount > 0
                  ? " for spaced repetition"
                  : " flagged from mistakes"}
              </div>
            </div>
          </div>
          <span className="text-sm font-bold text-torii">Go →</span>
        </Link>
      )}

      {weaknessDrill && (
        <Link
          href={`/dojo/${weaknessDrill.id}`}
          className="flex items-center justify-between rounded-2xl border-2 border-gold bg-gold/10 p-4"
        >
          <div className="flex items-center gap-3">
            <Target className="h-6 w-6 text-gold" />
            <div>
              <div className="font-extrabold text-ink">Train your weakness</div>
              <div className="text-sm text-muted">
                {SKILL_BADGE[weakest!].icon} {SKILL_BADGE[weakest!].label} —{" "}
                {weaknessDrill.title}
              </div>
            </div>
          </div>
          <span className="text-sm font-bold text-brand-dark">Go →</span>
        </Link>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {dojoDrills.map((drill) => {
          const unlocked = !mounted || isDrillUnlocked(drill, completed);
          if (!unlocked) {
            return (
              <div
                key={drill.id}
                className="card flex items-center gap-3 p-4 opacity-60"
              >
                <span className="text-3xl grayscale">{drill.icon}</span>
                <div>
                  <div className="flex items-center gap-1 font-extrabold text-ink">
                    <Lock className="h-3.5 w-3.5 text-muted" /> {drill.title}
                  </div>
                  <div className="text-sm text-muted">
                    Complete “{unlockLessonTitle(drill)}” to unlock
                  </div>
                </div>
              </div>
            );
          }
          // The Vowel Sort drill grows with progress — show how many rows are in.
          const subtitle =
            drill.kind === "vowel-sort" && mounted
              ? `${kanaRowProgress(completed).unlocked}/${
                  kanaRowProgress(completed).total
                } rows unlocked`
              : drill.subtitle;
          return (
            <Link
              key={drill.id}
              href={`/dojo/${drill.id}`}
              className="card flex items-center gap-3 p-4 transition hover:border-sky"
            >
              <span className="text-3xl">{drill.icon}</span>
              <div>
                <div className="font-extrabold text-ink">{drill.title}</div>
                <div className="text-sm text-muted">{subtitle}</div>
                <div className="mt-1 text-[11px] font-bold uppercase tracking-wide text-muted">
                  {SKILL_BADGE[drill.skill].icon} {SKILL_BADGE[drill.skill].label}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function weakestSkill(
  stats: ReturnType<typeof useGameStore.getState>["skillStats"],
  revision: Record<SkillCategory, number>
): SkillCategory {
  // Priority 1: the skill with the most items flagged for revision.
  const mostFlagged = Math.max(...SKILLS.map((s) => revision[s]));
  if (mostFlagged > 0) {
    return SKILLS.reduce((a, b) => (revision[b] > revision[a] ? b : a));
  }
  // Priority 2: lowest first-try accuracy (untouched skills count as weakest).
  let worst: SkillCategory = SKILLS[0];
  let worstAcc = Infinity;
  for (const skill of SKILLS) {
    const s = stats[skill];
    const acc = s.total === 0 ? 0 : s.correct / s.total;
    if (acc < worstAcc) {
      worstAcc = acc;
      worst = skill;
    }
  }
  return worst;
}
