import type { Exercise } from "@/lib/types";
import { kana, learnedKana, type Kana } from "@/lib/content/ja/kana";

// The near-twin kana that Quick Match deliberately oversamples — same list
// LookalikeDrill.tsx weights toward, exported from here so it's not
// duplicated between the two drills.
export const CONFUSION_PAIRS: [string, string][] = [
  ["ぬ", "め"],
  ["ぬ", "ね"],
  ["め", "ね"],
  ["ね", "れ"],
  ["る", "ろ"],
  ["き", "さ"],
  ["は", "ほ"],
  ["あ", "お"],
];

const VOWEL_CHARS = ["あ", "い", "う", "え", "お"];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Three muted (no audio) match-pairs boards, sampled from whatever kana the
// learner has actually been taught — grows with each row, and always
// surfaces at least one genuine confusion pair (ぬ/め, ぬ/ね, etc.) per
// session once both members are learned. Called fresh each time the drill
// is opened, so re-entering surfaces a different random forced pair.
export function buildMutedMatchExercises(completedLessonIds: string[]): Exercise[] {
  const learned = learnedKana(completedLessonIds).filter((k) => k.char !== "ん");
  const pool: Kana[] = learned.length >= 4 ? learned : kana.filter((k) => VOWEL_CHARS.includes(k.char));
  const boardSize = Math.min(5, pool.length);

  const eligiblePairs = CONFUSION_PAIRS.filter(
    ([a, b]) => pool.some((k) => k.char === a) && pool.some((k) => k.char === b)
  );
  const forcedPair = eligiblePairs.length > 0 ? eligiblePairs[Math.floor(Math.random() * eligiblePairs.length)] : null;
  const forcedBoardIndex = forcedPair ? Math.floor(Math.random() * 3) : -1;

  const usageCounts = new Map<string, number>();
  const boards: Kana[][] = [];

  for (let i = 0; i < 3; i++) {
    // A kana that appeared on every board so far is excluded from this
    // board's candidates, unless that would leave too few to fill it —
    // guarantees no kana lands on all 3 boards when the pool is big enough
    // to actually offer variety.
    const usedEveryPriorBoard = i > 0 ? pool.filter((k) => (usageCounts.get(k.char) ?? 0) === i) : [];
    const candidates =
      pool.length >= 8 && pool.length - usedEveryPriorBoard.length >= boardSize
        ? pool.filter((k) => !usedEveryPriorBoard.includes(k))
        : pool;

    let board: Kana[];
    if (i === forcedBoardIndex && forcedPair) {
      const [a, b] = forcedPair;
      const forced = pool.filter((k) => k.char === a || k.char === b);
      const rest = shuffle(candidates.filter((k) => k.char !== a && k.char !== b)).slice(
        0,
        boardSize - forced.length
      );
      board = shuffle([...forced, ...rest]);
    } else {
      board = shuffle(candidates).slice(0, boardSize);
    }

    board.forEach((k) => usageCounts.set(k.char, (usageCounts.get(k.char) ?? 0) + 1));
    boards.push(board);
  }

  return boards.map((board) => ({
    type: "match-pairs" as const,
    prompt: "Match the kana to its sound",
    pairs: board.map((k) => ({ left: k.char, right: k.romaji })),
  }));
}
