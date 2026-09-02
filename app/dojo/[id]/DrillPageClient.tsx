"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getDrillConfig, isDrillUnlocked } from "@/lib/content/ja/dojo";
import { useGameStore } from "@/lib/store/gameStore";
import LessonPlayer from "@/components/LessonPlayer";
import TraceDrill from "@/components/dojo/TraceDrill";
import VowelSortDrill from "@/components/dojo/VowelSortDrill";
import LookalikeDrill from "@/components/dojo/LookalikeDrill";
import WordFlashDrill from "@/components/dojo/WordFlashDrill";
import QuickMatchDrill from "@/components/dojo/QuickMatchDrill";

export default function DrillPageClient({ id }: { id: string }) {
  const router = useRouter();
  const completed = useGameStore((s) => s.completedLessons);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const drill = getDrillConfig(id);
  const locked = mounted && drill ? !isDrillUnlocked(drill, completed) : false;

  useEffect(() => {
    if ((mounted && !drill) || locked) router.replace("/dojo");
  }, [mounted, drill, locked, router]);

  if (!drill || locked) return null;

  switch (drill.kind) {
    case "trace":
      return <TraceDrill />;
    case "vowel-sort":
      return <VowelSortDrill />;
    case "lookalike":
      return <LookalikeDrill />;
    case "word-flash":
      return <WordFlashDrill />;
    case "match":
      // 1.2: now an endless drill like the others (was routed through
      // LessonPlayer with a fixed 3-board array). The mounted-gate hack
      // this used to need is retired too — matchPool() returns [] until
      // real post-hydration data is in (mirroring how Lookalike/Vowel
      // Sort already behave), so QuickMatchDrill never calls
      // Math.random() against an empty/pre-hydration pool the way the old
      // vowel-fallback generator did, which is what actually caused the
      // hydration mismatch, not randomness in general.
      return <QuickMatchDrill />;
    default:
      return <LessonPlayer lessonId={id} mode="drill" />;
  }
}
