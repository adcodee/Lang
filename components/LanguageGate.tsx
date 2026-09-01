"use client";

import { useGameStore } from "@/lib/store/gameStore";
import ComingSoonCourse from "@/components/ComingSoonCourse";

// Every route today (skill tree, lesson, dojo, exam, rank, practice) is
// wired directly to lib/content/ja/* — there is no per-language content
// pack switch yet (see the Luganda build plan's "Split content roots"
// step, not started). Until a language has its own content root, gate it
// here instead of rendering JP-only pages under the wrong course. Japanese
// (the default) is always exempt.
const CONTENT_READY: Record<string, boolean> = { ja: true, lg: false };

export default function LanguageGate({ children }: { children: React.ReactNode }) {
  const active = useGameStore((s) => s.active);

  if (!CONTENT_READY[active]) {
    return <ComingSoonCourse language={active} />;
  }
  return <>{children}</>;
}
