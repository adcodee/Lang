// Crude spaced-repetition scheduling. Items advance an interval ladder on
// correct recall and reset on failure; "due" items resurface in the Dojo
// review. Item ids are namespaced, e.g. `kana:さ`, `vocab:こんにちは`.

export interface SeenEntry {
  last: number; // ms timestamp of last exposure
  level: number; // index into INTERVALS
}

export const INTERVALS = [1, 3, 7, 14, 30]; // days
const DAY = 86_400_000;

export function nextLevel(prevLevel: number | undefined, correct: boolean): number {
  if (!correct) return 0;
  const base = prevLevel ?? -1;
  return Math.min(base + 1, INTERVALS.length - 1);
}

export function intervalDays(level: number): number {
  return INTERVALS[Math.min(Math.max(level, 0), INTERVALS.length - 1)];
}

// Never-seen items are due; otherwise due once the interval has elapsed.
export function isDue(entry: SeenEntry | undefined, now: number): boolean {
  if (!entry) return true;
  return now - entry.last >= intervalDays(entry.level) * DAY;
}

// Learned items that are due for review (crosses kana + vocab).
export function dueItems(
  seen: Record<string, SeenEntry>,
  learnedIds: string[],
  now: number
): string[] {
  return learnedIds.filter((id) => isDue(seen[id], now));
}

export const kanaItemId = (char: string) => `kana:${char}`;
export const vocabItemId = (word: string) => `vocab:${word}`;
