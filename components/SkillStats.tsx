"use client";

import { useEffect, useState } from "react";
import { useGameStore } from "@/lib/store/gameStore";
import { SKILL_BADGE } from "@/components/LessonNode";
import type { SkillCategory } from "@/lib/types";

const SKILLS: SkillCategory[] = [
  "speaking",
  "writing",
  "listening",
  "punctuation",
];

const BAR_COLOR: Record<SkillCategory, string> = {
  speaking: "bg-brand",
  writing: "bg-sky",
  listening: "bg-gold",
  punctuation: "bg-purple-500",
};

export default function SkillStats() {
  const skillStats = useGameStore((s) => s.skillStats);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Weakest practised skill becomes the "focus area"; default to first.
  let focus: SkillCategory = SKILLS[0];
  let focusAcc = Infinity;
  for (const skill of SKILLS) {
    const s = skillStats[skill];
    const acc = s.total === 0 ? 0 : s.correct / s.total;
    if (acc < focusAcc) {
      focusAcc = acc;
      focus = skill;
    }
  }

  return (
    <div className="card p-5">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-lg font-extrabold text-ink">Skill breakdown</h2>
        {mounted && (
          <span className="text-xs font-bold text-muted">
            Focus: {SKILL_BADGE[focus].icon} {SKILL_BADGE[focus].label}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-3">
        {SKILLS.map((skill) => {
          const s = skillStats[skill];
          const acc =
            mounted && s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
          return (
            <div key={skill}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-bold text-ink">
                  {SKILL_BADGE[skill].icon} {SKILL_BADGE[skill].label}
                </span>
                <span className="tabular-nums text-muted">
                  {mounted ? `${s.correct}/${s.total}` : "0/0"} · {acc}%
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-gray-200">
                <div
                  className={`h-full rounded-full ${BAR_COLOR[skill]}`}
                  style={{ width: `${acc}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
