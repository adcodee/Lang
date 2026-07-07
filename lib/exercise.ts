import type { Exercise, SkillCategory } from "@/lib/types";

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
