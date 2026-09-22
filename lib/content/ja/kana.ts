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
  // Unit 6 (katakana): default hiragana, omitted on existing content — same
  // "default, omitted on existing content" convention as KanaTeachCard's
  // `kind` field. Katakana rows use a "Katakana "-prefixed `row` label (not
  // just a bare same-named row) on purpose: kanaRowProgress() counts
  // distinct `row` values in a Set to drive the Vowel Sort drill's "N/M
  // rows unlocked" hint — a same-named row would silently merge hiragana's
  // and katakana's progress into one count.
  script?: "hiragana" | "katakana";
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
  // Katakana (Unit 6) — same 46 sounds as hiragana above, new shapes. ー
  // (chōonpu, long vowel) is teach-only like っ, already taught in
  // u1b-sokuon, and correspondingly not registered here.
  { char: "ア", romaji: "a", row: "Katakana Vowels", lessonId: "u6-katakana-vowels-k-s", script: "katakana" },
  { char: "イ", romaji: "i", row: "Katakana Vowels", lessonId: "u6-katakana-vowels-k-s", script: "katakana" },
  { char: "ウ", romaji: "u", row: "Katakana Vowels", lessonId: "u6-katakana-vowels-k-s", script: "katakana" },
  { char: "エ", romaji: "e", row: "Katakana Vowels", lessonId: "u6-katakana-vowels-k-s", script: "katakana" },
  { char: "オ", romaji: "o", row: "Katakana Vowels", lessonId: "u6-katakana-vowels-k-s", script: "katakana" },
  { char: "カ", romaji: "ka", row: "Katakana K-row", lessonId: "u6-katakana-vowels-k-s", script: "katakana" },
  { char: "キ", romaji: "ki", row: "Katakana K-row", lessonId: "u6-katakana-vowels-k-s", script: "katakana" },
  { char: "ク", romaji: "ku", row: "Katakana K-row", lessonId: "u6-katakana-vowels-k-s", script: "katakana" },
  { char: "ケ", romaji: "ke", row: "Katakana K-row", lessonId: "u6-katakana-vowels-k-s", script: "katakana" },
  { char: "コ", romaji: "ko", row: "Katakana K-row", lessonId: "u6-katakana-vowels-k-s", script: "katakana" },
  { char: "サ", romaji: "sa", row: "Katakana S-row", lessonId: "u6-katakana-vowels-k-s", script: "katakana" },
  { char: "シ", romaji: "shi", row: "Katakana S-row", lessonId: "u6-katakana-vowels-k-s", script: "katakana" },
  { char: "ス", romaji: "su", row: "Katakana S-row", lessonId: "u6-katakana-vowels-k-s", script: "katakana" },
  { char: "セ", romaji: "se", row: "Katakana S-row", lessonId: "u6-katakana-vowels-k-s", script: "katakana" },
  { char: "ソ", romaji: "so", row: "Katakana S-row", lessonId: "u6-katakana-vowels-k-s", script: "katakana" },
  { char: "タ", romaji: "ta", row: "Katakana T-row", lessonId: "u6-katakana-t-n-h", script: "katakana" },
  { char: "チ", romaji: "chi", row: "Katakana T-row", lessonId: "u6-katakana-t-n-h", script: "katakana" },
  { char: "ツ", romaji: "tsu", row: "Katakana T-row", lessonId: "u6-katakana-t-n-h", script: "katakana" },
  { char: "テ", romaji: "te", row: "Katakana T-row", lessonId: "u6-katakana-t-n-h", script: "katakana" },
  { char: "ト", romaji: "to", row: "Katakana T-row", lessonId: "u6-katakana-t-n-h", script: "katakana" },
  { char: "ナ", romaji: "na", row: "Katakana N-row", lessonId: "u6-katakana-t-n-h", script: "katakana" },
  { char: "ニ", romaji: "ni", row: "Katakana N-row", lessonId: "u6-katakana-t-n-h", script: "katakana" },
  { char: "ヌ", romaji: "nu", row: "Katakana N-row", lessonId: "u6-katakana-t-n-h", script: "katakana" },
  { char: "ネ", romaji: "ne", row: "Katakana N-row", lessonId: "u6-katakana-t-n-h", script: "katakana" },
  { char: "ノ", romaji: "no", row: "Katakana N-row", lessonId: "u6-katakana-t-n-h", script: "katakana" },
  { char: "ハ", romaji: "ha", row: "Katakana H-row", lessonId: "u6-katakana-t-n-h", script: "katakana" },
  { char: "ヒ", romaji: "hi", row: "Katakana H-row", lessonId: "u6-katakana-t-n-h", script: "katakana" },
  { char: "フ", romaji: "fu", row: "Katakana H-row", lessonId: "u6-katakana-t-n-h", script: "katakana" },
  { char: "ヘ", romaji: "he", row: "Katakana H-row", lessonId: "u6-katakana-t-n-h", script: "katakana" },
  { char: "ホ", romaji: "ho", row: "Katakana H-row", lessonId: "u6-katakana-t-n-h", script: "katakana" },
  { char: "マ", romaji: "ma", row: "Katakana M-row", lessonId: "u6-katakana-m-y-r-w", script: "katakana" },
  { char: "ミ", romaji: "mi", row: "Katakana M-row", lessonId: "u6-katakana-m-y-r-w", script: "katakana" },
  { char: "ム", romaji: "mu", row: "Katakana M-row", lessonId: "u6-katakana-m-y-r-w", script: "katakana" },
  { char: "メ", romaji: "me", row: "Katakana M-row", lessonId: "u6-katakana-m-y-r-w", script: "katakana" },
  { char: "モ", romaji: "mo", row: "Katakana M-row", lessonId: "u6-katakana-m-y-r-w", script: "katakana" },
  { char: "ヤ", romaji: "ya", row: "Katakana Y-row", lessonId: "u6-katakana-m-y-r-w", script: "katakana" },
  { char: "ユ", romaji: "yu", row: "Katakana Y-row", lessonId: "u6-katakana-m-y-r-w", script: "katakana" },
  { char: "ヨ", romaji: "yo", row: "Katakana Y-row", lessonId: "u6-katakana-m-y-r-w", script: "katakana" },
  { char: "ラ", romaji: "ra", row: "Katakana R-row", lessonId: "u6-katakana-m-y-r-w", script: "katakana" },
  { char: "リ", romaji: "ri", row: "Katakana R-row", lessonId: "u6-katakana-m-y-r-w", script: "katakana" },
  { char: "ル", romaji: "ru", row: "Katakana R-row", lessonId: "u6-katakana-m-y-r-w", script: "katakana" },
  { char: "レ", romaji: "re", row: "Katakana R-row", lessonId: "u6-katakana-m-y-r-w", script: "katakana" },
  { char: "ロ", romaji: "ro", row: "Katakana R-row", lessonId: "u6-katakana-m-y-r-w", script: "katakana" },
  { char: "ワ", romaji: "wa", row: "Katakana W-row", lessonId: "u6-katakana-m-y-r-w", script: "katakana" },
  { char: "ヲ", romaji: "wo", row: "Katakana W-row", lessonId: "u6-katakana-m-y-r-w", script: "katakana" },
  { char: "ン", romaji: "n", row: "Katakana W-row", lessonId: "u6-katakana-m-y-r-w", script: "katakana" },
  // Voiced/combo — same partial-coverage pattern as u1b (representative
  // cards only; the "add the mark to the shape you already know" rule
  // generalizes past what's registered). P-row is the one complete row,
  // same as hiragana's ぱぴぷぺぽ — it's the whole closed handakuten set.
  { char: "ガ", romaji: "ga", row: "Katakana G-row", lessonId: "u6-katakana-voiced-combo", script: "katakana" },
  { char: "ゴ", romaji: "go", row: "Katakana G-row", lessonId: "u6-katakana-voiced-combo", script: "katakana" },
  { char: "ザ", romaji: "za", row: "Katakana Z-row", lessonId: "u6-katakana-voiced-combo", script: "katakana" },
  { char: "ジ", romaji: "ji", row: "Katakana Z-row", lessonId: "u6-katakana-voiced-combo", script: "katakana" },
  { char: "ダ", romaji: "da", row: "Katakana D-row", lessonId: "u6-katakana-voiced-combo", script: "katakana" },
  { char: "ド", romaji: "do", row: "Katakana D-row", lessonId: "u6-katakana-voiced-combo", script: "katakana" },
  { char: "バ", romaji: "ba", row: "Katakana B-row", lessonId: "u6-katakana-voiced-combo", script: "katakana" },
  { char: "ボ", romaji: "bo", row: "Katakana B-row", lessonId: "u6-katakana-voiced-combo", script: "katakana" },
  { char: "パ", romaji: "pa", row: "Katakana P-row", lessonId: "u6-katakana-voiced-combo", script: "katakana" },
  { char: "ピ", romaji: "pi", row: "Katakana P-row", lessonId: "u6-katakana-voiced-combo", script: "katakana" },
  { char: "プ", romaji: "pu", row: "Katakana P-row", lessonId: "u6-katakana-voiced-combo", script: "katakana" },
  { char: "ペ", romaji: "pe", row: "Katakana P-row", lessonId: "u6-katakana-voiced-combo", script: "katakana" },
  { char: "ポ", romaji: "po", row: "Katakana P-row", lessonId: "u6-katakana-voiced-combo", script: "katakana" },
  { char: "キャ", romaji: "kya", row: "Katakana Yōon", lessonId: "u6-katakana-voiced-combo", script: "katakana" },
  { char: "シュ", romaji: "shu", row: "Katakana Yōon", lessonId: "u6-katakana-voiced-combo", script: "katakana" },
  { char: "チョ", romaji: "cho", row: "Katakana Yōon", lessonId: "u6-katakana-voiced-combo", script: "katakana" },
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
  // Katakana (Unit 6) — the lookalike traps hiragana never had: these
  // don't correspond to any hiragana pair (きゃ/さ etc. above are all
  // hiragana↔hiragana), so a learner who's fine with し/つ can still get
  // caught by シ/ツ — the stroke directions are effectively swapped.
  { a: "シ", b: "ツ", tellA: "bottom stroke sweeps up-and-right", tellB: "bottom stroke sweeps down-and-left" },
  { a: "ソ", b: "ン", tellA: "top stroke steep, starts high", tellB: "top stroke short & near-horizontal, sits low" },
  { a: "ノ", b: "メ", tellA: "single stroke only", tellB: "adds a second crossing stroke" },
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

