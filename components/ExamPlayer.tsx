"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { X, Heart } from "lucide-react";
import { buildExam } from "@/lib/content/ja/exam";
import { getNextUnit, getUnit, isUnitUnlocked } from "@/lib/content/ja/curriculum";
import { useGameStore } from "@/lib/store/gameStore";
import { answerLabel } from "@/lib/exercise";
import ExerciseCard from "@/components/ExerciseCard";
import FeedbackBanner from "@/components/FeedbackBanner";

const XP_PER_CORRECT = 5;
const EXAM_BONUS = 50; // belt bonus on top of per-question XP
const START_HEARTS = 3;

// The end-of-unit Dojo Examination: questions pooled from the whole unit,
// defended by 3 hearts. No per-question retry; lose all hearts = fail. Survive
// to the end = pass (belt + bonus XP). Per-answer recordAnswer feeds Rank.
export default function ExamPlayer({ unitId }: { unitId: string }) {
  const router = useRouter();
  const recordAnswer = useGameStore((s) => s.recordAnswer);
  const passExam = useGameStore((s) => s.passExam);
  const registerActivity = useGameStore((s) => s.registerActivity);
  const examsPassed = useGameStore((s) => s.examsPassed);
  const completed = useGameStore((s) => s.completedLessons);

  // Deep-link guard: the exam route is public, so mirror the SkillTree's
  // "available" condition — unit unlocked and every lesson completed —
  // otherwise /exam/<later-unit> would let the learner skip the progression.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const unit = getUnit(unitId);
  const available =
    Boolean(unit) &&
    isUnitUnlocked(unitId, examsPassed) &&
    unit!.lessons.every((l) => completed.includes(l.id));
  const blocked = mounted && !available;
  useEffect(() => {
    if (blocked) router.replace("/");
  }, [blocked, router]);

  const [attemptKey, setAttemptKey] = useState(0);
  const exam = useMemo(
    () => buildExam(unitId),
    // Rebuild (reshuffle) each attempt.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [unitId, attemptKey]
  );

  const [step, setStep] = useState(0);
  const [hearts, setHearts] = useState(START_HEARTS);
  const [checked, setChecked] = useState(false);
  const [lastCorrect, setLastCorrect] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [done, setDone] = useState<null | "pass" | "fail">(null);

  if (blocked) return null; // redirecting to the map

  if (!exam) {
    return (
      <div className="card p-6 text-center">
        <p className="font-bold">Exam not found.</p>
        <button className="btn-brand mt-4" onClick={() => router.push("/")}>
          Back to map
        </button>
      </div>
    );
  }

  const total = exam.items.length;
  const item = exam.items[step];

  function handleChecked(isCorrect: boolean) {
    setLastCorrect(isCorrect);
    setChecked(true);
    recordAnswer(item.skill, isCorrect, isCorrect ? XP_PER_CORRECT : 0);
    if (isCorrect) setCorrect((c) => c + 1);
    else setHearts((h) => h - 1);
  }

  function handleContinue() {
    setChecked(false);
    // Out of hearts → fail immediately.
    if (!lastCorrect && hearts <= 0) {
      setDone("fail");
      registerActivity();
      return;
    }
    if (step + 1 < total) {
      setStep((s) => s + 1);
    } else {
      // Survived to the end with a heart to spare → pass.
      passExam(exam!.unitId, EXAM_BONUS);
      registerActivity();
      setDone("pass");
    }
  }

  function retry() {
    setAttemptKey((k) => k + 1);
    setStep(0);
    setHearts(START_HEARTS);
    setChecked(false);
    setLastCorrect(false);
    setCorrect(0);
    setDone(null);
  }

  if (done === "pass") {
    return <ExamPassed unitId={exam.unitId} title={exam.title} correct={correct} total={total} />;
  }
  if (done === "fail") {
    return <ExamFailed correct={correct} total={total} onRetry={retry} />;
  }

  return (
    <div className="relative">
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={() => router.push("/")}
          aria-label="Quit exam"
          className="text-muted hover:text-ink"
        >
          <X />
        </button>
        <div className="flex flex-1 items-center justify-center gap-1">
          {Array.from({ length: START_HEARTS }).map((_, i) => (
            <Heart
              key={i}
              className={i < hearts ? "text-heart" : "text-gray-200"}
              fill={i < hearts ? "#c15a5a" : "#e5e7eb"}
              strokeWidth={0}
            />
          ))}
        </div>
        <span className="text-sm font-bold text-muted">
          {step + 1}/{total}
        </span>
      </div>

      <ExerciseCard
        key={step}
        exercise={item.exercise}
        checked={checked}
        onChecked={handleChecked}
      />

      {checked && (
        <FeedbackBanner
          correct={lastCorrect}
          answer={lastCorrect ? undefined : answerLabel(item.exercise)}
          onContinue={handleContinue}
          continueLabel={
            !lastCorrect && hearts <= 0
              ? "See result"
              : step + 1 < total
              ? "Continue"
              : "Finish"
          }
        />
      )}
    </div>
  );
}

function ExamPassed({
  unitId,
  title,
  correct,
  total,
}: {
  unitId: string;
  title: string;
  correct: number;
  total: number;
}) {
  const router = useRouter();
  const next = getNextUnit(unitId);

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="card p-8 text-center"
    >
      <div className="text-6xl">🥋</div>
      <h1 className="mt-4 text-2xl font-extrabold text-brand-dark">
        Belt earned!
      </h1>
      <p className="mt-2 text-muted">
        You passed the <span className="font-bold">{title}</span> exam{" "}
        <span className="font-bold text-ink">
          ({correct}/{total})
        </span>{" "}
        and earned{" "}
        <span className="font-bold text-gold">
          +{EXAM_BONUS + correct * XP_PER_CORRECT} XP
        </span>
        .
      </p>
      {next && (
        <p className="mt-1 text-sm text-brand-dark">
          🔓 {next.title} is now unlocked.
        </p>
      )}
      <div className="mt-6 flex flex-col gap-3">
        <button className="btn-brand" onClick={() => router.push("/")}>
          Back to map
        </button>
        <button className="btn-sky" onClick={() => router.push("/rank")}>
          View your rank
        </button>
      </div>
    </motion.div>
  );
}

function ExamFailed({
  correct,
  total,
  onRetry,
}: {
  correct: number;
  total: number;
  onRetry: () => void;
}) {
  const router = useRouter();
  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="card p-8 text-center"
    >
      <div className="text-6xl">💔</div>
      <h1 className="mt-4 text-2xl font-extrabold text-ink">Out of hearts</h1>
      <p className="mt-2 text-muted">
        You got {correct}/{total} before running out. Train the weak spots in the
        Dojo, then come back and try again.
      </p>
      <div className="mt-6 flex flex-col gap-3">
        <button className="btn-sky" onClick={() => router.push("/dojo")}>
          Train in the Dojo
        </button>
        <button className="btn-brand" onClick={onRetry}>
          Retry exam
        </button>
        <button className="btn-ghost" onClick={() => router.push("/")}>
          Back to map
        </button>
      </div>
    </motion.div>
  );
}
