// The kana the curriculum teaches, tagged with the lesson that introduces them
// and their row. Drives drill scoping ("whatever you've learned so far"),
// vowel sorting, and the SRS review registry. The 46 base kana have stroke
// data in lib/content/strokes.ts; voiced/combo entries don't (they reuse base
// shapes) — trace surfaces must filter on strokeData.
export interface Kana {
  char: string;
  romaji: string;
  row: string; // category label, e.g. "Vowels", "K-row"
  lessonId: string; // lesson that teaches it
}

export const kana: Kana[] = [
  { char: "あ", romaji: "a", row: "Vowels", lessonId: "u1-vowels" },
  { char: "い", romaji: "i", row: "Vowels", lessonId: "u1-vowels" },
  { char: "う", romaji: "u", row: "Vowels", lessonId: "u1-vowels" },
  { char: "え", romaji: "e", row: "Vowels", lessonId: "u1-vowels" },
  { char: "お", romaji: "o", row: "Vowels", lessonId: "u1-vowels" },
  { char: "か", romaji: "ka", row: "K-row", lessonId: "u1-ka-row" },
  { char: "き", romaji: "ki", row: "K-row", lessonId: "u1-ka-row" },
  { char: "く", romaji: "ku", row: "K-row", lessonId: "u1-ka-row" },
  { char: "け", romaji: "ke", row: "K-row", lessonId: "u1-ka-row" },
  { char: "こ", romaji: "ko", row: "K-row", lessonId: "u1-ka-row" },
  { char: "さ", romaji: "sa", row: "S-row", lessonId: "u1-sa-row" },
  { char: "し", romaji: "shi", row: "S-row", lessonId: "u1-sa-row" },
  { char: "す", romaji: "su", row: "S-row", lessonId: "u1-sa-row" },
  { char: "せ", romaji: "se", row: "S-row", lessonId: "u1-sa-row" },
  { char: "そ", romaji: "so", row: "S-row", lessonId: "u1-sa-row" },
  { char: "た", romaji: "ta", row: "T-row", lessonId: "u1-ta-row" },
  { char: "ち", romaji: "chi", row: "T-row", lessonId: "u1-ta-row" },
  { char: "つ", romaji: "tsu", row: "T-row", lessonId: "u1-ta-row" },
  { char: "て", romaji: "te", row: "T-row", lessonId: "u1-ta-row" },
  { char: "と", romaji: "to", row: "T-row", lessonId: "u1-ta-row" },
  { char: "な", romaji: "na", row: "N-row", lessonId: "u1-na-row" },
  { char: "に", romaji: "ni", row: "N-row", lessonId: "u1-na-row" },
  { char: "ぬ", romaji: "nu", row: "N-row", lessonId: "u1-na-row" },
  { char: "ね", romaji: "ne", row: "N-row", lessonId: "u1-na-row" },
  { char: "の", romaji: "no", row: "N-row", lessonId: "u1-na-row" },
  { char: "は", romaji: "ha", row: "H-row", lessonId: "u1-ha-row" },
  { char: "ひ", romaji: "hi", row: "H-row", lessonId: "u1-ha-row" },
  { char: "ふ", romaji: "fu", row: "H-row", lessonId: "u1-ha-row" },
  { char: "へ", romaji: "he", row: "H-row", lessonId: "u1-ha-row" },
  { char: "ほ", romaji: "ho", row: "H-row", lessonId: "u1-ha-row" },
  { char: "ま", romaji: "ma", row: "M-row", lessonId: "u1-ma-row" },
  { char: "み", romaji: "mi", row: "M-row", lessonId: "u1-ma-row" },
  { char: "む", romaji: "mu", row: "M-row", lessonId: "u1-ma-row" },
  { char: "め", romaji: "me", row: "M-row", lessonId: "u1-ma-row" },
  { char: "も", romaji: "mo", row: "M-row", lessonId: "u1-ma-row" },
  { char: "や", romaji: "ya", row: "Y-row", lessonId: "u1-ya-row" },
  { char: "ゆ", romaji: "yu", row: "Y-row", lessonId: "u1-ya-row" },
  { char: "よ", romaji: "yo", row: "Y-row", lessonId: "u1-ya-row" },
  { char: "ら", romaji: "ra", row: "R-row", lessonId: "u1-ra-row" },
  { char: "り", romaji: "ri", row: "R-row", lessonId: "u1-ra-row" },
  { char: "る", romaji: "ru", row: "R-row", lessonId: "u1-ra-row" },
  { char: "れ", romaji: "re", row: "R-row", lessonId: "u1-ra-row" },
  { char: "ろ", romaji: "ro", row: "R-row", lessonId: "u1-ra-row" },
  { char: "わ", romaji: "wa", row: "W-row", lessonId: "u1-wa-row" },
  { char: "を", romaji: "wo", row: "W-row", lessonId: "u1-wa-row" },
  { char: "ん", romaji: "n", row: "W-row", lessonId: "u1-wa-row" },
  // Voiced & combo sounds (u1b) — only the kana taught as cards are registered
  // (the remaining dakuten/yōon are future content). None have stroke data:
  // they reuse base shapes, so trace surfaces must filter on strokeData.
  // Small っ is teach-only (no standalone sound), so it isn't registered.
  { char: "が", romaji: "ga", row: "G-row", lessonId: "u1b-dakuten-gz" },
  { char: "ぎ", romaji: "gi", row: "G-row", lessonId: "u1b-dakuten-gz" },
  { char: "ご", romaji: "go", row: "G-row", lessonId: "u1b-dakuten-gz" },
  { char: "ざ", romaji: "za", row: "Z-row", lessonId: "u1b-dakuten-gz" },
  { char: "じ", romaji: "ji", row: "Z-row", lessonId: "u1b-dakuten-gz" },
  { char: "ず", romaji: "zu", row: "Z-row", lessonId: "u1b-dakuten-gz" },
  { char: "だ", romaji: "da", row: "D-row", lessonId: "u1b-dakuten-db" },
  { char: "で", romaji: "de", row: "D-row", lessonId: "u1b-dakuten-db" },
  { char: "ど", romaji: "do", row: "D-row", lessonId: "u1b-dakuten-db" },
  { char: "ば", romaji: "ba", row: "B-row", lessonId: "u1b-dakuten-db" },
  { char: "び", romaji: "bi", row: "B-row", lessonId: "u1b-dakuten-db" },
  { char: "ぼ", romaji: "bo", row: "B-row", lessonId: "u1b-dakuten-db" },
  { char: "ぱ", romaji: "pa", row: "P-row", lessonId: "u1b-handakuten" },
  { char: "ぴ", romaji: "pi", row: "P-row", lessonId: "u1b-handakuten" },
  { char: "ぷ", romaji: "pu", row: "P-row", lessonId: "u1b-handakuten" },
  { char: "ぺ", romaji: "pe", row: "P-row", lessonId: "u1b-handakuten" },
  { char: "ぽ", romaji: "po", row: "P-row", lessonId: "u1b-handakuten" },
  { char: "きゃ", romaji: "kya", row: "Yōon", lessonId: "u1b-yoon" },
  { char: "しゅ", romaji: "shu", row: "Yōon", lessonId: "u1b-yoon" },
  { char: "ちょ", romaji: "cho", row: "Yōon", lessonId: "u1b-yoon" },
  { char: "じゃ", romaji: "ja", row: "Yōon", lessonId: "u1b-yoon" },
  { char: "りょ", romaji: "ryo", row: "Yōon", lessonId: "u1b-yoon" },
];

// Kana the learner has unlocked (its introducing lesson is completed).
export function learnedKana(completed: string[]): Kana[] {
  return kana.filter((k) => completed.includes(k.lessonId));
}

// The classic near-twin pairs, with each side's visual tell. Drives the
// Lookalike Pairs drill (and mirrors the teach cards' contrast pairs). A pair
// only enters play once BOTH kana are learned.
export interface LookalikePair {
  a: string;
  b: string;
  tellA: string;
  tellB: string;
}

export const lookalikePairs: LookalikePair[] = [
  { a: "あ", b: "お", tellA: "crossbar sticks out", tellB: "extra dot, tighter loop" },
  { a: "い", b: "り", tellA: "two short strokes", tellB: "long right drop" },
  { a: "き", b: "さ", tellA: "two cross-strokes", tellB: "one cross-stroke" },
  { a: "し", b: "つ", tellA: "drops down", tellB: "sweeps across" },
  { a: "こ", b: "に", tellA: "two strokes only", tellB: "adds the left stem" },
  { a: "は", b: "ほ", tellA: "no line on top", tellB: "extra line on top" },
  { a: "ぬ", b: "め", tellA: "ends in a loop", tellB: "no end loop" },
  { a: "ぬ", b: "ね", tellA: "open curling tail", tellB: "closed loop at the base" },
  { a: "め", b: "ね", tellA: "no end loop", tellB: "closed loop at the base" },
  { a: "ね", b: "れ", tellA: "loops at the base", tellB: "kicks outward" },
  { a: "ね", b: "わ", tellA: "loops at the base", tellB: "curls inward" },
  { a: "れ", b: "わ", tellA: "kicks outward", tellB: "curls inward" },
  { a: "る", b: "ろ", tellA: "ends in a loop", tellB: "no loop" },
  { a: "ば", b: "ぱ", tellA: "dashes ゛= b", tellB: "circle ゜= p" },
  { a: "び", b: "ぴ", tellA: "dashes ゛= b", tellB: "circle ゜= p" },
  { a: "ぼ", b: "ぽ", tellA: "dashes ゛= b", tellB: "circle ゜= p" },
  { a: "ぱ", b: "ぽ", tellA: "no line on top (は)", tellB: "extra line on top (ほ)" },
];

// Pairs where both kana are already learned — the drill's active pool.
export function learnedLookalikePairs(completed: string[]): LookalikePair[] {
  const known = new Set(learnedKana(completed).map((k) => k.char));
  return lookalikePairs.filter((p) => known.has(p.a) && known.has(p.b));
}

export function kanaByChar(char: string): Kana | undefined {
  return kana.find((k) => k.char === char);
}

// Progress across the base-kana rows (Vowels, K-row, …) — drives the
// "N/M rows unlocked" hint on the progressive Vowel Sort drill.
export function kanaRowProgress(completed: string[]): {
  unlocked: number;
  total: number;
} {
  const total = new Set(kana.map((k) => k.row)).size;
  const unlocked = new Set(learnedKana(completed).map((k) => k.row)).size;
  return { unlocked, total };
}

