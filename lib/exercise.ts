import type { Exercise, SkillCategory } from "@/lib/types";
import { CONFUSION_PAIRS } from "@/lib/content/ja/matchBoards";

// Which skill an exercise trains, for stat attribution. Explicit override
// first; listen-choice/speak-phrase are modality-bound regardless of their
// lesson's default; everything else inherits the lesson's skill.
export function exerciseSkill(
  exercise: Exercise,
  lessonSkill: SkillCategory
): SkillCategory {
  if (exercise.skill) return exercise.skill;
  if (exercise.type === "listen-choice") return "listening";
  if (exercise.type === "speak-phrase") return "speaking";
  return lessonSkill;
}

// True when missing this exercise on the first try means the learner hasn't
// actually learned to tell a genuine near-twin apart (ぬ/め, き/さ, etc.) —
// LessonPlayer blocks lesson completion on a first-try miss here regardless
// of the overall accuracy rate, since a passing rate can hide exactly the
// one confusion the lesson exists to catch.
export function isDiscriminationItem(ex: Exercise): boolean {
  if (ex.type === "match-pairs") {
    // `left` is the kana char (see matchBoards.ts's board shape) — a board
    // counts if it puts both members of a confusion pair in front of the
    // learner together, not by literally matching {left,right} against
    // CONFUSION_PAIRS (which pairs kana with kana, not kana with romaji).
    const chars = new Set(ex.pairs.map((p) => p.left));
    return CONFUSION_PAIRS.some(([a, b]) => chars.has(a) && chars.has(b));
  }
  if (ex.type === "translate-choice") {
    // Checks both display and answer, not just display: a "which one is
    // nu?" item (display "❓", answer "ぬ") tests the same discrimination
    // as a "what sound does ぬ make?" item (display "ぬ") — the axis that
    // matters is which kana the learner has to correctly identify, not
    // which field happens to hold it.
    return CONFUSION_PAIRS.some(
      ([a, b]) => ex.display === a || ex.display === b || ex.answer === a || ex.answer === b
    );
  }
  return false;
}

// Human-readable "correct answer" label for an exercise, shown in feedback when
// the learner gets it wrong. Shared by the lesson and exam players.
export function answerLabel(exercise: Exercise): string {
  switch (exercise.type) {
    case "translate-choice":
    case "type-answer":
      return exercise.answer;
    case "build-sentence":
      return exercise.answer.join(" ");
    case "match-pairs":
      return exercise.pairs.map((p) => `${p.left}=${p.right}`).join(", ");
    case "listen-choice":
      return exercise.answer;
    case "speak-phrase":
      return exercise.romaji
        ? `${exercise.display} (${exercise.romaji})`
        : exercise.display;
    case "category-sort":
      return exercise.categories
        .map(
          (cat) =>
            `${cat}: ${exercise.items
              .filter((it) => it.category === cat)
              .map((it) => it.label)
              .join(", ")}`
        )
        .join(" · ");
  }
}
