// Shared domain types for the Lang app.

export type ExerciseType =
  | "translate-choice" // pick the correct translation from options
  | "match-pairs" // match Japanese <-> English pairs
  | "type-answer" // type the romaji / English answer
  | "build-sentence"; // assemble word tiles into a sentence

export interface TranslateChoiceExercise {
  type: "translate-choice";
  prompt: string; // e.g. "Select the meaning of こんにちは"
  display: string; // the term shown big, e.g. "こんにちは"
  options: string[];
  answer: string; // must be one of options
  note?: string; // short teaching note shown after answering
}

export interface MatchPairsExercise {
  type: "match-pairs";
  prompt: string;
  pairs: { left: string; right: string }[];
  note?: string;
}

export interface TypeAnswerExercise {
  type: "type-answer";
  prompt: string;
  display: string;
  answer: string; // accepted answer (case/space-insensitive)
  accept?: string[]; // additional accepted answers
  note?: string;
}

export interface BuildSentenceExercise {
  type: "build-sentence";
  prompt: string;
  display: string; // the English/meaning to translate
  tiles: string[]; // shuffled word tiles
  answer: string[]; // correct ordered tiles
  note?: string;
}

export type Exercise =
  | TranslateChoiceExercise
  | MatchPairsExercise
  | TypeAnswerExercise
  | BuildSentenceExercise;

export interface Lesson {
  id: string;
  title: string;
  subtitle: string;
  icon: string; // emoji used on the node
  xp: number; // bonus XP awarded on completion
  exercises: Exercise[];
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  correction?: string; // grammar correction surfaced by Claude
}

export interface GameState {
  xp: number;
  streak: number;
  lastActiveDay: string | null; // YYYY-MM-DD
  hearts: number;
  completedLessons: string[];
}
