"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import {
  getLesson,
  getUnitForLesson,
  lessonsSincePriorCheckpoint,
  priorCheckpoint,
} from "@/lib/content/ja/curriculum";
import { getDrill } from "@/lib/content/ja/dojo";
import { augmentLesson } from "@/lib/content/ja/lessonExercises";
import { useGameStore } from "@/lib/store/gameStore";
import type { Lesson } from "@/lib/types";
import { answerLabel, exerciseSkill, isDiscriminationItem } from "@/lib/exercise";
import ExerciseCard from "@/components/ExerciseCard";
import FeedbackBanner from "@/components/FeedbackBanner";

const XP_PER_CORRECT = 2; // Patch 1.3: rank no longer gates on XP, so pacing can slow down
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
  const completedLessons = useGameStore((s) => s.completedLessons);

  // Phase E filler (see lessonExercises.ts) is only computed post-hydration
  // — it calls Math.random(), so generating it unconditionally on the very
  // first render would mismatch the SSR pass, the same hydration-bug class
  // fixed for Quick Match in Phase D. Before mount, a curriculum lesson
  // renders with just its hand-authored exercises (identical server and
  // client); once mounted, the memo below recomputes once and appends
  // filler — a normal post-hydration client update, not a mismatch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Bumped by restart() so a retry regenerates fresh filler instead of
  // replaying the exact same 10/20 items in the exact same order — at
  // Phase E's depth that would make "fail once, then recite the answers
  // back" the path of least resistance. Same shape as ExamPlayer's
  // existing attemptKey.
  const [attemptCycle, setAttemptCycle] = useState(0);

  // Lessons come from the curriculum tree; drills from the drill set (the
  // "match" drill builds its boards fresh from completedLessons — see
  // matchBoards.ts); the review drill passes a synthetic lesson directly.
  const lesson = useMemo(() => {
    const base =
      lessonOverride ??
      (mode === "lesson" ? getLesson(lessonId ?? "") : getDrill(lessonId ?? "", completedLessons));
    // Only real curriculum lessons (not drills, not the synthetic Review
    // lesson) get generated filler.
    if (!base || mode !== "lesson" || lessonOverride || !mounted) return base;
    const exercises = augmentLesson(base);
    return exercises === base.exercises ? base : { ...base, exercises };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId, lessonOverride, mode, completedLessons, mounted, attemptCycle]);

  const recordAnswer = useGameStore((s) => s.recordAnswer);
  const recordSeen = useGameStore((s) => s.recordSeen);
  const flagRevision = useGameStore((s) => s.flagRevision);
  const clearRevision = useGameStore((s) => s.clearRevision);
  const completeLesson = useGameStore((s) => s.completeLesson);
  const registerActivity = useGameStore((s) => s.registerActivity);
  const lives = useGameStore((s) => s.lives);
  const loseLife = useGameStore((s) => s.loseLife);
  const refillLives = useGameStore((s) => s.refillLives);
  const resetSpan = useGameStore((s) => s.resetSpan);

  const [step, setStep] = useState(0);
  const [attempt, setAttempt] = useState(0); // 0 = first try, 1 = retry
  const [checked, setChecked] = useState(false);
  const [lastCorrect, setLastCorrect] = useState(false);
  const [firstTryCount, setFirstTryCount] = useState(0); // scoring basis
  // A first-try miss on a genuine confusion pair (ぬ/め etc.) blocks passing
  // outright — see isDiscriminationItem. A passing rate can otherwise hide
  // exactly the one mix-up a lesson exists to catch.
  const [discriminationMisses, setDiscriminationMisses] = useState(0);
  const [done, setDone] = useState(false);
  // Patch 1.2.2: set only when a fail took the checkpoint-lives pool to 0 —
  // swaps the normal fail screen for a dedicated bounce-back screen. Holds
  // the checkpoint title being sent back to (null = the very start of the
  // course, no checkpoint passed yet).
  const [outOfLives, setOutOfLives] = useState<{ checkpointTitle: string | null } | null>(null);

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

  // match-pairs never offers the generic whole-exercise retry (see below) —
  // by the time onChecked fires, every pair is already visually solved
  // (wrong pairs flash and recover in place, per 1.1), so the banner should
  // read as a clean solve regardless of first-try misses. The *scoring*
  // (recordAnswer/firstTryCount/discriminationMisses) still uses the real
  // first-try-based `correct` below — only the banner's correctness is
  // overridden, so accuracy stays honest while the UI doesn't contradict
  // a board the learner can see is entirely green.
  function handleChecked(correct: boolean) {
    const isMatchPairs = exercise.type === "match-pairs";
    setLastCorrect(isMatchPairs ? true : correct);
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
    } else {
      // match-pairs flags individual missed kana via handleMatchPairsMiss
      // (recordSeen, below) instead — flagRevision replays one exact
      // exercise, which doesn't make sense for "just one pair out of four."
      if (mode === "lesson" && !isMatchPairs) flagRevision(skill, `${lesson!.id}#${step}`);
      if (isDiscriminationItem(exercise)) setDiscriminationMisses((c) => c + 1);
    }
  }

  // Per-pair SRS flagging for match-pairs — see the long comment on
  // handleChecked above for why this bypasses flagRevision entirely.
  function handleMatchPairsMiss(missed: string, confusedWith?: string) {
    recordSeen(`kana:${missed}`, false);
    if (confusedWith) recordSeen(`kana:${confusedWith}`, false);
  }
  function handleMatchPairsCorrect(kana: string) {
    recordSeen(`kana:${kana}`, true);
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
      const passed = firstTryCount / total >= PASS_RATE && discriminationMisses === 0;
      // Only a passing lesson completes/unlocks; drills never gate.
      if (mode === "lesson" && passed) {
        completeLesson(lesson!.id, lesson!.xp);
        // Patch 1.2.2: a checkpoint pass is the pool's only refill point.
        if (lesson!.checkpoint) refillLives();
      } else if (mode === "lesson" && !passed) {
        // Patch 1.2.2: every lesson-test fail (checkpoints included, since
        // they're just another lesson test here) spends one life from the
        // pool shared since the last checkpoint. Exams have their own,
        // separate per-attempt hearts and never touch this.
        if (lives <= 1) {
          const span = lessonsSincePriorCheckpoint(lesson!.id);
          resetSpan(span);
          refillLives();
          setOutOfLives({ checkpointTitle: priorCheckpoint(lesson!.id)?.title ?? null });
        } else {
          loseLife();
        }
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
    setDiscriminationMisses(0);
    setDone(false);
    setAttemptCycle((c) => c + 1);
  }

  if (done) {
    if (outOfLives) {
      return <OutOfLives checkpointTitle={outOfLives.checkpointTitle} />;
    }
    if (mode === "lesson") {
      return (
        <LessonComplete
          lessonId={lesson.id}
          xp={lesson.xp}
          correct={firstTryCount}
          total={total}
          passed={firstTryCount / total >= PASS_RATE && discriminationMisses === 0}
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
        onMatchPairsMiss={handleMatchPairsMiss}
        onMatchPairsCorrect={handleMatchPairsCorrect}
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

// Patch 1.2.2: shown instead of the normal fail screen when a lesson-test
// fail took the checkpoint-lives pool to 0. The span since the last
// checkpoint has already been reset and lives already refilled by the
// caller — this screen is purely informational; "Continue" just routes
// home, where useCurrentLesson() naturally resolves to the first lesson of
// that span again now that its completion flags are cleared, so no special
// "jump to checkpoint" navigation is needed here.
function OutOfLives({ checkpointTitle }: { checkpointTitle: string | null }) {
  const router = useRouter();
  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="card p-8 text-center"
    >
      <div className="text-6xl">💔</div>
      <h1 className="mt-4 text-2xl font-extrabold text-ink">Out of lives</h1>
      <p className="mt-2 text-muted">
        {checkpointTitle ? (
          <>
            You&apos;re out of lives — back to{" "}
            <span className="font-bold text-ink">{checkpointTitle}</span> to
            go through it again.
          </>
        ) : (
          <>You&apos;re out of lives — back to the start to go through it again.</>
        )}{" "}
        Lives are refilled to 3. Take the Learn part slower this time — it&apos;s
        what keeps the Test from costing you a life.
      </p>
      <div className="mt-6 flex flex-col gap-3">
        <button className="btn-brand" onClick={() => router.push("/")}>
          Continue
        </button>
      </div>
    </motion.div>
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
