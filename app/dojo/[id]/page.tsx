"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getDrillConfig, isDrillUnlocked } from "@/lib/content/dojo";
import { useGameStore } from "@/lib/store/gameStore";
import LessonPlayer from "@/components/LessonPlayer";
import TraceDrill from "@/components/dojo/TraceDrill";
import VowelSortDrill from "@/components/dojo/VowelSortDrill";

export default function DrillPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const completed = useGameStore((s) => s.completedLessons);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const drill = getDrillConfig(params.id);
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
    default:
      return <LessonPlayer lessonId={params.id} mode="drill" />;
  }
}
