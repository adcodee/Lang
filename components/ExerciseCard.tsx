"use client";

import { useMemo, useState } from "react";
import type { Exercise } from "@/lib/types";

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
            className="rounded-xl border-2 border-gray-200 bg-white px-3 py-2 font-semibold shadow-[0_2px_0_#e5e5e5]"
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
            className={`rounded-xl border-2 border-gray-200 bg-white px-3 py-2 font-semibold shadow-[0_2px_0_#e5e5e5] ${
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
