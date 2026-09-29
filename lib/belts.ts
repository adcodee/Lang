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
//
// Patch 1.8: the beginner course grew. Katakana (u6) moved in from
// intermediate, particles (u7) and polite verb forms (u8) were authored, and
// five scenario units are still to come — fourteen units in total, against a
// five-bars-per-colour ladder. So bars are awarded at MILESTONES, not one per
// unit, and the White -> Brown colour change now marks the true end of the
// beginner course rather than the end of Unit 5 (owner's call, 2026-09-27).
//
// Units deliberately awarding nothing (u3, u4, u6, u7) still unlock the next
// unit and still pay exam XP — they just don't move the belt. ExamPlayer
// renders those as "Unit cleared" rather than claiming a belt.
export const BELT_AWARDS: BeltAward[] = [
  { unitId: "u1-hiragana", levelId: "beginner", kind: "bar", color: "white", bars: 1, label: "White belt · 1 bar", jp: "白帯 一本", emoji: "🤍" },
  { unitId: "u1b-sounds", levelId: "beginner", kind: "bar", color: "white", bars: 2, label: "White belt · 2 bars", jp: "白帯 二本", emoji: "🤍" },
  { unitId: "u2-greetings", levelId: "beginner", kind: "bar", color: "white", bars: 3, label: "White belt · 3 bars", jp: "白帯 三本", emoji: "🤍" },
  // u3-numbers, u4-nouns — no belt movement (see the milestone note above).
  { unitId: "u5-adjectives", levelId: "beginner", kind: "bar", color: "white", bars: 4, label: "White belt · 4 bars", jp: "白帯 四本", emoji: "🤍" },
  // u6-katakana, u7-particles — no belt movement.
  { unitId: "u8-verb-forms", levelId: "beginner", kind: "bar", color: "white", bars: 5, label: "White belt · 5 bars", jp: "白帯 五本", emoji: "🤍" },
  // The White -> Brown promotion belongs to the LAST beginner unit.
  //
  // Owner's call, 2026-09-29: the five scenario units (konbini, restaurant,
  // train station, directions, hotel) move to the INTERMEDIATE course. They
  // are the conversations you have once the foundation exists, and each
  // teaches its own situational vocabulary — prices, counters, party sizes,
  // clock times — in the situation that makes it make sense, rather than
  // being pre-loaded into beginner.
  //
  // So brown now means FOUNDATION COMPLETE: both scripts read cold, a
  // constrained conversation held, pointing, existence, what/where/how much.
  // It lands on the last unit of patch 1.9 rather than after five roleplays.
  // When 1.9 ships, add:
  //   { unitId: "…final scenario unit…", levelId: "beginner", kind: "color",
  //     color: "brown", bars: 0, label: "Brown belt", jp: "茶帯", emoji: "🤎" },
  // Until then the beginner course tops out at White belt · 5 bars, which is
  // honest: the course genuinely isn't finished.
];

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
