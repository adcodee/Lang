"use client";

import { useEffect } from "react";
import { useGameStore } from "@/lib/store/gameStore";
import ComingSoonCourse from "@/components/ComingSoonCourse";
import CourseTransition from "@/components/CourseTransition";

// Luganda Unit 0 is live. Dojo / practice / AI tutor are still Japanese
// packs — those routes will show JA content until they are split.
const CONTENT_READY: Record<string, boolean> = { ja: true, lg: true };

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
