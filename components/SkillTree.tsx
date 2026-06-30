"use client";

import { useEffect, useMemo, useState } from "react";
import { Lock } from "lucide-react";
import { levels } from "@/lib/content/curriculum";
import { useGameStore } from "@/lib/store/gameStore";
import LessonNode, { NodeStatus } from "@/components/LessonNode";
import ExamNode, { ExamStatus } from "@/components/ExamNode";
import type { Unit } from "@/lib/types";

// Gentle zig-zag pattern for the path of nodes within a unit.
const OFFSETS = [0, 1, 0, -1, 0, 1, 0, -1];

export default function SkillTree() {
  const completed = useGameStore((s) => s.completedLessons);
  const examsPassed = useGameStore((s) => s.examsPassed);
  const [mounted, setMounted] = useState(false);
  // Default to the first level that has authored content.
  const [activeLevelId, setActiveLevelId] = useState(levels[0].id);
  useEffect(() => setMounted(true), []);

  // Before hydration, treat nothing as completed — matches initial store.
  const completedSet = useMemo(
    () => new Set(mounted ? completed : []),
    [mounted, completed]
  );
  const examsPassedSet = useMemo(
    () => new Set(mounted ? examsPassed : []),
    [mounted, examsPassed]
  );

  const activeLevel = levels.find((l) => l.id === activeLevelId) ?? levels[0];
  const units = activeLevel.units;

  // A unit is unlocked if it's first, or the previous unit's exam is passed.
  function unitUnlocked(index: number): boolean {
    return index === 0 || examsPassedSet.has(units[index - 1].id);
  }
  function unitDone(unit: Unit): boolean {
    return unit.lessons.every((l) => completedSet.has(l.id));
  }

  // The single "current" lesson: first incomplete lesson in the first unlocked
  // unit that still has lesson work. If a unit's lessons are all done but its
  // exam isn't passed, the exam is the frontier (no lesson is current).
  const currentId = useMemo(() => {
    for (let i = 0; i < units.length; i++) {
      if (!unitUnlocked(i)) break;
      const next = units[i].lessons.find((l) => !completedSet.has(l.id));
      if (next) return next.id;
      if (!examsPassedSet.has(units[i].id)) break; // frontier is the exam
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [units, completedSet, examsPassedSet]);

  function statusFor(unitIndex: number, id: string): NodeStatus {
    if (!unitUnlocked(unitIndex)) return "locked";
    if (completedSet.has(id)) return "completed";
    if (id === currentId) return "current";
    return "locked";
  }

  function examStatusFor(unit: Unit, unitIndex: number): ExamStatus {
    if (examsPassedSet.has(unit.id)) return "passed";
    if (unitUnlocked(unitIndex) && unitDone(unit)) return "available";
    return "locked";
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Level selector */}
      <div className="flex flex-wrap justify-center gap-2">
        {levels.map((lvl) => {
          const isActive = lvl.id === activeLevelId;
          return (
            <button
              key={lvl.id}
              onClick={() => setActiveLevelId(lvl.id)}
              className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-extrabold transition ${
                isActive
                  ? "bg-brand text-white shadow-[0_3px_0_#46a302]"
                  : "bg-white text-muted shadow-card hover:text-ink"
              }`}
            >
              {lvl.comingSoon && <Lock className="h-3.5 w-3.5" />}
              {lvl.title}
            </button>
          );
        })}
      </div>

      {/* Active level */}
      <div className="text-center">
        <h2 className="text-xl font-extrabold text-ink">{activeLevel.title}</h2>
        <p className="text-sm text-muted">{activeLevel.blurb}</p>
      </div>

      {activeLevel.comingSoon || activeLevel.units.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 py-12 text-center">
          <Lock className="h-8 w-8 text-muted" />
          <p className="font-bold text-ink">Coming soon</p>
          <p className="max-w-xs text-sm text-muted">
            Finish {levels[0].title} to be ready for this — new units are on the
            way.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-12">
          {units.map((unit, unitIndex) => (
            <section key={unit.id} className="flex flex-col gap-6">
              <div className="text-center">
                <div className="text-xs font-extrabold uppercase tracking-widest text-brand-dark">
                  {unit.title}
                </div>
                <div className="text-sm text-muted">{unit.subtitle}</div>
              </div>
              <div className="flex flex-col items-center gap-10">
                {unit.lessons.map((lesson, i) => (
                  <LessonNode
                    key={lesson.id}
                    lesson={lesson}
                    status={statusFor(unitIndex, lesson.id)}
                    offset={OFFSETS[i % OFFSETS.length]}
                  />
                ))}
                <ExamNode
                  unit={unit}
                  status={examStatusFor(unit, unitIndex)}
                />
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
