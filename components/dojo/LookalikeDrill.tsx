"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Volume2 } from "lucide-react";
import { speak } from "@/lib/speech";
import { useGameStore } from "@/lib/store/gameStore";
import {
  learnedLookalikePairs,
  kanaByChar,
  type LookalikePair,
} from "@/lib/content/kana";
import { useDrillSession } from "@/components/dojo/useDrillSession";
import SessionHud from "@/components/dojo/SessionHud";
import SessionSummary from "@/components/dojo/SessionSummary";

interface Round {
  pair: LookalikePair;
  target: string; // the kana being asked for
  options: [string, string]; // left/right order (shuffled)
}

// Endless lookalike drill: two near-twin kana side by side, one sound + romaji
// — pick the kana that matches. Pool grows as rows are learned; each answer
// feeds the listening stat and the SRS schedule for the target kana.
export default function LookalikeDrill() {
  const completed = useGameStore((s) => s.completedLessons);
  const recordSeen = useGameStore((s) => s.recordSeen);
  const session = useDrillSession("listening");
  const [done, setDone] = useState(false);
  const [roundNo, setRoundNo] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);

  const pool = useMemo(() => learnedLookalikePairs(completed), [completed]);

  const round = useMemo<Round | null>(() => {
    if (pool.length === 0) return null;
    const pair = pool[Math.floor(Math.random() * pool.length)];
    const target = Math.random() < 0.5 ? pair.a : pair.b;
    const options: [string, string] =
      Math.random() < 0.5 ? [pair.a, pair.b] : [pair.b, pair.a];
    return { pair, target, options };
    // Fresh round each advance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool, roundNo]);

  if (pool.length === 0) {
    return (
      <div className="card p-8 text-center">
        <p className="font-bold">
          Learn the vowels first — the twins show up soon enough.
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
          setPicked(null);
          setRoundNo((r) => r + 1);
        }}
      />
    );
  }

  if (!round) return null;
  const targetKana = kanaByChar(round.target);

  function choose(char: string) {
    if (picked || !round) return;
    setPicked(char);
    const correct = char === round.target;
    session.record(correct);
    recordSeen(`kana:${round.target}`, correct);
    speak(round.target);
    window.setTimeout(
      () => {
        setPicked(null);
        setRoundNo((r) => r + 1);
      },
      correct ? 900 : 2000 // linger on a miss so the tells sink in
    );
  }

  function tellFor(char: string): string {
    return char === round!.pair.a ? round!.pair.tellA : round!.pair.tellB;
  }

  function optionClass(char: string): string {
    const base =
      "flex flex-col items-center gap-1 rounded-2xl border-2 p-6 transition";
    if (!picked) return `${base} border-gray-200 bg-white hover:border-sky`;
    if (char === round!.target)
      return `${base} border-brand bg-brand/10`;
    if (char === picked) return `${base} border-heart bg-heart/10`;
    return `${base} border-gray-200 bg-white opacity-60`;
  }

  return (
    <div>
      <SessionHud session={session} onQuit={() => setDone(true)} />

      <motion.div
        key={roundNo}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="card flex flex-col items-center gap-5 p-6"
      >
        <div className="text-center">
          <div className="text-sm font-bold uppercase tracking-wide text-muted">
            Which one is…
          </div>
          <div className="mt-1 text-4xl font-extrabold text-ink">
            {targetKana?.romaji ?? round.target}
          </div>
          <button
            onClick={() => speak(round.target)}
            className="mx-auto mt-2 flex h-11 w-11 items-center justify-center rounded-full bg-sky text-white shadow-[0_3px_0_#244a40]"
            aria-label="Play the sound"
          >
            <Volume2 className="h-5 w-5" />
          </button>
        </div>

        <div className="grid w-full max-w-xs grid-cols-2 gap-4">
          {round.options.map((char) => (
            <button
              key={char}
              disabled={!!picked}
              onClick={() => choose(char)}
              className={optionClass(char)}
            >
              <span className="font-jp text-6xl text-sumi">{char}</span>
              {/* The visual tell appears once answered — corrective feedback. */}
              {picked && (
                <span className="text-xs text-muted">
                  {kanaByChar(char)?.romaji} — {tellFor(char)}
                </span>
              )}
            </button>
          ))}
        </div>

        <p className="min-h-[1.25rem] text-sm font-bold">
          {picked &&
            (picked === round.target ? (
              <span className="text-brand-dark">✓ Sharp eye!</span>
            ) : (
              <span className="text-heart">✗ These two are twins — check the tells.</span>
            ))}
        </p>
      </motion.div>
    </div>
  );
}
