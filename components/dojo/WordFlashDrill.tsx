"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Volume2 } from "lucide-react";
import { speak } from "@/lib/speech";
import { useGameStore } from "@/lib/store/gameStore";
import { learnedVocab, type Vocab } from "@/lib/content/vocab";
import { useDrillSession } from "@/components/dojo/useDrillSession";
import SessionHud from "@/components/dojo/SessionHud";
import SessionSummary from "@/components/dojo/SessionSummary";

interface Round {
  word: Vocab;
  options: string[]; // shuffled glosses (incl. the answer)
}

// Endless reading drill: a learned word in kana, four meanings — read it and
// pick. Pure script-to-meaning, no romaji shown until you've answered. Feeds
// the reading stat and the word's SRS schedule.
export default function WordFlashDrill() {
  const completed = useGameStore((s) => s.completedLessons);
  const recordSeen = useGameStore((s) => s.recordSeen);
  const session = useDrillSession("reading");
  const [done, setDone] = useState(false);
  const [roundNo, setRoundNo] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);

  const pool = useMemo(() => learnedVocab(completed), [completed]);

  const round = useMemo<Round | null>(() => {
    if (pool.length < 2) return null;
    const word = pool[Math.floor(Math.random() * pool.length)];
    const distractors = shuffle(
      pool.filter((v) => v.word !== word.word).map((v) => v.gloss)
    ).slice(0, 3);
    return { word, options: shuffle([word.gloss, ...distractors]) };
    // Fresh round each advance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool, roundNo]);

  if (pool.length < 2) {
    return (
      <div className="card p-8 text-center">
        <p className="font-bold">
          Learn some words first (greetings unlock this), then come back to read.
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

  function choose(gloss: string) {
    if (picked || !round) return;
    setPicked(gloss);
    const correct = gloss === round.word.gloss;
    session.record(correct);
    recordSeen(`vocab:${round.word.word}`, correct);
    speak(round.word.word);
    window.setTimeout(
      () => {
        setPicked(null);
        setRoundNo((r) => r + 1);
      },
      correct ? 900 : 2000 // linger on a miss so the word sinks in
    );
  }

  function optionClass(gloss: string): string {
    if (!picked) return "choice";
    if (gloss === round!.word.gloss) return "choice choice-correct";
    if (gloss === picked) return "choice choice-wrong";
    return "choice opacity-60";
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
            Read it — what does it mean?
          </div>
          <div className="mt-2 font-jp text-5xl text-sumi">{round.word.word}</div>
          {/* Reading revealed only after the answer — no romaji crutch. */}
          {picked && (
            <button
              onClick={() => speak(round.word.word)}
              className="mx-auto mt-2 flex items-center gap-1 text-sm font-bold text-sky"
            >
              <Volume2 className="h-4 w-4" /> {glossReading(round.word)}
            </button>
          )}
        </div>

        <div className="grid w-full grid-cols-2 gap-3">
          {round.options.map((gloss) => (
            <button
              key={gloss}
              disabled={!!picked}
              onClick={() => choose(gloss)}
              className={optionClass(gloss)}
            >
              {gloss}
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

// vocab.ts doesn't carry readings; the kana word *is* the reading — spoken via
// TTS. Shown label is the word itself for the replay button.
function glossReading(v: Vocab): string {
  return v.word;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
