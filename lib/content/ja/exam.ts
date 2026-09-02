import type { Exercise, SkillCategory } from "@/lib/types";
import { getUnit } from "@/lib/content/ja/curriculum";
import { exerciseSkill } from "@/lib/exercise";
import { generateFiller } from "@/lib/content/ja/lessonExercises";
import { kana } from "@/lib/content/ja/kana";
import { vocab } from "@/lib/content/ja/vocab";

// Patch 1.2, Phase E: every unit exam pools deeper now (30, up from 10 /
// 16) — see lessonExercises.ts's generateFiller for how the pool is padded
// once a unit's own hand-authored exercises run short of the target.
const EXAM_LENGTH = 30;

// u1-hiragana only: guaranteed to include the N/M/R-row loop-cluster
// (ぬ/め/ね/れ/る) as a single muted match board, forced near the front
// rather than left to shuffle-to-the-end — these are the kana this whole
// patch exists to stop learners guessing past. Not the full "unseen
// combinations" exam generator (Phase 4 in the JP build plan); forced
// loop-cluster + the standard EXAM_LENGTH bank is the gate for this pass.
const HIRAGANA_EXAM_UNIT = "u1-hiragana";
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

  // Pad the pool with generated filler, drawn only from kana/vocab this
  // unit itself teaches, once the hand-authored exercises across the
  // unit's lessons fall short of EXAM_LENGTH — same generator Phase E uses
  // for lessons/checkpoints, so the content rule holds the same way.
  const unitLessonIds = new Set(unit.lessons.map((l) => l.id));
  const shortfall = EXAM_LENGTH - pool.length;
  const fallbackSkill = unit.lessons[0]?.skill ?? "reading";
  const filler: ExamItem[] =
    shortfall > 0
      ? generateFiller(
          {
            kana: kana.filter((k) => unitLessonIds.has(k.lessonId)),
            vocab: vocab.filter((v) => unitLessonIds.has(v.lessonId)),
          },
          { kana: [], vocab: [] },
          shortfall,
          "balanced"
        ).map((exercise) => ({ exercise, skill: exerciseSkill(exercise, fallbackSkill) }))
      : [];
  const fullPool = [...pool, ...filler];

  if (unitId === HIRAGANA_EXAM_UNIT) {
    const forced: ExamItem = { exercise: loopClusterBoard(), skill: "reading" };
    // Drop any lesson/filler exercise that's an exact duplicate of the
    // forced board so it doesn't also turn up (shuffled) further down.
    const rest = shuffle(fullPool.filter((item) => !isLoopClusterBoard(item.exercise))).slice(
      0,
      EXAM_LENGTH - 1
    );
    // Forced item lands at index 0 or 1, never shuffled to the back.
    const items = Math.random() < 0.5 ? [forced, ...rest] : [rest[0], forced, ...rest.slice(1)];
    return { unitId, title: unit.title, items: items.filter(Boolean) };
  }

  const items = shuffle(fullPool).slice(0, EXAM_LENGTH);
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
