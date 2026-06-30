"use client";

import { useState } from "react";
import { getLesson } from "@/lib/content/curriculum";
import LessonPlayer from "@/components/LessonPlayer";
import TeachPhase from "@/components/teach/TeachPhase";

// Composes the optional Teach phase with the exercise player. Lessons without
// `teach` content go straight into exercises (unchanged behavior).
export default function LessonFlow({ id }: { id: string }) {
  const lesson = getLesson(id);
  const hasTeach = Boolean(lesson?.teach?.length);
  const [phase, setPhase] = useState<"teach" | "practice">(
    hasTeach ? "teach" : "practice"
  );

  if (phase === "teach" && lesson?.teach) {
    return (
      <TeachPhase cards={lesson.teach} onReady={() => setPhase("practice")} />
    );
  }

  return <LessonPlayer lessonId={id} mode="lesson" />;
}
