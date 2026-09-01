"use client";

import { useEffect } from "react";
import { useGameStore } from "@/lib/store/gameStore";
import ComingSoonCourse from "@/components/ComingSoonCourse";
import CourseTransition from "@/components/CourseTransition";

// Every route today (skill tree, lesson, dojo, exam, rank, practice) is
// wired directly to lib/content/ja/* — there is no per-language content
// pack switch yet (see the Luganda build plan's "Split content roots"
// step, not started). Until a language has its own content root, gate it
// here instead of rendering JP-only pages under the wrong course. Japanese
// (the default) is always exempt.
const CONTENT_READY: Record<string, boolean> = { ja: true, lg: false };

const TRANSITION_MS = 700;

export default function LanguageGate({ children }: { children: React.ReactNode }) {
  const active = useGameStore((s) => s.active);
  const pendingTransition = useGameStore((s) => s.pendingTransition);
  const clearTransition = useGameStore((s) => s.clearTransition);

  useEffect(() => {
    if (!pendingTransition) return;
    const t = setTimeout(clearTransition, TRANSITION_MS);
    return () => clearTimeout(t);
  }, [pendingTransition, clearTransition]);

  if (pendingTransition) {
    return <CourseTransition language={pendingTransition} />;
  }
  if (!CONTENT_READY[active]) {
    return <ComingSoonCourse language={active} />;
  }
  return <>{children}</>;
}
