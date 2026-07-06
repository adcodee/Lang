"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  getLesson,
  getUnitForLesson,
  isUnitUnlocked,
} from "@/lib/content/curriculum";
import { useGameStore } from "@/lib/store/gameStore";
import LessonPlayer from "@/components/LessonPlayer";
import TeachPhase from "@/components/teach/TeachPhase";

// A teachable lesson is a 2-part lesson: a Learn part (teach + recall) and a
// Test part (exercises, 80% gate). The Test is locked until Learn is done, and
// failing it re-locks Learn. Lessons without teach are Test-only.
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
  const part: "learn" | "test" = hasTeach
    ? searchParams.get("part") === "test"
      ? "test"
      : "learn"
    : "test";

  // Whether the Test was legitimately entered this session. Failing the Test
  // revokes Learn mid-session, which would otherwise flip the lock guard and
  // hijack the fail screen with an instant redirect — so the entry check is
  // snapshotted: once in, the result screen always gets to show.
  const [testEntered, setTestEntered] = useState(false);
  const learned = learnedLessons.includes(id);
  useEffect(() => {
    if (mounted && part === "test" && learned) setTestEntered(true);
    if (part === "learn") setTestEntered(false);
  }, [mounted, part, learned]);

  // Guard: gated unit (prior exam unpassed) bounces to the map; a Test opened
  // before its Learn part bounces to the Learn part.
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

  // --- Learn part ---
  if (part === "learn") {
    // `learnDone` is session state; a failed Test revokes `learned` in the
    // store, so both must hold or the teach phase runs again (not the stale
    // "Learn complete" screen).
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
        <div className="text-6xl">📖</div>
        <h1 className="mt-4 text-2xl font-extrabold text-brand-dark">
          Learn complete!
        </h1>
        <p className="mt-2 text-muted">
          You&apos;ve unlocked the test for{" "}
          <span className="font-bold text-ink">{lesson.title}</span>.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <button
            className="btn-brand"
            onClick={() => router.push(`/lesson/${id}?part=test`)}
          >
            Start the test →
          </button>
          <button className="btn-ghost" onClick={() => router.push("/")}>
            Back to map
          </button>
        </div>
      </motion.div>
    );
  }

  // --- Test part ---
  return (
    <LessonPlayer
      lessonId={id}
      mode="lesson"
      relearn={hasTeach ? { id } : undefined}
    />
  );
}
