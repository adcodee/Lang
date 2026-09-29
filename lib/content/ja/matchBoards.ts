import type { Exercise } from "@/lib/types";
import { learnedKana, type Kana } from "@/lib/content/ja/kana";

// The near-twin kana that Quick Match deliberately oversamples — same list
// LookalikeDrill.tsx weights toward, exported from here so it's not
// duplicated between the two drills.
export const CONFUSION_PAIRS: [string, string][] = [
  // Hiragana ↔ hiragana
  ["ぬ", "め"],
  ["ぬ", "ね"],
  ["め", "ね"],
  ["ね", "れ"],
  ["る", "ろ"],
  ["き", "さ"],
  ["は", "ほ"],
  ["あ", "お"],
  // Patch 1.9.1 — katakana ↔ katakana. Unit 6 registered these as lookalike
  // pairs but this list never learned about them, so the forced-pair
  // mechanic was 100% hiragana for a learner who had finished katakana.
  ["シ", "ツ"],
  ["ソ", "ン"],
  ["ノ", "メ"],
  // Patch 1.9.1 — CROSS-SCRIPT. The confusion a learner actually meets on a
  // menu, and the one the Dojo never asked about: the same sound in two
  // scripts, drawn so similarly that only the stroke tells them apart.
  ["り", "リ"],
  ["も", "モ"],
  ["や", "ヤ"],
  ["こ", "コ"],
  ["か", "カ"],
  ["に", "ニ"],
  ["へ", "ヘ"],
  ["せ", "サ"],
  ["ち", "テ"],
  ["く", "ク"],
  ["け", "ケ"],
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Every learned kana eligible for Quick Match (drops ん — no clean
// single-vowel pairing). Empty before the vowels lesson is learned —
// which is also true pre-hydration, since completedLessonIds starts empty
// during SSR. Deliberately no "fall back to the 5 vowels" case here (1.1
// had one, and it's what caused a real hydration bug: it meant a board
// got randomly generated even against an empty/pre-hydration pool). By
// the time a learner can actually open this drill they've already
// completed u1-vowels, so the fallback was only ever masking the
// pre-hydration state, not serving a real learner — QuickMatchDrill
// treats an empty pool as a fixed "not unlocked yet" message instead,
// same pattern as LookalikeDrill/VowelSortDrill, so no Math.random() call
// ever happens before real post-hydration data is in.
export function matchPool(completedLessonIds: string[]): Kana[] {
  return learnedKana(completedLessonIds).filter(
    // ん has no vowel to match on.
    // Patch 1.9.1: and no `mark` kana. っ ー ゃ ゅ ょ ァ ィ ゥ ェ ォ ッ exist so
    // the tutor allowlist and the content rule know the learner can read
    // them; they are not matchable cards. A board asking you to pair ー with
    // "(hold the vowel)" has no answer. lessonExercises.ts already excluded them
    // from generated filler — the Dojo never got told.
    (k) => k.char !== "ん" && !k.mark
  );
}

// One muted (no audio) match-pairs board sampled from the given pool.
// `forceConfusionPair`, when true and an eligible pair exists in the
// pool, guarantees that pair appears together on this board — the caller
// decides how often to ask for that (QuickMatchDrill: a per-round chance,
// not "at least once per fixed batch" the way the old 3-board version did
// — there's no fixed batch to guarantee within once the drill is endless).
export function buildOneMutedBoard(pool: Kana[], forceConfusionPair: boolean): Exercise {
  const boardSize = Math.min(5, pool.length);
  const eligiblePairs = CONFUSION_PAIRS.filter(
    ([a, b]) => pool.some((k) => k.char === a) && pool.some((k) => k.char === b)
  );
  const forcedPair =
    forceConfusionPair && eligiblePairs.length > 0
      ? eligiblePairs[Math.floor(Math.random() * eligiblePairs.length)]
      : null;

  let board: Kana[];
  if (forcedPair) {
    const [a, b] = forcedPair;
    const forced = pool.filter((k) => k.char === a || k.char === b);
    const rest = shuffle(pool.filter((k) => k.char !== a && k.char !== b)).slice(
      0,
      boardSize - forced.length
    );
    board = shuffle([...forced, ...rest]);
  } else {
    board = shuffle(pool).slice(0, boardSize);
  }

  return {
    type: "match-pairs",
    prompt: "Match the kana to its sound",
    pairs: board.map((k) => ({ left: k.char, right: k.romaji })),
  };
}
