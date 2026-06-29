import type { SkillStats } from "@/lib/types";

// Japanese-flavoured rank ladder. The character "evolves" as total XP grows,
// but rank-ups are gated by skill balance: every practised skill must clear a
// minimum accuracy so a learner can't rank up while one skill lags badly.
export interface Rank {
  level: number; // 0-indexed position in RANKS
  title: string;
  emoji: string;
  xpInto: number; // XP earned past this rank's threshold
  xpForNext: number | null; // XP span to the next rank (null at max)
  progress: number; // 0..1 toward next rank
  balanced: boolean; // false if a weak skill is holding back the next rank
}

interface RankDef {
  title: string;
  emoji: string;
  minXp: number;
}

// Thresholds chosen so early ranks come quickly, later ones take real grind.
const RANKS: RankDef[] = [
  { title: "Rookie (新人)", emoji: "🥚", minXp: 0 },
  { title: "Student (学生)", emoji: "🐣", minXp: 100 },
  { title: "Apprentice (弟子)", emoji: "🥋", minXp: 300 },
  { title: "Warrior (武士)", emoji: "⚔️", minXp: 600 },
  { title: "Master (達人)", emoji: "🎌", minXp: 1000 },
  { title: "Legend (伝説)", emoji: "🐉", minXp: 1600 },
];

// Minimum accuracy a *practised* skill must hold to allow ranking up.
const BALANCE_THRESHOLD = 0.5;

export function isBalanced(skillStats: SkillStats): boolean {
  return Object.values(skillStats).every(
    (s) => s.total === 0 || s.correct / s.total >= BALANCE_THRESHOLD
  );
}

export function getRank(xp: number, skillStats: SkillStats): Rank {
  const balanced = isBalanced(skillStats);

  // Highest rank whose threshold the XP clears.
  let level = 0;
  for (let i = 0; i < RANKS.length; i++) {
    if (xp >= RANKS[i].minXp) level = i;
  }

  // If unbalanced, hold the learner one rank below what XP alone would grant.
  if (!balanced && level > 0) level -= 1;

  const current = RANKS[level];
  const next = RANKS[level + 1] ?? null;
  const xpInto = xp - current.minXp;
  const xpForNext = next ? next.minXp - current.minXp : null;
  const progress = next ? Math.min(1, xpInto / (next.minXp - current.minXp)) : 1;

  return {
    level,
    title: current.title,
    emoji: current.emoji,
    xpInto,
    xpForNext,
    progress,
    balanced,
  };
}
