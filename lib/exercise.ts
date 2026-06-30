import type { Exercise } from "@/lib/types";

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
