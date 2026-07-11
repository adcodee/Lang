"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { getLesson, getUnitForLesson } from "@/lib/content/curriculum";
import { getDrill } from "@/lib/content/dojo";
import { useGameStore } from "@/lib/store/gameStore";
import type { Lesson } from "@/lib/types";
import { answerLabel, exerciseSkill } from "@/lib/exercise";
import ExerciseCard from "@/components/ExerciseCard";
import FeedbackBanner from "@/components/FeedbackBanner";

const XP_PER_CORRECT = 5;
const PASS_RATE = 0.8; // first-try accuracy needed to complete a lesson

export type PlayerMode = "lesson" | "drill" | "review";

export default function LessonPlayer({
  lessonId,
  lesson: lessonOverride,
  mode = "lesson",
  relearn,
}: {
  lessonId?: string;
  lesson?: Lesson; // synthetic lesson (used by the Review drill)
  mode?: PlayerMode;
  relearn?: { id: string }; // when set, failing re-locks the Learn part
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
    // The skill comes from the exercise (override/modality) with the lesson
    // skill as the fallback.
    const skill = exerciseSkill(exercise, lesson!.skill);
    if (mode !== "review") {
      recordAnswer(skill, correct, correct ? XP_PER_CORRECT : 0);
    }
    if (correct) {
      setFirstTryCount((c) => c + 1);
    } else if (mode === "lesson") {
      flagRevision(skill, `${lesson!.id}#${step}`);
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
          relearn={relearn}
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
        // While a retry is pending, don't highlight the correct option — the
        // second attempt has to be recalled, not read off the screen.
        revealAnswer={!retryOffered}
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
  relearn,
}: {
  lessonId: string;
  xp: number;
  correct: number;
  total: number;
  passed: boolean;
  onRetry: () => void;
  relearn?: { id: string };
}) {
  const router = useRouter();
  const revokeLearned = useGameStore((s) => s.revokeLearned);
  // A failed gated Test re-locks its Learn part (once, on mount of the fail
  // screen) so it must be redone before the Test reopens.
  useEffect(() => {
    if (!passed && relearn) revokeLearned(relearn.id);
  }, [passed, relearn, revokeLearned]);
  // Progress within the unit only — crossing into the next unit must go through
  // the unit exam, not straight to the next unit's first lesson.
  const unit = getUnitForLesson(lessonId);
  const idxInUnit = unit ? unit.lessons.findIndex((l) => l.id === lessonId) : -1;
  const isLastInUnit = unit ? idxInUnit === unit.lessons.length - 1 : false;
  const nextInUnit =
    unit && idxInUnit >= 0 ? unit.lessons[idxInUnit + 1] : undefined;
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;

  // Compute the next destination href once so the countdown can use it.
  const nextHref = isLastInUnit && unit
    ? `/exam/${unit.id}`
    : nextInUnit
    ? `/lesson/${nextInUnit.id}`
    : "/practice";

  // Auto-advance countdown (passed lessons only).
  const [countdown, setCountdown] = useState(3);
  const [autoNavCancelled, setAutoNavCancelled] = useState(false);
  useEffect(() => {
    if (!passed || autoNavCancelled) return;
    if (countdown <= 0) {
      router.push(nextHref);
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [passed, countdown, autoNavCancelled, nextHref, router]);

  if (!passed) {
    // Below the pass rate — no completion. For a gated 2-part lesson, the Learn
    // part is re-locked by the effect above so it must be redone.
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
          . You need {Math.round(PASS_RATE * 100)}% to pass
          {relearn ? " — run through the lesson again to reinforce it." : " — give it another go."}
        </p>
        <div className="mt-6 flex flex-col gap-3">
          {relearn ? (
            <button
              className="btn-brand"
              onClick={() => router.push(`/lesson/${relearn.id}?part=learn`)}
            >
              Redo the Learn part
            </button>
          ) : (
            <button className="btn-brand" onClick={onRetry}>
              Retry lesson
            </button>
          )}
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
        {isLastInUnit && unit ? (
          <button
            className="btn-brand"
            onClick={() => { setAutoNavCancelled(true); router.push(`/exam/${unit.id}`); }}
          >
            Take the {unit.title} exam 🥋{" "}
            {!autoNavCancelled && <span className="opacity-60">({countdown})</span>}
          </button>
        ) : nextInUnit ? (
          <button
            className="btn-brand"
            onClick={() => { setAutoNavCancelled(true); router.push(`/lesson/${nextInUnit.id}`); }}
          >
            Next lesson: {nextInUnit.title}{" "}
            {!autoNavCancelled && <span className="opacity-60">({countdown})</span>}
          </button>
        ) : (
          <button
            className="btn-sky"
            onClick={() => { setAutoNavCancelled(true); router.push("/practice"); }}
          >
            Try AI conversation practice{" "}
            {!autoNavCancelled && <span className="opacity-60">({countdown})</span>}
          </button>
        )}
        <button className="btn-ghost" onClick={() => { setAutoNavCancelled(true); router.push("/"); }}>
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
