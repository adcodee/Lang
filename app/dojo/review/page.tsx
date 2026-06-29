"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useGameStore } from "@/lib/store/gameStore";
import { buildReviewLesson } from "@/lib/content/dojo";
import LessonPlayer from "@/components/LessonPlayer";

export default function ReviewPage() {
  const revisionItems = useGameStore((s) => s.revisionItems);
  const lesson = useMemo(
    () => buildReviewLesson(revisionItems),
    [revisionItems]
  );

  if (!lesson) {
    return (
      <div className="card p-8 text-center">
        <div className="text-5xl">✅</div>
        <h1 className="mt-3 text-xl font-extrabold text-ink">
          Nothing to review
        </h1>
        <p className="mt-1 text-muted">
          Miss a question in a lesson and it&apos;ll show up here for revision.
        </p>
        <Link href="/dojo" className="btn-brand mt-6 inline-block">
          Back to Dojo
        </Link>
      </div>
    );
  }

  return <LessonPlayer lesson={lesson} mode="review" />;
}
