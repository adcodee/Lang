"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { useGameStore } from "@/lib/store/gameStore";
import { buildReviewLesson, dueReviewCards } from "@/lib/content/dojo";
import type { Lesson, TeachCard } from "@/lib/types";
import LessonPlayer from "@/components/LessonPlayer";
import RecallRound from "@/components/teach/RecallRound";

type Stage = "srs" | "revision" | "empty" | null;

// Merged review: spaced-repetition due items (recall) + wrong-answer exercises.
export default function ReviewPage() {
  const router = useRouter();
  const revisionItems = useGameStore((s) => s.revisionItems);
  const completed = useGameStore((s) => s.completedLessons);
  const seen = useGameStore((s) => s.seen);

  // Snapshot the queue once on mount so recording answers doesn't reshuffle it.
  const frozen = useRef<{ due: TeachCard[]; revision: Lesson | null } | null>(null);
  const [stage, setStage] = useState<Stage>(null);

  useEffect(() => {
    const due = dueReviewCards(completed, seen);
    const revision = buildReviewLesson(revisionItems);
    frozen.current = { due, revision };
    setStage(due.length >= 2 ? "srs" : revision ? "revision" : "empty");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (stage === null) return null;

  if (stage === "empty") {
    return (
      <div className="card p-8 text-center">
        <div className="text-5xl">✅</div>
        <h1 className="mt-3 text-xl font-extrabold text-ink">All caught up</h1>
        <p className="mt-1 text-muted">
          Nothing due for review right now. Keep learning and check back.
        </p>
        <Link href="/dojo" className="btn-brand mt-6 inline-block">
          Back to Dojo
        </Link>
      </div>
    );
  }

  if (stage === "srs" && frozen.current) {
    return (
      <div>
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={() => router.push("/dojo")}
            aria-label="Quit review"
            className="text-muted hover:text-ink"
          >
            <X />
          </button>
          <div className="flex-1 text-center text-sm font-extrabold uppercase tracking-wide text-muted">
            Spaced review
          </div>
          <div className="w-6" />
        </div>
        <RecallRound
          cards={frozen.current.due}
          onAnswer={() => {}}
          onDone={() =>
            setStage(frozen.current!.revision ? "revision" : "empty")
          }
        />
      </div>
    );
  }

  // revision — wrong-answer exercises via the review-mode player.
  if (frozen.current?.revision) {
    return <LessonPlayer lesson={frozen.current.revision} mode="review" />;
  }
  return null;
}
