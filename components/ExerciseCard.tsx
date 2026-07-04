"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Volume2 } from "lucide-react";
import type { Exercise } from "@/lib/types";
import { speak, matchesSpoken } from "@/lib/speech";
import SpeakInput from "@/components/SpeakInput";

// Renders one exercise and reports the result up via onChecked.
// The parent owns progression + feedback display.
export default function ExerciseCard({
  exercise,
  checked,
  onChecked,
}: {
  exercise: Exercise;
  checked: boolean; // once true, inputs lock until parent advances
  onChecked: (correct: boolean) => void;
}) {
  switch (exercise.type) {
    case "translate-choice":
      return (
        <TranslateChoice exercise={exercise} checked={checked} onChecked={onChecked} />
      );
    case "type-answer":
      return (
        <TypeAnswer exercise={exercise} checked={checked} onChecked={onChecked} />
      );
    case "match-pairs":
      return (
        <MatchPairs exercise={exercise} checked={checked} onChecked={onChecked} />
      );
    case "build-sentence":
      return (
        <BuildSentence exercise={exercise} checked={checked} onChecked={onChecked} />
      );
    case "listen-choice":
      return (
        <ListenChoice exercise={exercise} checked={checked} onChecked={onChecked} />
      );
    case "speak-phrase":
      return (
        <SpeakPhrase exercise={exercise} checked={checked} onChecked={onChecked} />
      );
    case "category-sort":
      return (
        <CategorySort exercise={exercise} checked={checked} onChecked={onChecked} />
      );
  }
}

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, "");
}

// --- translate-choice ------------------------------------------------------
function TranslateChoice({
  exercise,
  checked,
  onChecked,
}: {
  exercise: Extract<Exercise, { type: "translate-choice" }>;
  checked: boolean;
  onChecked: (correct: boolean) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);

  function classFor(option: string): string {
    if (!checked) return selected === option ? "choice choice-selected" : "choice";
    if (option === exercise.answer) return "choice choice-correct";
    if (option === selected) return "choice choice-wrong";
    return "choice opacity-60";
  }

  return (
    <Frame
      prompt={exercise.prompt}
      display={exercise.display}
      canCheck={selected !== null}
      checked={checked}
      onCheck={() => onChecked(selected === exercise.answer)}
    >
      <div className="grid grid-cols-2 gap-3">
        {exercise.options.map((opt) => (
          <button
            key={opt}
            disabled={checked}
            className={classFor(opt)}
            onClick={() => setSelected(opt)}
          >
            {opt}
          </button>
        ))}
      </div>
    </Frame>
  );
}

// --- type-answer -----------------------------------------------------------
function TypeAnswer({
  exercise,
  checked,
  onChecked,
}: {
  exercise: Extract<Exercise, { type: "type-answer" }>;
  checked: boolean;
  onChecked: (correct: boolean) => void;
}) {
  const [value, setValue] = useState("");

  const accepted = useMemo(
    () => [exercise.answer, ...(exercise.accept ?? [])].map(normalize),
    [exercise]
  );

  return (
    <Frame
      prompt={exercise.prompt}
      display={exercise.display}
      canCheck={value.trim().length > 0}
      checked={checked}
      onCheck={() => onChecked(accepted.includes(normalize(value)))}
    >
      <input
        autoFocus
        disabled={checked}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Type your answer…"
        className="w-full rounded-2xl border-2 border-gray-200 px-4 py-3 text-lg outline-none focus:border-sky"
      />
    </Frame>
  );
}

// --- match-pairs -----------------------------------------------------------
function MatchPairs({
  exercise,
  checked,
  onChecked,
}: {
  exercise: Extract<Exercise, { type: "match-pairs" }>;
  checked: boolean;
  onChecked: (correct: boolean) => void;
}) {
  const lefts = exercise.pairs.map((p) => p.left);
  // Shuffle the right column once on mount.
  const rights = useMemo(
    () => shuffle(exercise.pairs.map((p) => p.right)),
    [exercise]
  );

  const [pickLeft, setPickLeft] = useState<string | null>(null);
  const [matches, setMatches] = useState<Record<string, string>>({});

  const correctMap = useMemo(() => {
    const m: Record<string, string> = {};
    exercise.pairs.forEach((p) => (m[p.left] = p.right));
    return m;
  }, [exercise]);

  const matchedRights = new Set(Object.values(matches));
  const allMatched = Object.keys(matches).length === lefts.length;

  function chooseRight(right: string) {
    if (!pickLeft || checked) return;
    setMatches((m) => ({ ...m, [pickLeft]: right }));
    setPickLeft(null);
  }

  function leftClass(left: string): string {
    if (matches[left]) return "choice choice-selected opacity-70";
    return pickLeft === left ? "choice choice-selected" : "choice";
  }

  return (
    <Frame
      prompt={exercise.prompt}
      canCheck={allMatched}
      checked={checked}
      onCheck={() =>
        onChecked(lefts.every((l) => matches[l] === correctMap[l]))
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-3">
          {lefts.map((l) => (
            <button
              key={l}
              disabled={checked || Boolean(matches[l])}
              className={leftClass(l)}
              onClick={() => setPickLeft(l)}
            >
              {l}
              {matches[l] && (
                <span className="ml-2 text-sm text-muted">→ {matches[l]}</span>
              )}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-3">
          {rights.map((r) => (
            <button
              key={r}
              disabled={checked || matchedRights.has(r)}
              className={`choice ${matchedRights.has(r) ? "opacity-40" : ""}`}
              onClick={() => chooseRight(r)}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
    </Frame>
  );
}

// --- build-sentence --------------------------------------------------------
function BuildSentence({
  exercise,
  checked,
  onChecked,
}: {
  exercise: Extract<Exercise, { type: "build-sentence" }>;
  checked: boolean;
  onChecked: (correct: boolean) => void;
}) {
  const pool = useMemo(() => shuffle(exercise.tiles), [exercise]);
  const [built, setBuilt] = useState<number[]>([]); // indices into pool

  const used = new Set(built);

  function addTile(i: number) {
    if (checked || used.has(i)) return;
    setBuilt((b) => [...b, i]);
  }
  function removeTile(pos: number) {
    if (checked) return;
    setBuilt((b) => b.filter((_, idx) => idx !== pos));
  }

  const builtWords = built.map((i) => pool[i]);

  return (
    <Frame
      prompt={exercise.prompt}
      display={exercise.display}
      canCheck={built.length === exercise.tiles.length}
      checked={checked}
      onCheck={() =>
        onChecked(
          JSON.stringify(builtWords) === JSON.stringify(exercise.answer)
        )
      }
    >
      <div className="mb-4 flex min-h-[3.5rem] flex-wrap items-center gap-2 rounded-2xl border-b-2 border-gray-200 p-2">
        {builtWords.map((w, pos) => (
          <button
            key={`${w}-${pos}`}
            disabled={checked}
            onClick={() => removeTile(pos)}
            className="rounded-xl border-2 border-gray-200 bg-white px-3 py-2 font-semibold shadow-[0_2px_0_#e6e0d6]"
          >
            {w}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {pool.map((w, i) => (
          <button
            key={`${w}-${i}`}
            disabled={checked || used.has(i)}
            onClick={() => addTile(i)}
            className={`rounded-xl border-2 border-gray-200 bg-white px-3 py-2 font-semibold shadow-[0_2px_0_#e6e0d6] ${
              used.has(i) ? "opacity-30" : ""
            }`}
          >
            {w}
          </button>
        ))}
      </div>
    </Frame>
  );
}

// --- listen-choice ---------------------------------------------------------
function ListenChoice({
  exercise,
  checked,
  onChecked,
}: {
  exercise: Extract<Exercise, { type: "listen-choice" }>;
  checked: boolean;
  onChecked: (correct: boolean) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [played, setPlayed] = useState(false);

  const play = () => {
    speak(exercise.audio);
    setPlayed(true);
  };

  // Auto-play once when the exercise appears.
  useEffect(() => {
    play();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercise]);

  function classFor(option: string): string {
    if (!checked) return selected === option ? "choice choice-selected" : "choice";
    if (option === exercise.answer) return "choice choice-correct";
    if (option === selected) return "choice choice-wrong";
    return "choice opacity-60";
  }

  return (
    <Frame
      prompt={exercise.prompt}
      canCheck={selected !== null}
      checked={checked}
      onCheck={() => onChecked(selected === exercise.answer)}
    >
      <button
        type="button"
        onClick={play}
        className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-sky text-white shadow-[0_5px_0_#244a40] transition active:translate-y-0.5 active:shadow-[0_2px_0_#244a40]"
        aria-label="Play audio"
      >
        <Volume2 className="h-10 w-10" />
      </button>
      {!played && (
        <p className="mb-4 text-center text-sm text-muted">
          Tap to hear it
        </p>
      )}
      <div className="grid grid-cols-2 gap-3">
        {exercise.options.map((opt) => (
          <button
            key={opt}
            disabled={checked}
            className={classFor(opt)}
            onClick={() => setSelected(opt)}
          >
            {opt}
          </button>
        ))}
      </div>
    </Frame>
  );
}

// --- speak-phrase ----------------------------------------------------------
function SpeakPhrase({
  exercise,
  checked,
  onChecked,
}: {
  exercise: Extract<Exercise, { type: "speak-phrase" }>;
  checked: boolean;
  onChecked: (correct: boolean) => void;
}) {
  const [captured, setCaptured] = useState("");

  const accept = useMemo(
    () => [exercise.romaji ?? "", ...(exercise.accept ?? [])].filter(Boolean),
    [exercise]
  );

  return (
    <Frame
      prompt={exercise.prompt}
      display={exercise.display}
      canCheck={captured.trim().length > 0}
      checked={checked}
      onCheck={() => onChecked(matchesSpoken(captured, exercise.display, accept))}
    >
      {exercise.romaji && (
        <p className="-mt-4 mb-4 text-center text-lg text-muted">
          {exercise.romaji}
        </p>
      )}
      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={() => speak(exercise.display)}
          className="text-sm font-bold text-sky"
        >
          🔊 Hear it first
        </button>

        {!checked && (
          <SpeakInput
            onTranscript={setCaptured}
            idleLabel="Tap and speak"
            hint={exercise.display}
            typedPlaceholder={
              exercise.romaji ? `Type "${exercise.romaji}"` : "Type the romaji…"
            }
          />
        )}
        {captured && (
          <p className="min-h-[1.5rem] text-center text-lg font-semibold">
            {captured}
          </p>
        )}
      </div>
    </Frame>
  );
}

// --- category-sort ---------------------------------------------------------
function CategorySort({
  exercise,
  checked,
  onChecked,
}: {
  exercise: Extract<Exercise, { type: "category-sort" }>;
  checked: boolean;
  onChecked: (correct: boolean) => void;
}) {
  // Present items in a stable shuffled order.
  const items = useMemo(() => shuffle(exercise.items), [exercise]);

  // label -> chosen bucket (undefined = still in the tray).
  const [placement, setPlacement] = useState<Record<string, string | undefined>>(
    {}
  );
  const [selected, setSelected] = useState<string | null>(null);

  const unplaced = items.filter((it) => !placement[it.label]);
  const allPlaced = unplaced.length === 0;

  function placeInto(category: string) {
    if (checked || !selected) return;
    setPlacement((p) => ({ ...p, [selected]: category }));
    setSelected(null);
  }

  function returnToTray(label: string) {
    if (checked) return;
    setPlacement((p) => ({ ...p, [label]: undefined }));
  }

  function tileClass(label: string, inBucket: boolean): string {
    const base =
      "rounded-xl border-2 px-3 py-2 text-center font-semibold shadow-[0_2px_0_#e6e0d6]";
    if (!checked)
      return `${base} ${
        selected === label && !inBucket
          ? "border-sky bg-sky/10"
          : "border-gray-200 bg-white"
      }`;
    if (!inBucket) return `${base} border-gray-200 bg-white`;
    const it = exercise.items.find((i) => i.label === label)!;
    return placement[label] === it.category
      ? `${base} border-brand bg-brand/10 text-brand-dark`
      : `${base} border-heart bg-heart/10 text-heart`;
  }

  return (
    <Frame
      prompt={exercise.prompt}
      canCheck={allPlaced}
      checked={checked}
      onCheck={() =>
        onChecked(
          exercise.items.every((it) => placement[it.label] === it.category)
        )
      }
    >
      {/* Tray of unsorted items */}
      <div className="mb-5 flex min-h-[3.5rem] flex-wrap items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-200 p-3">
        {unplaced.length === 0 ? (
          <span className="text-sm text-muted">All sorted — tap Check</span>
        ) : (
          unplaced.map((it) => (
            <button
              key={it.label}
              disabled={checked}
              onClick={() => setSelected(it.label)}
              className={tileClass(it.label, false)}
            >
              <div>{it.label}</div>
              {it.romaji && (
                <div className="text-xs font-normal text-muted">{it.romaji}</div>
              )}
            </button>
          ))
        )}
      </div>

      {/* Buckets */}
      <div
        className={`grid gap-3 ${
          exercise.categories.length > 2 ? "grid-cols-2" : "grid-cols-2"
        }`}
      >
        {exercise.categories.map((cat) => {
          const parked = items.filter((it) => placement[it.label] === cat);
          return (
            <button
              key={cat}
              type="button"
              disabled={checked || !selected}
              onClick={() => placeInto(cat)}
              className={`flex min-h-[5rem] flex-col gap-2 rounded-2xl border-2 p-3 text-left transition ${
                selected && !checked
                  ? "border-sky bg-sky/5"
                  : "border-gray-200 bg-gray-50"
              }`}
            >
              <span className="text-xs font-extrabold uppercase tracking-wide text-muted">
                {cat}
              </span>
              <div className="flex flex-wrap gap-2">
                {parked.map((it) => (
                  <motion.span
                    key={it.label}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      returnToTray(it.label);
                    }}
                    className={tileClass(it.label, true)}
                  >
                    {it.label}
                  </motion.span>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </Frame>
  );
}

// --- shared frame ----------------------------------------------------------
function Frame({
  prompt,
  display,
  children,
  canCheck,
  checked,
  onCheck,
}: {
  prompt: string;
  display?: string;
  children: React.ReactNode;
  canCheck: boolean;
  checked: boolean;
  onCheck: () => void;
}) {
  return (
    <div className="card p-6">
      <h2 className="text-lg font-extrabold text-ink">{prompt}</h2>
      {display && (
        <div className="my-6 text-center text-5xl font-bold tracking-wide">
          {display}
        </div>
      )}
      <div className={display ? "" : "mt-4"}>{children}</div>
      {!checked && (
        <button
          disabled={!canCheck}
          onClick={onCheck}
          className="btn-brand mt-6 w-full"
        >
          Check
        </button>
      )}
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
