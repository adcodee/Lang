"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useGameStore } from "@/lib/store/gameStore";
import { matchPool, buildOneMutedBoard } from "@/lib/content/ja/matchBoards";
import { MatchPairs } from "@/components/ExerciseCard";
import { useDrillSession } from "@/components/dojo/useDrillSession";
import SessionHud from "@/components/dojo/SessionHud";
import SessionSummary from "@/components/dojo/SessionSummary";

// Roughly 40% of rounds force a genuine confusion pair (ぬ/め etc.)
// together on the board when one's eligible — LookalikeDrill weights the
// same list at 50%; tuned slightly down here since Quick Match rounds are
// meant to fly by quickly, not linger on any one twin.
const FORCE_CONFUSION_CHANCE = 0.4;
const NEXT_ROUND_DELAY_MS = 900;

// Endless Quick Match: one muted match-pairs board at a time, generated
// fresh from whatever kana the learner has actually been taught — replaces
// 1.1's fixed 3-board session (routed through LessonPlayer) with the same
// "endless, quit when you've had enough" shape every other Dojo drill
// already uses. See matchBoards.ts for the generator this pulls from.
export default function QuickMatchDrill() {
  const completed = useGameStore((s) => s.completedLessons);
  const recordSeen = useGameStore((s) => s.recordSeen);
  const session = useDrillSession("reading");
  const [done, setDone] = useState(false);
  const [roundNo, setRoundNo] = useState(0);

  const pool = useMemo(() => matchPool(completed), [completed]);

  // A fresh board each round — pool.length === 0 pre-hydration (and before
  // u1-vowels is actually learned) means this never invokes Math.random()
  // until real data is in, same pattern as Lookalike/Vowel Sort.
  const board = useMemo(() => {
    if (pool.length === 0) return null;
    return buildOneMutedBoard(pool, Math.random() < FORCE_CONFUSION_CHANCE);
    // Fresh board each round, not just when the pool changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool, roundNo]);

  if (pool.length === 0) {
    return (
      <div className="card p-8 text-center">
        <p className="font-bold">Learn the vowels first, then quick-match away.</p>
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
          setRoundNo((r) => r + 1);
        }}
      />
    );
  }

  if (!board || board.type !== "match-pairs") return null;

  // MatchPairs already keeps every tile disabled once its own `locked`
  // state covers the whole board (see ExerciseCard.tsx) — no need for a
  // separate external `checked` lock here, this just records the round
  // and moves on.
  function handleChecked(correct: boolean) {
    session.record(correct);
    window.setTimeout(() => setRoundNo((r) => r + 1), NEXT_ROUND_DELAY_MS);
  }

  function handleMiss(missed: string, confusedWith?: string) {
    recordSeen(`kana:${missed}`, false);
    if (confusedWith) recordSeen(`kana:${confusedWith}`, false);
  }
  function handleCorrect(kana: string) {
    recordSeen(`kana:${kana}`, true);
  }

  return (
    <div>
      <SessionHud session={session} onQuit={() => setDone(true)} />
      <motion.div
        key={roundNo}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <MatchPairs
          exercise={board}
          checked={false}
          onChecked={handleChecked}
          onFirstTryMiss={handleMiss}
          onFirstTryCorrect={handleCorrect}
        />
      </motion.div>
    </div>
  );
}
