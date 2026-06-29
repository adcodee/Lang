"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useGameStore } from "@/lib/store/gameStore";
import { getRank } from "@/lib/rank";
import SkillStats from "@/components/SkillStats";

export default function RankPage() {
  const xp = useGameStore((s) => s.xp);
  const skillStats = useGameStore((s) => s.skillStats);
  const revisionCount = useGameStore((s) => s.revisionItems.length);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const rank = getRank(mounted ? xp : 0, skillStats);

  return (
    <div className="flex flex-col gap-6">
      <section className="dojo-header rounded-2xl p-6 text-center text-white">
        <div className="text-6xl">{rank.emoji}</div>
        <h1 className="mt-3 text-2xl font-extrabold">{rank.title}</h1>
        <p className="mt-1 text-sm text-white/80">
          {mounted ? xp : 0} XP total
        </p>

        <div className="mx-auto mt-4 max-w-xs">
          <div className="h-3 overflow-hidden rounded-full bg-white/25">
            <div
              className="h-full rounded-full bg-gold"
              style={{ width: `${Math.round(rank.progress * 100)}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-white/80">
            {rank.xpForNext === null
              ? "Max rank reached — legendary."
              : `${rank.xpForNext - rank.xpInto} XP to the next rank`}
          </p>
        </div>

        {mounted && !rank.balanced && (
          <p className="mt-3 rounded-xl bg-white/15 px-3 py-2 text-xs text-white">
            ⚠️ A skill is lagging — balance your training to rank up.
          </p>
        )}
      </section>

      <SkillStats />

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
