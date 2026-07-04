// The kana the curriculum teaches, tagged with the lesson that introduces them
// and their row. Drives drill scoping ("whatever you've learned so far") and
// category sorting. Every entry has stroke data in lib/content/strokes.ts.
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
];

// Kana the learner has unlocked (its introducing lesson is completed).
export function learnedKana(completed: string[]): Kana[] {
  return kana.filter((k) => completed.includes(k.lessonId));
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

// Learned kana grouped by row, keeping only rows with 2+ entries (sortable).
export function learnedKanaRows(completed: string[]): Record<string, Kana[]> {
  const rows: Record<string, Kana[]> = {};
  for (const k of learnedKana(completed)) {
    (rows[k.row] ??= []).push(k);
  }
  for (const r of Object.keys(rows)) {
    if (rows[r].length < 2) delete rows[r];
  }
  return rows;
}
