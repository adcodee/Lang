"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Volume2 } from "lucide-react";
import { speak } from "@/lib/speech";
import PhraseCard from "@/components/teach/PhraseCard";
import TeachCard from "@/components/teach/TeachCard";
import type { TeachCard as TeachCardData } from "@/lib/types";

const MISSES_BEFORE_RETEACH = 3;

type Mode =
  | "meaning-to-term"
  | "audio-to-meaning"
  | "romaji-to-kana"
  | "kana-to-romaji";

interface Question {
  cardIndex: number;
  mode: Mode;
  prompt: string; // shown text (or "" when audio-led)
  audio?: string; // spoken when present
  answer: string;
  options: string[];
  jpOptions: boolean; // option chips are Japanese
  jpPrompt: boolean; // prompt text is Japanese (big)
}

// Short active-recall round auto-generated from the just-taught cards. Missed
// items repeat until correct; missing the same item 3× re-shows its teach card.
export default function RecallRound({
  cards,
  onDone,
  onAnswer,
}: {
  cards: TeachCardData[];
  onDone: () => void;
  onAnswer: (correct: boolean) => void;
}) {
  const questions = useMemo(() => buildQuestions(cards), [cards]);
  const total = questions.length;

  const [queue, setQueue] = useState<number[]>(() =>
    shuffle(questions.map((_, i) => i))
  );
  const [misses, setMisses] = useState<Record<number, number>>({});
  const [picked, setPicked] = useState<string | null>(null);
  const [reteach, setReteach] = useState<number | null>(null);
  const [mastered, setMastered] = useState(0);

  // Nothing to quiz (too few distractors) — skip straight through.
  useEffect(() => {
    if (total === 0) onDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total]);

  if (total === 0) return null;

  if (reteach !== null) {
    const card = cards[reteach];
    return (
      <div>
        <p className="mb-3 text-center text-sm font-bold text-muted">
          Let&apos;s go over this one again 👇
        </p>
        {card.kind === "phrase" ? (
          <PhraseCard card={card} onSpeakAttempt={noop} onTraced={noop} onCheck={noop} />
        ) : (
          <TeachCard card={card} onSpeakAttempt={noop} onTraced={noop} />
        )}
        <button
          className="btn-brand mt-6 w-full"
          onClick={() => {
            setMisses((m) => ({ ...m, [reteach]: 0 }));
            setQueue((q) => [...q.filter((c) => c !== reteach), reteach]);
            setReteach(null);
            setPicked(null);
          }}
        >
          Got it — try again
        </button>
      </div>
    );
  }

  const cardIndex = queue[0];
  const q = questions[cardIndex];

  function answer(opt: string) {
    if (picked) return;
    setPicked(opt);
    const correct = opt === q.answer;
    onAnswer(correct);
    window.setTimeout(() => advance(correct), 1100);
  }

  function advance(correct: boolean) {
    setPicked(null);
    if (correct) {
      const nextMastered = mastered + 1;
      setMastered(nextMastered);
      setQueue((qq) => qq.slice(1));
      if (nextMastered >= total) onDone();
      return;
    }
    const nextMiss = (misses[cardIndex] ?? 0) + 1;
    setMisses((m) => ({ ...m, [cardIndex]: nextMiss }));
    if (nextMiss >= MISSES_BEFORE_RETEACH) {
      setReteach(cardIndex);
    } else {
      // Rotate the missed item to the back so it recurs later.
      setQueue((qq) => [...qq.slice(1), qq[0]]);
    }
  }

  function optionClass(opt: string): string {
    const base = "rounded-xl border-2 px-4 py-3 font-bold";
    const jp = q.jpOptions ? "font-jp text-xl" : "";
    if (!picked)
      return `${base} border-gray-200 bg-white ${q.jpOptions ? "font-jp text-xl" : "text-ink"}`;
    const gotItRight = picked === q.answer;
    // Only reveal the correct answer when the learner actually picked it — a
    // wrong pick just goes red, so they still have to recall it (it repeats).
    if (opt === picked)
      return gotItRight
        ? `${base} border-brand bg-brand/10 text-brand-dark ${jp}`
        : `${base} border-heart bg-heart/10 text-heart ${jp}`;
    return `${base} border-gray-200 bg-white opacity-60 ${jp}`;
  }

  return (
    <div>
      <div className="mb-4 text-center">
        <div className="text-sm font-extrabold uppercase tracking-wide text-muted">
          Quick recall — lock it in
        </div>
        <div className="text-xs text-muted">
          mastered {mastered}/{total}
        </div>
      </div>

      <motion.div
        key={`${cardIndex}-${mastered}-${queue.length}`}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="card p-6"
      >
        <p className="mb-4 text-center text-sm font-bold text-ink">
          {promptLabel(q.mode)}
        </p>

        {q.mode === "audio-to-meaning" ? (
          <button
            onClick={() => speak(q.audio!)}
            className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-sky text-white shadow-[0_4px_0_#244a40]"
            aria-label="Play audio"
          >
            <Volume2 className="h-7 w-7" />
          </button>
        ) : (
          <div
            className={`mb-5 text-center ${
              q.jpPrompt ? "font-jp text-5xl text-sumi" : "text-2xl font-extrabold text-ink"
            }`}
          >
            {q.prompt}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {q.options.map((opt) => (
            <button
              key={opt}
              disabled={!!picked}
              onClick={() => answer(opt)}
              className={optionClass(opt)}
            >
              {opt}
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

function promptLabel(mode: Mode): string {
  switch (mode) {
    case "meaning-to-term":
      return "Which one means this?";
    case "audio-to-meaning":
      return "What did you hear?";
    case "romaji-to-kana":
      return "Which kana makes this sound?";
    case "kana-to-romaji":
      return "What sound is this?";
  }
}

function buildQuestions(cards: TeachCardData[]): Question[] {
  const terms = cards.filter((c) => c.kind === "phrase").map((c) => (c as { term: string }).term);
  const meanings = cards.filter((c) => c.kind === "phrase").map((c) => (c as { meaning: string }).meaning);
  const chars = cards.filter((c) => c.kind !== "phrase").map((c) => (c as { char: string }).char);
  const romaji = cards.filter((c) => c.kind !== "phrase").map((c) => (c as { romaji: string }).romaji);

  const out: Question[] = [];
  cards.forEach((c, i) => {
    let q: Question | null = null;
    if (c.kind === "phrase") {
      if (i % 2 === 0) {
        q = {
          cardIndex: i, mode: "meaning-to-term", prompt: c.meaning, answer: c.term,
          options: opts(c.term, terms), jpOptions: true, jpPrompt: false,
        };
      } else {
        q = {
          cardIndex: i, mode: "audio-to-meaning", prompt: "", audio: c.term, answer: c.meaning,
          options: opts(c.meaning, meanings), jpOptions: false, jpPrompt: false,
        };
      }
    } else {
      if (i % 2 === 0) {
        q = {
          cardIndex: i, mode: "romaji-to-kana", prompt: c.romaji, answer: c.char,
          options: opts(c.char, chars), jpOptions: true, jpPrompt: false,
        };
      } else {
        q = {
          cardIndex: i, mode: "kana-to-romaji", prompt: c.char, answer: c.romaji,
          options: opts(c.romaji, romaji), jpOptions: false, jpPrompt: true,
        };
      }
    }
    if (q && q.options.length >= 2) out.push(q);
  });
  return out;
}

function opts(answer: string, pool: string[]): string[] {
  const distractors = shuffle([...new Set(pool)].filter((v) => v !== answer)).slice(0, 3);
  return shuffle([answer, ...distractors]);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function noop() {}
