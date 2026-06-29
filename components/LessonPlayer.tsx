"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { getLesson, getNextLesson } from "@/lib/content/curriculum";
import { getDrill } from "@/lib/content/dojo";
import { useGameStore } from "@/lib/store/gameStore";
import type { Exercise } from "@/lib/types";
import ExerciseCard from "@/components/ExerciseCard";
import FeedbackBanner from "@/components/FeedbackBanner";

const XP_PER_CORRECT = 5;

export default function LessonPlayer({
  lessonId,
  freePlay = false,
}: {
  lessonId: string;
  freePlay?: boolean;
}) {
  const router = useRouter();
  // Lessons come from the curriculum tree; Dojo drills come from the drill set.
  const lesson = useMemo(
    () => (freePlay ? getDrill(lessonId) : getLesson(lessonId)),
    [lessonId, freePlay]
  );

  const loseHeart = useGameStore((s) => s.loseHeart);
  const hearts = useGameStore((s) => s.hearts);
  const recordAnswer = useGameStore((s) => s.recordAnswer);
  const completeLesson = useGameStore((s) => s.completeLesson);
  const registerActivity = useGameStore((s) => s.registerActivity);

  const [step, setStep] = useState(0);
  const [checked, setChecked] = useState(false);
  const [lastCorrect, setLastCorrect] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [done, setDone] = useState(false);

  if (!lesson) {
    return (
      <div className="card p-6 text-center">
        <p className="font-bold">
          {freePlay ? "Drill not found." : "Lesson not found."}
        </p>
        <button
          className="btn-brand mt-4"
          onClick={() => router.push(freePlay ? "/dojo" : "/")}
        >
          {freePlay ? "Back to Dojo" : "Back to map"}
        </button>
      </div>
    );
  }

  const total = lesson.exercises.length;
  const exercise = lesson.exercises[step];
  const progress = Math.round((step / total) * 100);

  function handleChecked(correct: boolean) {
    setLastCorrect(correct);
    setChecked(true);
    // Attribute the answer to this lesson's skill (feeds the Rank tab).
    recordAnswer(lesson!.skill, correct, correct ? XP_PER_CORRECT : 0);
    if (correct) {
      setCorrectCount((c) => c + 1);
    } else {
      loseHeart();
    }
  }

  function handleContinue() {
    setChecked(false);
    if (step + 1 < total) {
      setStep((s) => s + 1);
    } else {
      // Finished. Free-play drills don't unlock anything; lessons do.
      if (!freePlay) {
        completeLesson(lesson!.id, lesson!.xp);
      }
      registerActivity();
      setDone(true);
    }
  }

  function restart() {
    setStep(0);
    setChecked(false);
    setLastCorrect(false);
    setCorrectCount(0);
    setDone(false);
  }

  if (done) {
    return freePlay ? (
      <DrillComplete correct={correctCount} total={total} onRestart={restart} />
    ) : (
      <LessonComplete
        lessonId={lesson.id}
        xp={lesson.xp}
        correct={correctCount}
        total={total}
      />
    );
  }

  // Out of hearts — soft wall.
  if (hearts <= 0 && checked && !lastCorrect) {
    // still allow continue, but warn — handled in banner via note below
  }

  // Note shown after checking (the teaching note from the exercise).
  const note = (exercise as { note?: string }).note;
  const answerText = answerLabel(exercise);

  return (
    <div className="relative">
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={() => router.push(freePlay ? "/dojo" : "/")}
          aria-label={freePlay ? "Quit drill" : "Quit lesson"}
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
        key={step}
        exercise={exercise}
        checked={checked}
        onChecked={handleChecked}
      />

      {checked && (
        <FeedbackBanner
          correct={lastCorrect}
          note={note}
          answer={lastCorrect ? undefined : answerText}
          onContinue={handleContinue}
          continueLabel={step + 1 < total ? "Continue" : "Finish"}
        />
      )}
    </div>
  );
}

function answerLabel(exercise: Exercise): string {
  switch (exercise.type) {
    case "translate-choice":
    case "type-answer":
      return exercise.answer;
    case "build-sentence":
      return exercise.answer.join(" ");
    case "match-pairs":
      return exercise.pairs.map((p) => `${p.left}=${p.right}`).join(", ");
    case "listen-choice":
      return exercise.answer;
    case "speak-phrase":
      return exercise.romaji ? `${exercise.display} (${exercise.romaji})` : exercise.display;
    case "category-sort":
      return exercise.categories
        .map(
          (cat) =>
            `${cat}: ${exercise.items
              .filter((it) => it.category === cat)
              .map((it) => it.label)
              .join(", ")}`
        )
        .join(" · ");
  }
}

function LessonComplete({
  lessonId,
  xp,
  correct,
  total,
}: {
  lessonId: string;
  xp: number;
  correct: number;
  total: number;
}) {
  const router = useRouter();
  const next = getNextLesson(lessonId);

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
        You got {correct} of {total} right and earned{" "}
        <span className="font-bold text-gold">+{xp + correct * XP_PER_CORRECT} XP</span>.
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
}: {
  correct: number;
  total: number;
  onRestart: () => void;
}) {
  const router = useRouter();
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="card p-8 text-center"
    >
      <div className="text-6xl">🥋</div>
      <h1 className="mt-4 text-2xl font-extrabold text-brand-dark">
        Training complete!
      </h1>
      <p className="mt-2 text-muted">
        Accuracy:{" "}
        <span className="font-bold text-gold">{accuracy}%</span> ({correct}/
        {total})
      </p>
      <div className="mt-6 flex flex-col gap-3">
        <button className="btn-brand" onClick={onRestart}>
          Train again
        </button>
        <button className="btn-ghost" onClick={() => router.push("/dojo")}>
          Back to Dojo
        </button>
      </div>
    </motion.div>
  );
}
