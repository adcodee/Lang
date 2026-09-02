"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  getLesson,
  getUnitForLesson,
  isUnitUnlocked,
} from "@/lib/content/ja/curriculum";
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
  // A fresh `{ id }` object literal every render would give LessonComplete's
  // revoke-on-fail effect (deps include `relearn`) a new reference every
  // time, and since revokeLearned's `.filter()` always returns a new array
  // even when nothing actually changed, that store update triggers this
  // component to re-render (it selects learnedLessons), producing another
  // new `relearn` object — an infinite loop, real and reproducible on any
  // failed Test with a Learn part, not something 1.2.1/1.2.2 introduced but
  // caught while verifying 1.2.2's own fail path. Memoized so the reference
  // only actually changes when hasTeach/id do.
  const relearn = useMemo(() => (hasTeach ? { id } : undefined), [hasTeach, id]);
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
      relearn={relearn}
    />
  );
}
