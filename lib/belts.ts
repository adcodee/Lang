// Patch 1.3 — Shotokan-style belt ladder: white -> brown -> black, with bars
// inside a colour rather than a rainbow of kyu colours. Belt/title come from
// curriculum position (which unit exams are passed), never from XP — see
// lib/rank.ts. Emoji placeholders until real belt artwork exists.
//
// Design doc: vault "Lang-rank-belt-balance-patch 1.3.md" (signed 2026-09-02).

export type BeltColor = "white" | "brown" | "black";

export type AwardKind = "bar" | "color";

export interface BeltAward {
  unitId: string;
  levelId: "beginner" | "intermediate" | "advanced" | "fluent";
  kind: AwardKind;
  // State of the belt after this exam is passed.
  color: BeltColor;
  bars: number; // bars ON that colour. 0 right after a colour change.
  dan?: number; // only set on black. 1 = 初段 (shodan).
  label: string; // "White belt · 2 bars" | "Brown belt" | "Black belt · 1st dan"
  jp: string; // "白帯 二本" | "茶帯" | "黒帯 初段"
  emoji: string; // 🤍 / 🤎 / ⬛
}

// Ordered by curriculum progression — walked in order by currentBelt() below.
export const BELT_AWARDS: BeltAward[] = [
  { unitId: "u1-hiragana", levelId: "beginner", kind: "bar", color: "white", bars: 1, label: "White belt · 1 bar", jp: "白帯 一本", emoji: "🤍" },
  { unitId: "u1b-sounds", levelId: "beginner", kind: "bar", color: "white", bars: 2, label: "White belt · 2 bars", jp: "白帯 二本", emoji: "🤍" },
  { unitId: "u2-greetings", levelId: "beginner", kind: "bar", color: "white", bars: 3, label: "White belt · 3 bars", jp: "白帯 三本", emoji: "🤍" },
  { unitId: "u3-numbers", levelId: "beginner", kind: "bar", color: "white", bars: 4, label: "White belt · 4 bars", jp: "白帯 四本", emoji: "🤍" },
  { unitId: "u4-nouns", levelId: "beginner", kind: "bar", color: "white", bars: 5, label: "White belt · 5 bars", jp: "白帯 五本", emoji: "🤍" },
  { unitId: "u5-adjectives", levelId: "beginner", kind: "color", color: "brown", bars: 0, label: "Brown belt", jp: "茶帯", emoji: "🤎" },
];

// When fluent ships, append e.g.:
// { unitId: "…last fluent unit…", levelId: "fluent", kind: "color",
//   color: "black", bars: 0, dan: 1, label: "Black belt · 1st dan", jp: "黒帯 初段", emoji: "⬛" }

export const UNRANKED: Omit<BeltAward, "unitId" | "levelId" | "kind"> = {
  color: "white",
  bars: 0,
  label: "White belt",
  jp: "白帯",
  emoji: "🤍",
};

export function awardForUnit(unitId: string): BeltAward | undefined {
  return BELT_AWARDS.find((a) => a.unitId === unitId);
}

// Highest-progression award among the exams actually passed. BELT_AWARDS is
// in curriculum order, so the last matching entry in the array is the
// furthest one earned — a learner who has passed u1-hiragana and u2-greetings
// (skipping nothing, since exams gate unlocking) is at the u2-greetings row.
export function currentBelt(examsPassed: string[]): BeltAward | typeof UNRANKED {
  const passed = new Set(examsPassed);
  let best: BeltAward | undefined;
  for (const award of BELT_AWARDS) {
    if (passed.has(award.unitId)) best = award;
  }
  return best ?? UNRANKED;
}

export function isLevelCompletingExam(unitId: string): boolean {
  return awardForUnit(unitId)?.kind === "color";
}

// Post-fluent dans (not in this patch):
//   2nd dan — flirting
//   3rd dan — debate
//   …
// These are extra black-belt degrees, not new colours.
// Add a BeltAward with dan: 2, 3, … when those courses exist.
