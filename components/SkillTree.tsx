"use client";

import { useEffect, useMemo, useState } from "react";
import { Lock } from "lucide-react";
import { levels, allLessons } from "@/lib/content/curriculum";
import { useGameStore } from "@/lib/store/gameStore";
import LessonNode, { NodeStatus } from "@/components/LessonNode";

// Gentle zig-zag pattern for the path of nodes within a unit.
const OFFSETS = [0, 1, 0, -1, 0, 1, 0, -1];

export default function SkillTree() {
  const completed = useGameStore((s) => s.completedLessons);
  const [mounted, setMounted] = useState(false);
  // Default to the first level that has authored content.
  const [activeLevelId, setActiveLevelId] = useState(levels[0].id);
  useEffect(() => setMounted(true), []);

  // Before hydration, treat nothing as completed — matches initial store.
  const completedSet = useMemo(
    () => new Set(mounted ? completed : []),
    [mounted, completed]
  );

  // The current lesson is the first non-completed one across the whole tree.
  const flat = useMemo(() => allLessons(), []);
  const currentId = flat.find((l) => !completedSet.has(l.id))?.id;

  function statusFor(id: string): NodeStatus {
    if (completedSet.has(id)) return "completed";
    if (id === currentId) return "current";
    return "locked";
  }

  const activeLevel = levels.find((l) => l.id === activeLevelId) ?? levels[0];

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
          {activeLevel.units.map((unit) => (
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
                    status={statusFor(lesson.id)}
                    offset={OFFSETS[i % OFFSETS.length]}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
