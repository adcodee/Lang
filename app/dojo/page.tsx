"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Sword, Target } from "lucide-react";
import { dojoDrills, getDrillForSkill } from "@/lib/content/dojo";
import { useGameStore } from "@/lib/store/gameStore";
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
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Weakest skill = lowest accuracy (untouched skills count as weakest).
  const weakest = mounted ? weakestSkill(skillStats) : null;
  const weaknessDrill = weakest ? getDrillForSkill(weakest) : null;

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
        {dojoDrills.map((drill) => (
          <Link
            key={drill.id}
            href={`/dojo/${drill.id}`}
            className="card flex items-center gap-3 p-4 transition hover:border-sky"
          >
            <span className="text-3xl">{drill.icon}</span>
            <div>
              <div className="font-extrabold text-ink">{drill.title}</div>
              <div className="text-sm text-muted">{drill.subtitle}</div>
              <div className="mt-1 text-[11px] font-bold uppercase tracking-wide text-muted">
                {SKILL_BADGE[drill.skill].icon} {SKILL_BADGE[drill.skill].label}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function weakestSkill(
  stats: ReturnType<typeof useGameStore.getState>["skillStats"]
): SkillCategory {
  let worst: SkillCategory = SKILLS[0];
  let worstAcc = Infinity;
  for (const skill of SKILLS) {
    const s = stats[skill];
    // Untouched skills (total 0) are treated as the weakest (accuracy 0).
    const acc = s.total === 0 ? 0 : s.correct / s.total;
    if (acc < worstAcc) {
      worstAcc = acc;
      worst = skill;
    }
  }
  return worst;
}
