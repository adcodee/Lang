import type { SkillStats } from "@/lib/types";
import { currentBelt, BeltAward, UNRANKED } from "@/lib/belts";
import { unitsInOrder } from "@/lib/content/ja/curriculum";

// Patch 1.3: title + belt come from curriculum position (which unit exams
// are passed), never from XP — see lib/belts.ts. XP alone used to gate rank
// (a lesson test's ~50-1400 XP blew straight past the old 1000-XP "Master"
// threshold), which let a learner mid-beginner-unit get called 達人. The XP
// bar below now tracks progress through the *current belt colour*, not
// toward some XP-only max rank.
export interface Rank {
  title: string;
  emoji: string;
  belt: BeltAward | typeof UNRANKED;
  xpInto: number; // XP earned since the current belt's last award
  progress: number; // 0..1 through the current belt colour
  progressLabel: string; // what the bar/copy actually says
  balanced: boolean; // false if a weak skill is holding back the next rank
}

// Minimum accuracy a *practised* skill must hold to allow ranking up.
const BALANCE_THRESHOLD = 0.5;

export function isBalanced(skillStats: SkillStats): boolean {
  return Object.values(skillStats).every(
    (s) => s.total === 0 || s.correct / s.total >= BALANCE_THRESHOLD
  );
}

// Display title derived from belt state, not XP. 達人/伝説 stay locked until
// black is actually earned (fluent complete) — impossible today since
// fluent is comingSoon, so BELT_AWARDS has no black-belt row yet.
function titleFor(belt: BeltAward | typeof UNRANKED): { title: string; emoji: string } {
  if (belt.color === "black") {
    return (belt.dan ?? 1) >= 2
      ? { title: `Legend (伝説) · ${belt.dan}${ordinalSuffix(belt.dan!)} dan`, emoji: "🐉" }
      : { title: "Master (達人) · 初段", emoji: "⬛" };
  }
  if (belt.color === "brown") {
    return belt.bars > 0
      ? { title: "Senior student (上級生)", emoji: "🤎" }
      : { title: "Brown belt (茶帯)", emoji: "🤎" };
  }
  // white
  return belt.bars > 0
    ? { title: "Student (学生)", emoji: "🤍" }
    : { title: "Rookie (新人)", emoji: "🥚" };
}

function ordinalSuffix(n: number): string {
  if (n % 10 === 1 && n % 100 !== 11) return "st";
  if (n % 10 === 2 && n % 100 !== 12) return "nd";
  if (n % 10 === 3 && n % 100 !== 13) return "rd";
  return "th";
}

export function getRank(
  xp: number,
  skillStats: SkillStats,
  examsPassed: string[],
  completedLessons: string[] = []
): Rank {
  const balanced = isBalanced(skillStats);
  const belt = currentBelt(examsPassed);
  const { title, emoji } = titleFor(belt);

  // Progress bar: lessons completed in the *next* unit past the current
  // belt, not raw XP — 1.2 inflated XP enough that an XP-span bar would be
  // meaningless (see the belt-earned screen, which shows the real XP number
  // separately). At the beginner cap (brown earned, nothing authored past
  // it), the bar sits full with a "not open yet" message instead of
  // claiming max rank.
  const units = unitsInOrder();
  const beltUnitIdx = "unitId" in belt ? units.findIndex((u) => u.id === belt.unitId) : -1;
  const nextUnit = units[beltUnitIdx + 1];

  let progress = 0;
  let progressLabel: string;
  if (!nextUnit) {
    progress = 1;
    progressLabel =
      belt.color === "black"
        ? "Post-fluent track."
        : "Beginner course complete — intermediate not open yet.";
  } else {
    const doneInNext = nextUnit.lessons.filter((l) =>
      completedLessons.includes(l.id)
    ).length;
    const totalInNext = nextUnit.lessons.length;
    progress = totalInNext > 0 ? doneInNext / totalInNext : 0;
    const left = totalInNext - doneInNext;
    progressLabel =
      left > 0
        ? `${left} lesson${left === 1 ? "" : "s"} left in ${nextUnit.title}.`
        : `${nextUnit.title} complete — exam next.`;
  }

  return {
    title,
    emoji,
    belt,
    xpInto: xp,
    progress,
    progressLabel,
    balanced,
  };
}
