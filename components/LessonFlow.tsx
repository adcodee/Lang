"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getLesson,
  getUnitForLesson,
  isUnitUnlocked,
} from "@/lib/content/curriculum";
import { useGameStore } from "@/lib/store/gameStore";
import LessonPlayer from "@/components/LessonPlayer";
import TeachPhase from "@/components/teach/TeachPhase";

// Composes the optional Teach phase with the exercise player. Lessons without
// `teach` content go straight into exercises (unchanged behavior).
export default function LessonFlow({ id }: { id: string }) {
  const router = useRouter();
  const examsPassed = useGameStore((s) => s.examsPassed);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const lesson = getLesson(id);
  const unit = getUnitForLesson(id);
  // Guard: opening a lesson whose unit is gated (prior exam unpassed) bounces
  // back to the map, so the exam can't be bypassed via a direct link.
  const locked =
    mounted && Boolean(unit) && !isUnitUnlocked(unit!.id, examsPassed);

  useEffect(() => {
    if (locked) router.replace("/");
  }, [locked, router]);

  const hasTeach = Boolean(lesson?.teach?.length);
  const [phase, setPhase] = useState<"teach" | "practice">(
    hasTeach ? "teach" : "practice"
  );

  if (locked) return null;

  if (phase === "teach" && lesson?.teach) {
    return (
      <TeachPhase cards={lesson.teach} onReady={() => setPhase("practice")} />
    );
  }

  return <LessonPlayer lessonId={id} mode="lesson" />;
}
