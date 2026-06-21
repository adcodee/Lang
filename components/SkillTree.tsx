"use client";

import { useEffect, useState } from "react";
import { lessons } from "@/lib/content/lessons";
import { useGameStore } from "@/lib/store/gameStore";
import LessonNode, { NodeStatus } from "@/components/LessonNode";

// Gentle zig-zag pattern for the path of nodes.
const OFFSETS = [0, 1, 0, -1, 0, 1, 0, -1];

export default function SkillTree() {
  const completed = useGameStore((s) => s.completedLessons);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Before hydration, only the first lesson is "current" — matches initial store.
  const completedSet = new Set(mounted ? completed : []);

  // The current lesson is the first non-completed one.
  const currentIndex = lessons.findIndex((l) => !completedSet.has(l.id));

  function statusFor(index: number, id: string): NodeStatus {
    if (completedSet.has(id)) return "completed";
    if (index === currentIndex) return "current";
    return "locked";
  }

  return (
    <div className="flex flex-col items-center gap-10 py-6">
      {lessons.map((lesson, i) => (
        <LessonNode
          key={lesson.id}
          lesson={lesson}
          status={statusFor(i, lesson.id)}
          offset={OFFSETS[i % OFFSETS.length]}
        />
      ))}
    </div>
  );
}
