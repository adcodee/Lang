"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useGameStore } from "@/lib/store/gameStore";
import { getRank } from "@/lib/rank";
import SkillStats from "@/components/SkillStats";

const BAR_TICKS = 5; // matches the max bars-per-colour in BELT_AWARDS

export default function RankPage() {
  const xp = useGameStore((s) => s.xp);
  const skillStats = useGameStore((s) => s.skillStats);
  const revisionCount = useGameStore((s) => s.revisionItems.length);
  const examsPassed = useGameStore((s) => s.examsPassed);
  const completedLessons = useGameStore((s) => s.completedLessons);
  const reviewLog = useGameStore((s) => s.reviewLog);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const rank = getRank(
    mounted ? xp : 0,
    skillStats,
    mounted ? examsPassed : [],
    mounted ? completedLessons : []
  );
  const belt = rank.belt;

  return (
    <div className="flex flex-col gap-6">
      <section className="dojo-header rounded-2xl p-6 text-center text-white">
        <div className="text-6xl">{rank.emoji}</div>
        <h1 className="mt-3 text-2xl font-extrabold">{rank.title}</h1>
        <p className="mt-1 flex items-center justify-center gap-2 text-sm text-white/80">
          <span>
            {belt.emoji} {belt.label} · {belt.jp}
          </span>
          {belt.bars > 0 && (
            <span className="tracking-tight" aria-hidden="true">
              {"|".repeat(belt.bars)}
              {"·".repeat(Math.max(0, BAR_TICKS - belt.bars))}
            </span>
          )}
        </p>
        <p className="mt-1 text-xs text-white/70">{mounted ? xp : 0} XP total</p>

        <div className="mx-auto mt-4 max-w-xs">
          <div className="h-3 overflow-hidden rounded-full bg-white/25">
            <div
              className="h-full rounded-full bg-gold"
              style={{ width: `${Math.round(rank.progress * 100)}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-white/80">{rank.progressLabel}</p>
        </div>

        {mounted && !rank.balanced && (
          <p className="mt-3 rounded-xl bg-white/15 px-3 py-2 text-xs text-white">
            ⚠️ A skill is lagging — balance your training to rank up.
          </p>
        )}
      </section>

      <SkillStats />

      {mounted && reviewLog.length > 0 && (
        <Retention log={reviewLog} />
      )}

      {mounted && revisionCount > 0 && (
        <Link
          href="/dojo/review"
          className="card flex items-center justify-between p-4"
        >
          <span className="font-bold text-ink">
            🔁 {revisionCount} item{revisionCount === 1 ? "" : "s"} to review
          </span>
          <span className="text-sm font-bold text-torii">Review →</span>
        </Link>
      )}
    </div>
  );
}

// Retention: scheduled-review accuracy per day. This is the honest metric —
// streaks/XP say you showed up; this says whether the recalls are holding.
function Retention({
  log,
}: {
  log: { day: string; total: number; correct: number }[];
}) {
  const recent = log.slice(-7);
  const pct = (e: { total: number; correct: number }) =>
    e.total === 0 ? 0 : Math.round((e.correct / e.total) * 100);

  let trend: string | null = null;
  if (recent.length >= 2) {
    const delta = pct(recent[recent.length - 1]) - pct(recent[0]);
    trend =
      delta > 5 ? "↑ improving" : delta < -5 ? "↓ slipping" : "→ steady";
  }

  return (
    <section className="card p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-extrabold text-ink">🧠 Retention</h2>
        {trend && <span className="text-sm font-bold text-muted">{trend}</span>}
      </div>
      <p className="mb-3 text-xs text-muted">
        First-try accuracy in spaced reviews — the real measure of what&apos;s
        sticking.
      </p>
      <div className="flex flex-col gap-1.5">
        {recent.map((e) => (
          <div key={e.day} className="flex items-center gap-2 text-sm">
            <span className="w-24 shrink-0 tabular-nums text-muted">
              {e.day.slice(5)}
            </span>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-gray-100">
              <div
                className={`h-full rounded-full ${
                  pct(e) >= 80 ? "bg-brand" : pct(e) >= 50 ? "bg-gold" : "bg-heart"
                }`}
                style={{ width: `${pct(e)}%` }}
              />
            </div>
            <span className="w-14 shrink-0 text-right font-bold tabular-nums text-ink">
              {pct(e)}%
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
