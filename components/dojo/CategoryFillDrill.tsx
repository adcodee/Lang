"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useGameStore } from "@/lib/store/gameStore";
import { learnedKanaRows } from "@/lib/content/kana";
import { learnedVocabGroups } from "@/lib/content/vocab";
import { useDrillSession } from "@/components/dojo/useDrillSession";
import SessionHud from "@/components/dojo/SessionHud";
import SessionSummary from "@/components/dojo/SessionSummary";
import CategoryBoard, { type BoardItem } from "@/components/dojo/CategoryBoard";

interface Group {
  category: string;
  items: { label: string; sub?: string; srs: string }[];
}

// Endless sorting drill: each round builds a fresh board from the groups the
// learner has unlocked (kana rows + word groups), grading per item.
export default function CategoryFillDrill() {
  const completed = useGameStore((s) => s.completedLessons);
  const recordSeen = useGameStore((s) => s.recordSeen);
  const session = useDrillSession("writing");
  const [done, setDone] = useState(false);
  const [round, setRound] = useState(0);

  const groups = useMemo<Group[]>(() => {
    const out: Group[] = [];
    const rows = learnedKanaRows(completed);
    for (const [category, ks] of Object.entries(rows)) {
      out.push({
        category,
        items: ks.map((k) => ({ label: k.char, sub: k.romaji, srs: `kana:${k.char}` })),
      });
    }
    const wordGroups = learnedVocabGroups(completed);
    for (const [category, vs] of Object.entries(wordGroups)) {
      out.push({
        category,
        items: vs.map((v) => ({ label: v.word, sub: v.gloss, srs: `vocab:${v.word}` })),
      });
    }
    return out;
  }, [completed]);

  const board = useMemo(
    () => buildBoard(groups),
    // New board each round.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [groups, round]
  );

  if (groups.length < 2 || !board) {
    return (
      <div className="card p-8 text-center">
        <p className="font-bold">
          Learn at least two groups (e.g. vowels and the k-row) to sort.
        </p>
      </div>
    );
  }

  if (done) {
    return (
      <SessionSummary
        session={session}
        onAgain={() => {
          session.reset();
          setDone(false);
          setRound((r) => r + 1);
        }}
      />
    );
  }

  function handleResult(results: boolean[]) {
    results.forEach((ok, i) => {
      session.record(ok);
      const srs = board!.items[i]?.srs;
      if (srs) recordSeen(srs, ok);
    });
    window.setTimeout(() => setRound((r) => r + 1), 1100);
  }

  return (
    <div>
      <SessionHud session={session} onQuit={() => setDone(true)} />
      <motion.div
        key={round}
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <CategoryBoard
          items={board.items}
          categories={board.categories}
          onResult={handleResult}
        />
      </motion.div>
    </div>
  );
}

function buildBoard(
  groups: Group[]
): { items: BoardItem[]; categories: string[] } | null {
  if (groups.length < 2) return null;
  const chosen = shuffle(groups).slice(0, Math.min(3, groups.length));
  const items: BoardItem[] = [];
  for (const g of chosen) {
    const perGroup = 2 + (Math.random() < 0.5 ? 0 : 1); // 2–3
    for (const it of shuffle(g.items).slice(0, perGroup)) {
      items.push({ label: it.label, sub: it.sub, category: g.category, srs: it.srs });
    }
  }
  return { items: shuffle(items), categories: chosen.map((g) => g.category) };
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
