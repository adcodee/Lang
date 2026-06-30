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
];

// Kana the learner has unlocked (its introducing lesson is completed).
export function learnedKana(completed: string[]): Kana[] {
  return kana.filter((k) => completed.includes(k.lessonId));
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
