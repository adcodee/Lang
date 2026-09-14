"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  getLesson,
  getUnitForLesson,
  isUnitUnlocked,
} from "@/lib/content/lookup";
import { useGameStore } from "@/lib/store/gameStore";
import LessonPlayer from "@/components/LessonPlayer";
import TeachPhase from "@/components/teach/TeachPhase";

export default function LessonFlow({ id }: { id: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const examsPassed = useGameStore((s) => s.examsPassed);
  const learnedLessons = useGameStore((s) => s.learnedLessons);
  const markLearned = useGameStore((s) => s.markLearned);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const lesson = getLesson(id);
  const unit = getUnitForLesson(id);
  const hasTeach = Boolean(lesson?.teach?.length);
  const relearn = useMemo(() => (hasTeach ? { id } : undefined), [hasTeach, id]);
  const part: "learn" | "test" = hasTeach
    ? searchParams.get("part") === "test"
      ? "test"
      : "learn"
    : "test";

  const [testEntered, setTestEntered] = useState(false);
  const learned = learnedLessons.includes(id);
  useEffect(() => {
    if (mounted && part === "test" && learned) setTestEntered(true);
    if (part === "learn") setTestEntered(false);
  }, [mounted, part, learned]);

  const unitLocked =
    mounted && Boolean(unit) && !isUnitUnlocked(unit!.id, examsPassed);
  const testLocked =
    mounted && part === "test" && hasTeach && !learned && !testEntered;

  useEffect(() => {
    if (unitLocked) router.replace("/");
    else if (testLocked) router.replace(`/lesson/${id}?part=learn`);
  }, [unitLocked, testLocked, id, router]);

  const [learnDone, setLearnDone] = useState(false);

  if (!lesson || unitLocked || testLocked) return null;

  if (part === "learn") {
    if (!(learnDone && learned) && lesson.teach) {
      return (
        <TeachPhase
          cards={lesson.teach}
          onReady={() => {
            markLearned(id);
            setLearnDone(true);
          }}
        />
      );
    }
    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="card p-8 text-center"
      >
        <div className="text-6xl">\u{1F4D6}</div>
        <h1 className="mt-4 text-2xl font-extrabold text-brand-dark">
          Learn complete!
        </h1>
        <p className="mt-2 text-muted">
          You've unlocked the test for{" "}
          <span className="font-bold text-ink">{lesson.title}</span>.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <button
            className="btn-brand"
            onClick={() => router.push(`/lesson/${id}?part=test`)}
          >
            Start the test \u2192
          </button>
          <button className="btn-ghost" onClick={() => router.push("/")}>
            Back to map
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <LessonPlayer
      lessonId={id}
      lesson={lesson}
      mode="lesson"
      relearn={relearn}
    />
  );
}
