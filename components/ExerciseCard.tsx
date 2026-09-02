"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  revealAnswer = true,
}: {
  exercise: Exercise;
  checked: boolean; // once true, inputs lock until parent advances
  onChecked: (correct: boolean) => void;
  // When false (a retry is coming), a wrong pick shows red but the correct
  // option is NOT highlighted — otherwise the retry answers itself.
  revealAnswer?: boolean;
}) {
  switch (exercise.type) {
    case "translate-choice":
      return (
        <TranslateChoice
          exercise={exercise}
          checked={checked}
          onChecked={onChecked}
          revealAnswer={revealAnswer}
        />
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
        <ListenChoice
          exercise={exercise}
          checked={checked}
          onChecked={onChecked}
          revealAnswer={revealAnswer}
        />
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
  revealAnswer = true,
}: {
  exercise: Extract<Exercise, { type: "translate-choice" }>;
  checked: boolean;
  onChecked: (correct: boolean) => void;
  revealAnswer?: boolean;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  // Shuffle once on mount so the answer isn't always in the same slot.
  const options = useMemo(() => shuffle(exercise.options), [exercise]);

  function classFor(option: string): string {
    if (!checked) return selected === option ? "choice choice-selected" : "choice";
    // The pick always shows its own result; the correct option is only
    // revealed when no retry follows (otherwise the retry answers itself).
    if (option === selected)
      return option === exercise.answer ? "choice choice-correct" : "choice choice-wrong";
    if (revealAnswer && option === exercise.answer) return "choice choice-correct";
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
        {options.map((opt) => (
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
// A real pair-matching drill, not "tap left then right then Check": either
// column can start a pick, a correct pair locks in place immediately, a
// wrong pair flashes and un-picks without failing the rest of the board.
// Scored per pair (first-try correct vs total), reported automatically via
// onChecked the instant every pair is locked — there's no Check button for
// this exercise type (see Frame's hideCheck).
function MatchPairs({
  exercise,
  checked,
  onChecked,
}: {
  exercise: Extract<Exercise, { type: "match-pairs" }>;
  checked: boolean;
  onChecked: (correct: boolean) => void;
}) {
  const correctMap = useMemo(() => {
    const m: Record<string, string> = {};
    exercise.pairs.forEach((p) => (m[p.left] = p.right));
    return m;
  }, [exercise]);

  // Shuffle both columns independently, re-dealing if any row's left/right
  // happen to land on the same row as their real pair — a free answer.
  const [lefts, rights] = useMemo(() => {
    const solutionLefts = exercise.pairs.map((p) => p.left);
    const solutionRights = exercise.pairs.map((p) => p.right);
    if (solutionLefts.length < 2) return [solutionLefts, solutionRights];
    let L = shuffle(solutionLefts);
    let R = shuffle(solutionRights);
    let guard = 0;
    while (guard++ < 30 && L.some((l, i) => correctMap[l] === R[i])) {
      L = shuffle(solutionLefts);
      R = shuffle(solutionRights);
    }
    return [L, R];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercise]);

  const pairCount = exercise.pairs.length;
  const [locked, setLocked] = useState<Record<string, string>>({}); // left -> right, correct only
  const [pending, setPending] = useState<{ side: "left" | "right"; value: string } | null>(null);
  const [wrongFlash, setWrongFlash] = useState<{ left: string; right: string } | null>(null);
  // Per-left-item "was the first ever attempt correct" — the per-pair score,
  // not a re-render-driving state (retapping after a miss must not change it).
  const attempted = useRef<Set<string>>(new Set());
  const firstTryCorrect = useRef(0);

  const lockedRights = new Set(Object.values(locked));
  const allLocked = Object.keys(locked).length === pairCount;

  // Fires exactly once, the instant the last pair locks — allLocked only
  // ever transitions false -> true (locked never shrinks).
  useEffect(() => {
    if (allLocked && pairCount > 0) {
      onChecked(firstTryCorrect.current === pairCount);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allLocked]);

  function tap(side: "left" | "right", value: string) {
    if (checked || wrongFlash) return;
    if (side === "left" && locked[value]) return;
    if (side === "right" && lockedRights.has(value)) return;

    if (!pending) {
      setPending({ side, value });
      return;
    }
    if (pending.side === side) {
      setPending({ side, value }); // second tap on the same column replaces the pick
      return;
    }

    const leftVal = side === "left" ? value : pending.value;
    const rightVal = side === "right" ? value : pending.value;
    const isCorrect = correctMap[leftVal] === rightVal;

    if (!attempted.current.has(leftVal)) {
      attempted.current.add(leftVal);
      if (isCorrect) firstTryCorrect.current += 1;
    }

    if (isCorrect) {
      setLocked((m) => ({ ...m, [leftVal]: rightVal }));
      setPending(null);
    } else {
      setWrongFlash({ left: leftVal, right: rightVal });
      setPending(null);
      window.setTimeout(() => setWrongFlash(null), 450);
    }
  }

  function tileClass(side: "left" | "right", value: string): string {
    const isLocked = side === "left" ? Boolean(locked[value]) : lockedRights.has(value);
    if (isLocked) return "choice choice-correct opacity-70";
    if (wrongFlash && (side === "left" ? wrongFlash.left === value : wrongFlash.right === value)) {
      return "choice choice-wrong";
    }
    if (pending?.side === side && pending.value === value) return "choice choice-selected";
    return "choice";
  }

  return (
    <Frame prompt={exercise.prompt} canCheck={false} checked={checked} onCheck={() => {}} hideCheck>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-3">
          {lefts.map((l) => (
            <button
              key={l}
              disabled={checked || Boolean(locked[l])}
              className={tileClass("left", l)}
              onClick={() => tap("left", l)}
            >
              {l}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-3">
          {rights.map((r) => (
            <button
              key={r}
              disabled={checked || lockedRights.has(r)}
              className={tileClass("right", r)}
              onClick={() => tap("right", r)}
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
  // Shuffle the tile tray — re-dealing if it lands in the exact answer order,
  // which would hand over the sentence pre-built.
  const pool = useMemo(() => {
    let dealt = shuffle(exercise.tiles);
    let guard = 0;
    while (
      guard++ < 10 &&
      exercise.tiles.length > 1 &&
      JSON.stringify(dealt) === JSON.stringify(exercise.answer)
    ) {
      dealt = shuffle(exercise.tiles);
    }
    return dealt;
  }, [exercise]);
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
  revealAnswer = true,
}: {
  exercise: Extract<Exercise, { type: "listen-choice" }>;
  checked: boolean;
  onChecked: (correct: boolean) => void;
  revealAnswer?: boolean;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [played, setPlayed] = useState(false);
  // Shuffle once on mount so the answer isn't always in the same slot.
  const options = useMemo(() => shuffle(exercise.options), [exercise]);

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
    // Same retry-safe reveal rule as TranslateChoice.
    if (option === selected)
      return option === exercise.answer ? "choice choice-correct" : "choice choice-wrong";
    if (revealAnswer && option === exercise.answer) return "choice choice-correct";
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
        {options.map((opt) => (
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
              {/* Hidden pre-check for single-kana labels — showing the
                  romaji reading there gives away the exact thing a kana
                  sort is meant to test. Word/phrase labels (length > 1)
                  are unaffected; romaji always shows once checked. */}
              {it.romaji && (checked || it.label.length !== 1) && (
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
  hideCheck = false,
}: {
  prompt: string;
  display?: string;
  children: React.ReactNode;
  canCheck: boolean;
  checked: boolean;
  onCheck: () => void;
  // match-pairs grades itself per-pair and reports automatically — no
  // Check button for that exercise type. Every other type is unaffected.
  hideCheck?: boolean;
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
      {!checked && !hideCheck && (
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
