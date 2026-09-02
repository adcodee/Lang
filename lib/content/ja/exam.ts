import type { Exercise, SkillCategory } from "@/lib/types";
import { getUnit } from "@/lib/content/ja/curriculum";
import { exerciseSkill } from "@/lib/exercise";

const EXAM_LENGTH = 10;

// u1-hiragana only: a longer exam that's guaranteed to include the N/M/R-row
// loop-cluster (ぬ/め/ね/れ/る) as a single muted match board, forced near
// the front rather than left to shuffle-to-the-end — these are the kana
// this whole patch exists to stop learners guessing past. Not the full
// "unseen combinations" exam generator (Phase 4 in the JP build plan);
// forced loop-cluster + a longer bank is the gate for this pass.
const HIRAGANA_EXAM_UNIT = "u1-hiragana";
const HIRAGANA_EXAM_LENGTH = 16;
const LOOP_CLUSTER: [string, string][] = [
  ["ぬ", "nu"],
  ["め", "me"],
  ["ね", "ne"],
  ["れ", "re"],
  ["る", "ru"],
];

// One exam question: the exercise plus the skill it trains (from its lesson),
// so the exam can attribute answers to the right Rank skill.
export interface ExamItem {
  exercise: Exercise;
  skill: SkillCategory;
}

export interface Exam {
  unitId: string;
  title: string;
  items: ExamItem[];
}

function loopClusterBoard(): Exercise {
  return {
    type: "match-pairs",
    prompt: "Match the kana to its sound",
    pairs: LOOP_CLUSTER.map(([left, right]) => ({ left, right })),
  };
}

function isLoopClusterBoard(ex: Exercise): boolean {
  if (ex.type !== "match-pairs") return false;
  const chars = new Set(ex.pairs.map((p) => p.left));
  return LOOP_CLUSTER.every(([char]) => chars.has(char)) && chars.size === LOOP_CLUSTER.length;
}

// Build a unit exam by pooling every exercise across the unit's lessons,
// shuffling, and taking up to EXAM_LENGTH (all if fewer). Reshuffled per call.
export function buildExam(unitId: string): Exam | null {
  const unit = getUnit(unitId);
  if (!unit) return null;

  const pool: ExamItem[] = unit.lessons.flatMap((lesson) =>
    lesson.exercises.map((exercise) => ({
      exercise,
      skill: exerciseSkill(exercise, lesson.skill),
    }))
  );
  if (pool.length === 0) return null;

  if (unitId === HIRAGANA_EXAM_UNIT) {
    const forced: ExamItem = { exercise: loopClusterBoard(), skill: "reading" };
    // Drop any lesson exercise that's an exact duplicate of the forced
    // board so it doesn't also turn up (shuffled) further down the exam.
    const rest = shuffle(pool.filter((item) => !isLoopClusterBoard(item.exercise))).slice(
      0,
      HIRAGANA_EXAM_LENGTH - 1
    );
    // Forced item lands at index 0 or 1, never shuffled to the back.
    const items = Math.random() < 0.5 ? [forced, ...rest] : [rest[0], forced, ...rest.slice(1)];
    return { unitId, title: unit.title, items: items.filter(Boolean) };
  }

  const items = shuffle(pool).slice(0, EXAM_LENGTH);
  return { unitId, title: unit.title, items };
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
