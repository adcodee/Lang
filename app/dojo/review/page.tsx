"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { useGameStore } from "@/lib/store/gameStore";
import { buildReviewLesson, reviewDeck } from "@/lib/content/ja/dojo";
import type { Lesson, TeachCard } from "@/lib/types";
import LessonPlayer from "@/components/LessonPlayer";
import RecallRound from "@/components/teach/RecallRound";

type Stage = "srs" | "revision" | "empty" | null;

// Merged review: spaced-repetition due items (recall) + wrong-answer exercises.
export default function ReviewPage() {
  const router = useRouter();
  const registerActivity = useGameStore((s) => s.registerActivity);
  const logReview = useGameStore((s) => s.logReview);

  // Snapshot the queue once so recording answers doesn't reshuffle it — but
  // only once the persisted store has actually finished loading from
  // localStorage. zustand's persist rehydrates asynchronously; a plain
  // mount-once effect (or one keyed off a `hydrated` *React state* flip)
  // can still read stale completed/seen values from a selector closure a
  // render cycle behind the store's own internal hydration bookkeeping —
  // reading straight from `useGameStore.getState()` inside the hydration
  // callback itself sidesteps that: it's always current, not tied to
  // whichever render happened to be in flight when hydration finished.
  // Without this, a plain mount-once effect can freeze on the store's
  // empty defaults (due=[], revisionItems=[]) forever, showing "All caught
  // up" even with a real flagged item. `dojo/page.tsx`'s badge doesn't have
  // this bug because it reads the store reactively on every render instead
  // of snapshotting once.
  const frozen = useRef<{ due: TeachCard[]; revision: Lesson | null } | null>(null);
  const [stage, setStage] = useState<Stage>(null);

  useEffect(() => {
    function snapshotFromLiveStore() {
      const live = useGameStore.getState();
      // reviewDeck pads a lone due item with non-due cards, so a single due
      // item still gets reviewed (RecallRound needs 2+ for distractors).
      const due = reviewDeck(live.completedLessons, live.seen);
      const revision = buildReviewLesson(live.revisionItems);
      frozen.current = { due, revision };
      setStage(due.length >= 2 ? "srs" : revision ? "revision" : "empty");
    }
    // `useGameStore.persist` is only attached once zustand's storage
    // factory can actually see `window` — undefined during Next's SSR/
    // static-generation pass, so every access is optional-chained.
    if (useGameStore.persist?.hasHydrated()) {
      snapshotFromLiveStore();
      return;
    }
    return useGameStore.persist?.onFinishHydration(snapshotFromLiveStore);
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
          onAnswer={logReview}
          onDone={() => {
            // An SRS-only review is real practice — count it for the streak.
            registerActivity();
            setStage(frozen.current!.revision ? "revision" : "empty");
          }}
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
