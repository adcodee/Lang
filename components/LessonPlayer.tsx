"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { getLesson, getNextLesson } from "@/lib/content/curriculum";
import { getDrill } from "@/lib/content/dojo";
import { useGameStore } from "@/lib/store/gameStore";
import type { Lesson } from "@/lib/types";
import { answerLabel } from "@/lib/exercise";
import ExerciseCard from "@/components/ExerciseCard";
import FeedbackBanner from "@/components/FeedbackBanner";

const XP_PER_CORRECT = 5;
const PASS_RATE = 0.8; // first-try accuracy needed to complete a lesson

export type PlayerMode = "lesson" | "drill" | "review";

export default function LessonPlayer({
  lessonId,
  lesson: lessonOverride,
  mode = "lesson",
}: {
  lessonId?: string;
  lesson?: Lesson; // synthetic lesson (used by the Review drill)
  mode?: PlayerMode;
}) {
  const router = useRouter();
  // Lessons come from the curriculum tree; drills from the drill set; the
  // review drill passes a synthetic lesson directly.
  const lesson = useMemo(
    () =>
      lessonOverride ??
      (mode === "lesson" ? getLesson(lessonId ?? "") : getDrill(lessonId ?? "")),
    [lessonId, lessonOverride, mode]
  );

  const recordAnswer = useGameStore((s) => s.recordAnswer);
  const flagRevision = useGameStore((s) => s.flagRevision);
  const clearRevision = useGameStore((s) => s.clearRevision);
  const completeLesson = useGameStore((s) => s.completeLesson);
  const registerActivity = useGameStore((s) => s.registerActivity);

  const [step, setStep] = useState(0);
  const [attempt, setAttempt] = useState(0); // 0 = first try, 1 = retry
  const [checked, setChecked] = useState(false);
  const [lastCorrect, setLastCorrect] = useState(false);
  const [firstTryCount, setFirstTryCount] = useState(0); // scoring basis
  const [done, setDone] = useState(false);

  const backHref = mode === "lesson" ? "/" : "/dojo";

  if (!lesson) {
    return (
      <div className="card p-6 text-center">
        <p className="font-bold">
          {mode === "lesson" ? "Lesson not found." : "Drill not found."}
        </p>
        <button className="btn-brand mt-4" onClick={() => router.push(backHref)}>
          {mode === "lesson" ? "Back to map" : "Back to Dojo"}
        </button>
      </div>
    );
  }

  const total = lesson.exercises.length;
  const exercise = lesson.exercises[step];
  const progress = Math.round((step / total) * 100);
  // Offer one retry on the first miss; reveal the answer on the second.
  const retryOffered = checked && !lastCorrect && attempt === 0;

  function handleChecked(correct: boolean) {
    setLastCorrect(correct);
    setChecked(true);
    if (attempt > 0) return; // retries don't change score or stats

    // First attempt: this is what scoring, stats and revision are based on.
    if (mode !== "review") {
      recordAnswer(lesson!.skill, correct, correct ? XP_PER_CORRECT : 0);
    }
    if (correct) {
      setFirstTryCount((c) => c + 1);
    } else if (mode === "lesson") {
      flagRevision(lesson!.skill, `${lesson!.id}#${step}`);
    }
  }

  function handleRetry() {
    setAttempt(1);
    setChecked(false);
    setLastCorrect(false);
  }

  function advance() {
    setChecked(false);
    setAttempt(0);
    if (step + 1 < total) {
      setStep((s) => s + 1);
    } else {
      const passed = firstTryCount / total >= PASS_RATE;
      // Only a passing lesson completes/unlocks; drills never gate.
      if (mode === "lesson" && passed) {
        completeLesson(lesson!.id, lesson!.xp);
      }
      if (mode === "review") {
        clearRevision();
      }
      registerActivity();
      setDone(true);
    }
  }

  function restart() {
    setStep(0);
    setAttempt(0);
    setChecked(false);
    setLastCorrect(false);
    setFirstTryCount(0);
    setDone(false);
  }

  if (done) {
    if (mode === "lesson") {
      return (
        <LessonComplete
          lessonId={lesson.id}
          xp={lesson.xp}
          correct={firstTryCount}
          total={total}
          passed={firstTryCount / total >= PASS_RATE}
          onRetry={restart}
        />
      );
    }
    return (
      <DrillComplete
        correct={firstTryCount}
        total={total}
        onRestart={restart}
        review={mode === "review"}
      />
    );
  }

  // Note shown after checking (the teaching note from the exercise).
  const note = (exercise as { note?: string }).note;
  const answerText = answerLabel(exercise);

  return (
    <div className="relative">
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={() => router.push(backHref)}
          aria-label={mode === "lesson" ? "Quit lesson" : "Quit drill"}
          className="text-muted hover:text-ink"
        >
          <X />
        </button>
        <div className="h-4 flex-1 overflow-hidden rounded-full bg-gray-200">
          <motion.div
            className="h-full rounded-full bg-brand"
            animate={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-sm font-bold text-muted">
          {step + 1}/{total}
        </span>
      </div>

      <ExerciseCard
        key={`${step}-${attempt}`}
        exercise={exercise}
        checked={checked}
        onChecked={handleChecked}
      />

      {checked && (
        <FeedbackBanner
          correct={lastCorrect}
          note={note}
          answer={lastCorrect ? undefined : answerText}
          onContinue={advance}
          onRetry={retryOffered ? handleRetry : undefined}
          continueLabel={step + 1 < total ? "Continue" : "Finish"}
        />
      )}
    </div>
  );
}

function LessonComplete({
  lessonId,
  xp,
  correct,
  total,
  passed,
  onRetry,
}: {
  lessonId: string;
  xp: number;
  correct: number;
  total: number;
  passed: boolean;
  onRetry: () => void;
}) {
  const router = useRouter();
  const next = getNextLesson(lessonId);
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;

  if (!passed) {
    // Below the pass rate — no completion/unlock; encourage a retry.
    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="card p-8 text-center"
      >
        <div className="text-6xl">💪</div>
        <h1 className="mt-4 text-2xl font-extrabold text-ink">
          Almost there!
        </h1>
        <p className="mt-2 text-muted">
          You scored{" "}
          <span className="font-bold text-ink">
            {correct}/{total} ({pct}%)
          </span>
          . You need {Math.round(PASS_RATE * 100)}% on the first try to pass —
          give it another go.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <button className="btn-brand" onClick={onRetry}>
            Retry lesson
          </button>
          <button className="btn-ghost" onClick={() => router.push("/")}>
            Back to map
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="card p-8 text-center"
    >
      <div className="text-6xl">🎉</div>
      <h1 className="mt-4 text-2xl font-extrabold text-brand-dark">
        Lesson complete!
      </h1>
      <p className="mt-2 text-muted">
        You passed with{" "}
        <span className="font-bold text-ink">
          {correct}/{total} ({pct}%)
        </span>{" "}
        and earned{" "}
        <span className="font-bold text-gold">
          +{xp + correct * XP_PER_CORRECT} XP
        </span>
        .
      </p>
      <div className="mt-6 flex flex-col gap-3">
        {next ? (
          <button
            className="btn-brand"
            onClick={() => router.push(`/lesson/${next.id}`)}
          >
            Next lesson: {next.title}
          </button>
        ) : (
          <button className="btn-sky" onClick={() => router.push("/practice")}>
            Try AI conversation practice
          </button>
        )}
        <button className="btn-ghost" onClick={() => router.push("/")}>
          Back to map
        </button>
      </div>
    </motion.div>
  );
}

function DrillComplete({
  correct,
  total,
  onRestart,
  review = false,
}: {
  correct: number;
  total: number;
  onRestart: () => void;
  review?: boolean;
}) {
  const router = useRouter();
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="card p-8 text-center"
    >
      <div className="text-6xl">{review ? "🔁" : "🥋"}</div>
      <h1 className="mt-4 text-2xl font-extrabold text-brand-dark">
        {review ? "Revision cleared!" : "Training complete!"}
      </h1>
      <p className="mt-2 text-muted">
        Accuracy:{" "}
        <span className="font-bold text-gold">{accuracy}%</span> ({correct}/
        {total})
        {review && " — flagged items cleared."}
      </p>
      <div className="mt-6 flex flex-col gap-3">
        {!review && (
          <button className="btn-brand" onClick={onRestart}>
            Train again
          </button>
        )}
        <button className="btn-ghost" onClick={() => router.push("/dojo")}>
          Back to Dojo
        </button>
      </div>
    </motion.div>
  );
}
