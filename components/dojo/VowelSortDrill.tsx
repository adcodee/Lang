"use client";

import { useCallback, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Volume2, Lightbulb } from "lucide-react";
import { speak } from "@/lib/speech";
import { useGameStore } from "@/lib/store/gameStore";
import { learnedKana, kanaRowProgress } from "@/lib/content/kana";
import { useDrillSession } from "@/components/dojo/useDrillSession";
import SessionHud from "@/components/dojo/SessionHud";
import SessionSummary from "@/components/dojo/SessionSummary";

// The five vowel buckets, in grid order. Every kana belongs to exactly one by
// the vowel its sound ends on (し→i, つ→u, を→o), except ん (no vowel).
const VOWELS = [
  { v: "a", kana: "あ" },
  { v: "i", kana: "い" },
  { v: "u", kana: "う" },
  { v: "e", kana: "え" },
  { v: "o", kana: "お" },
] as const;

const VOWEL_KANA: Record<string, string> = {
  a: "あ",
  i: "い",
  u: "う",
  e: "え",
  o: "お",
};

const MAX_ITEMS = 8; // keep each round small (spec: 5–8)

interface SortItem {
  char: string;
  romaji: string;
  vowel: string;
}

// The vowel a kana's reading ends on — its column in the kana grid. Returns
// null for ん (romaji "n"), which has no vowel and is left out of the drill.
function vowelOf(romaji: string): string | null {
  const last = romaji[romaji.length - 1];
  return "aiueo".includes(last) ? last : null;
}

// Progressive Vowel Sort: sort each unlocked kana into its vowel column.
// Unlocks after the vowels lesson (5 items) and grows one row at a time as
// later row lessons are completed — always drawing only from learned kana.
export default function VowelSortDrill() {
  const completed = useGameStore((s) => s.completedLessons);
  const recordSeen = useGameStore((s) => s.recordSeen);
  // Vowel structure is read off the kana — this trains reading, not the ear.
  const session = useDrillSession("reading");
  const [done, setDone] = useState(false);
  const [round, setRound] = useState(0);

  // Every learned kana that has a vowel (drops ん).
  const pool = useMemo<SortItem[]>(() => {
    return learnedKana(completed)
      .map((k) => ({ char: k.char, romaji: k.romaji, vowel: vowelOf(k.romaji) }))
      .filter((it): it is SortItem => it.vowel !== null);
  }, [completed]);

  const rowProgress = useMemo(() => kanaRowProgress(completed), [completed]);

  // A fresh small board each round.
  const board = useMemo(
    () => shuffle(pool).slice(0, Math.min(MAX_ITEMS, pool.length)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pool, round]
  );

  const [selected, setSelected] = useState<string | null>(null);
  const [placed, setPlaced] = useState<Record<string, string>>({}); // char → vowel
  const [attempted, setAttempted] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<string | null>(null);
  const [wrong, setWrong] = useState<string | null>(null); // char flashing red

  const advance = useCallback(() => {
    setSelected(null);
    setPlaced({});
    setAttempted(new Set());
    setFeedback(null);
    setWrong(null);
    setRound((r) => r + 1);
  }, []);

  if (pool.length === 0) {
    return (
      <div className="card p-8 text-center">
        <p className="font-bold">Complete the vowels lesson first, then sort by sound.</p>
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
          advance();
        }}
      />
    );
  }

  function tapItem(char: string) {
    if (placed[char]) return;
    setSelected(char);
    setFeedback(null);
    speak(char);
  }

  function placeInto(vowel: string) {
    if (!selected) return;
    const item = board.find((b) => b.char === selected);
    if (!item) return;
    const correct = item.vowel === vowel;

    // Score only the first attempt on each item, so accuracy stays honest.
    if (!attempted.has(item.char)) {
      session.record(correct);
      recordSeen(`kana:${item.char}`, correct);
      setAttempted((a) => new Set(a).add(item.char));
    }

    if (correct) {
      setPlaced((p) => ({ ...p, [item.char]: vowel }));
      setSelected(null);
      setFeedback(`✓ ${item.char} is the “${item.vowel}” sound.`);
      speak(item.char);
      // Round cleared?
      const nextPlacedCount = Object.keys(placed).length + 1;
      if (nextPlacedCount === board.length) {
        window.setTimeout(advance, 1000);
      }
    } else {
      // Educational miss: name the vowel it actually carries, replay it.
      setWrong(item.char);
      setFeedback(
        `${item.char} carries the “${item.vowel}” sound (like ${VOWEL_KANA[item.vowel]}), so it goes in the ${VOWEL_KANA[item.vowel]}-row.`
      );
      setSelected(null);
      speak(item.char);
      window.setTimeout(() => setWrong((w) => (w === item.char ? null : w)), 600);
    }
  }

  function hint() {
    // "Listen to each sound first" — play the still-unplaced tray items in turn.
    const tray = board.filter((b) => !placed[b.char]);
    tray.forEach((it, i) => window.setTimeout(() => speak(it.char), i * 750));
  }

  const tray = board.filter((b) => !placed[b.char]);

  return (
    <div>
      <SessionHud session={session} onQuit={() => setDone(true)} />

      <div className="mb-3 text-center">
        <h2 className="text-lg font-extrabold text-ink">Vowel Row Sort</h2>
        <p className="text-sm text-muted">
          Tap a kana to hear it, then drop it in its vowel column.
        </p>
        <p className="mt-1 text-xs font-bold uppercase tracking-wide text-brand-dark">
          {rowProgress.unlocked}/{rowProgress.total} rows unlocked
        </p>
      </div>

      <motion.div
        key={round}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="card p-5"
      >
        {/* Tray */}
        <div className="mb-4 flex min-h-[4rem] flex-wrap items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-200 p-3">
          {tray.length === 0 ? (
            <span className="text-sm text-muted">All sorted — nice! 🎉</span>
          ) : (
            tray.map((it) => (
              <button
                key={it.char}
                onClick={() => tapItem(it.char)}
                className={`flex flex-col items-center rounded-xl border-2 px-3 py-2 font-jp text-2xl shadow-[0_2px_0_#e6e0d6] transition ${
                  wrong === it.char
                    ? "border-heart bg-heart/10 text-heart"
                    : selected === it.char
                    ? "border-sky bg-sky/10 text-sky"
                    : "border-gray-200 bg-white text-sumi"
                }`}
              >
                <span>{it.char}</span>
                <Volume2 className="mt-0.5 h-3 w-3 text-muted" />
              </button>
            ))
          )}
        </div>

        {/* Vowel buckets */}
        <div className="grid grid-cols-5 gap-2">
          {VOWELS.map(({ v, kana }) => {
            const parked = board.filter((b) => placed[b.char] === v);
            return (
              <button
                key={v}
                type="button"
                disabled={!selected}
                onClick={() => placeInto(v)}
                className={`flex min-h-[5.5rem] flex-col items-center gap-1 rounded-2xl border-2 p-2 transition ${
                  selected
                    ? "border-sky bg-sky/5"
                    : "border-gray-200 bg-gray-50"
                }`}
              >
                <span className="font-jp text-lg font-bold text-ink">{kana}</span>
                <span className="text-[10px] font-extrabold uppercase text-muted">
                  {v}
                </span>
                <div className="flex flex-wrap justify-center gap-1">
                  {parked.map((it) => (
                    <motion.span
                      key={it.char}
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="rounded-lg border-2 border-brand bg-brand/10 px-1.5 py-0.5 font-jp text-base text-brand-dark"
                    >
                      {it.char}
                    </motion.span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        {/* Feedback + hint */}
        <div className="mt-4 flex min-h-[2.5rem] items-center justify-between gap-3">
          <p
            className={`flex-1 text-sm font-bold ${
              feedback?.startsWith("✓") ? "text-brand-dark" : "text-heart"
            }`}
          >
            {feedback}
          </p>
          <button
            onClick={hint}
            className="flex shrink-0 items-center gap-1 rounded-full border-2 border-gray-200 px-3 py-1.5 text-xs font-bold text-muted hover:text-ink"
          >
            <Lightbulb className="h-3.5 w-3.5" /> Listen first
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
