"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Volume2 } from "lucide-react";
import { speak } from "@/lib/speech";
import { useGameStore } from "@/lib/store/gameStore";
import PhraseCard from "@/components/teach/PhraseCard";
import TeachCard from "@/components/teach/TeachCard";
import type { TeachCard as TeachCardData } from "@/lib/types";

const MISSES_BEFORE_RETEACH = 3;

type Mode =
  | "meaning-to-term"
  | "audio-to-meaning"
  | "romaji-to-kana"
  | "kana-to-romaji"
  | "kana-type-romaji" // typed production: see the kana, type its romaji
  | "term-type-reading"; // typed production: see the term, type its reading

interface Question {
  cardIndex: number;
  mode: Mode;
  prompt: string; // shown text (or "" when audio-led)
  audio?: string; // spoken when present
  answer: string;
  options: string[]; // empty for typed questions
  typed?: boolean; // typed production instead of choice chips
  jpOptions: boolean; // option chips are Japanese
  jpPrompt: boolean; // prompt text is Japanese (big)
}

// Case/space-insensitive comparison for typed answers (same rule as the
// lesson players' type-answer grading).
function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, "");
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
  const recordSeen = useGameStore((s) => s.recordSeen);
  const questions = useMemo(() => buildQuestions(cards), [cards]);
  const total = questions.length;

  const [queue, setQueue] = useState<number[]>(() =>
    shuffle(questions.map((_, i) => i))
  );
  const [misses, setMisses] = useState<Record<number, number>>({});
  const [picked, setPicked] = useState<string | null>(null);
  const [entry, setEntry] = useState(""); // typed-question input
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
          <TeachCard card={card} onTraced={noop} />
        )}
        <button
          className="btn-brand mt-6 w-full"
          onClick={() => {
            setMisses((m) => ({ ...m, [reteach]: 0 }));
            setQueue((q) => [...q.filter((c) => c !== reteach), reteach]);
            setReteach(null);
            setPicked(null);
            setEntry("");
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
    const correct = q.typed
      ? normalize(opt) === normalize(q.answer)
      : opt === q.answer;
    onAnswer(correct);
    const card = cards[q.cardIndex];
    recordSeen(
      card.kind === "phrase" ? `vocab:${card.term}` : `kana:${card.char}`,
      correct
    );
    window.setTimeout(() => advance(correct), 1100);
  }

  function submitTyped() {
    const t = entry.trim();
    if (!t || picked) return;
    answer(t);
  }

  function advance(correct: boolean) {
    setPicked(null);
    setEntry("");
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

        {q.typed ? (
          // Typed production: recall the sound and produce it — no chips to
          // recognise from. A miss stays hidden (the item recycles).
          <div className="flex flex-col items-center gap-2">
            <div className="flex w-full max-w-xs items-center gap-2">
              <input
                autoFocus
                value={entry}
                disabled={!!picked}
                onChange={(e) => setEntry(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitTyped()}
                placeholder="Type the romaji…"
                className={`flex-1 rounded-2xl border-2 px-4 py-3 text-lg outline-none ${
                  !picked
                    ? "border-gray-200 focus:border-sky"
                    : normalize(picked) === normalize(q.answer)
                    ? "border-brand bg-brand/10 text-brand-dark"
                    : "border-heart bg-heart/10 text-heart"
                }`}
              />
              <button
                onClick={submitTyped}
                disabled={!entry.trim() || !!picked}
                className="rounded-2xl bg-brand px-4 py-3 font-bold text-white disabled:opacity-50"
              >
                ✓
              </button>
            </div>
            {picked && (
              <p
                className={`text-sm font-bold ${
                  normalize(picked) === normalize(q.answer)
                    ? "text-brand-dark"
                    : "text-heart"
                }`}
              >
                {normalize(picked) === normalize(q.answer)
                  ? "✓ Nice recall!"
                  : "✗ Not quite — it'll come back around."}
              </p>
            )}
          </div>
        ) : (
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
        )}
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
    case "kana-type-romaji":
      return "Type the sound this makes";
    case "term-type-reading":
      return "Type the reading (romaji)";
  }
}

function buildQuestions(cards: TeachCardData[]): Question[] {
  const terms = cards.filter((c) => c.kind === "phrase").map((c) => (c as { term: string }).term);
  const meanings = cards.filter((c) => c.kind === "phrase").map((c) => (c as { meaning: string }).meaning);
  const chars = cards.filter((c) => c.kind !== "phrase").map((c) => (c as { char: string }).char);
  const romaji = cards.filter((c) => c.kind !== "phrase").map((c) => (c as { romaji: string }).romaji);

  const out: Question[] = [];
  // Cycle three formats per kind — recognition, audio/reverse recognition,
  // typed production — so a review interleaves formats instead of blocking.
  cards.forEach((c, i) => {
    let q: Question | null = null;
    if (c.kind === "phrase") {
      const variant = i % 3;
      if (variant === 2 && c.reading) {
        q = {
          cardIndex: i, mode: "term-type-reading", prompt: c.term, answer: c.reading,
          options: [], typed: true, jpOptions: false, jpPrompt: true,
        };
      } else if (variant === 1) {
        q = {
          cardIndex: i, mode: "audio-to-meaning", prompt: "", audio: c.term, answer: c.meaning,
          options: opts(c.meaning, meanings), jpOptions: false, jpPrompt: false,
        };
      } else {
        q = {
          cardIndex: i, mode: "meaning-to-term", prompt: c.meaning, answer: c.term,
          options: opts(c.term, terms), jpOptions: true, jpPrompt: false,
        };
      }
    } else {
      const variant = i % 3;
      // Typed production only for real romaji — silent marks (っ/ー carry
      // labels like "(pause)") can't be "typed", so they fall back to choice.
      const typable = /^[a-z]+$/.test(c.romaji);
      if (variant === 2 && typable) {
        q = {
          cardIndex: i, mode: "kana-type-romaji", prompt: c.char, answer: c.romaji,
          options: [], typed: true, jpOptions: false, jpPrompt: true,
        };
      } else if (variant === 1 || (variant === 2 && !typable)) {
        q = {
          cardIndex: i, mode: "kana-to-romaji", prompt: c.char, answer: c.romaji,
          options: opts(c.romaji, romaji), jpOptions: false, jpPrompt: true,
        };
      } else {
        q = {
          cardIndex: i, mode: "romaji-to-kana", prompt: c.romaji, answer: c.char,
          options: opts(c.char, chars), jpOptions: true, jpPrompt: false,
        };
      }
    }
    if (q && (q.typed || q.options.length >= 2)) out.push(q);
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
