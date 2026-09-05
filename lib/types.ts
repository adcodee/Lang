// Shared domain types for the Lang app.

export type ExerciseType =
  | "translate-choice" // pick the correct translation from options
  | "match-pairs" // match Japanese <-> English pairs
  | "type-answer" // type the romaji / English answer
  | "build-sentence" // assemble word tiles into a sentence
  | "listen-choice" // hear audio, pick what it means
  | "speak-phrase" // see a phrase, say it aloud (speech recognition)
  | "category-sort"; // park items into the correct buckets

// The five learning skills every unit aims to cover.
export type SkillCategory =
  | "reading"
  | "speaking"
  | "writing"
  | "listening"
  | "punctuation";

// Optional per-exercise override of the lesson's skill, for stat attribution
// (e.g. one listening question inside a reading lesson). Listen-choice and
// speak-phrase are modality-bound and default to listening/speaking anyway —
// see exerciseSkill() in lib/exercise.ts.
interface ExerciseBase {
  skill?: SkillCategory;
}

export interface TranslateChoiceExercise extends ExerciseBase {
  type: "translate-choice";
  prompt: string; // e.g. "Select the meaning of こんにちは"
  display: string; // the term shown big, e.g. "こんにちは"
  options: string[];
  answer: string; // must be one of options
  note?: string; // short teaching note shown after answering
}

export interface MatchPairsExercise extends ExerciseBase {
  type: "match-pairs";
  prompt: string;
  pairs: { left: string; right: string }[];
  note?: string;
}

export interface TypeAnswerExercise extends ExerciseBase {
  type: "type-answer";
  prompt: string;
  display: string;
  answer: string; // accepted answer (case/space-insensitive)
  accept?: string[]; // additional accepted answers
  note?: string;
}

export interface BuildSentenceExercise extends ExerciseBase {
  type: "build-sentence";
  prompt: string;
  display: string; // the English/meaning to translate
  tiles: string[]; // shuffled word tiles
  answer: string[]; // correct ordered tiles
  note?: string;
}

// hear it (TTS) -> pick the meaning/kana. No on-screen Japanese.
export interface ListenChoiceExercise extends ExerciseBase {
  type: "listen-choice";
  prompt: string;
  audio: string; // Japanese text fed to speak()
  options: string[];
  answer: string; // must be one of options
  note?: string;
}

// see it -> say it -> matched against speech recognition transcript.
export interface SpeakPhraseExercise extends ExerciseBase {
  type: "speak-phrase";
  prompt: string;
  display: string; // the Japanese phrase to say
  romaji?: string; // pronunciation hint shown under the phrase
  accept?: string[]; // extra accepted transcripts
  note?: string;
}

// park each item into its correct bucket (the "sorting game" mechanic).
export interface CategorySortExercise extends ExerciseBase {
  type: "category-sort";
  prompt: string;
  categories: string[]; // bucket labels
  // Each item carries its correct bucket — avoids empty-bucket / lookup bugs.
  items: { label: string; romaji?: string; category: string }[];
  note?: string;
}

export type Exercise =
  | TranslateChoiceExercise
  | MatchPairsExercise
  | TypeAnswerExercise
  | BuildSentenceExercise
  | ListenChoiceExercise
  | SpeakPhraseExercise
  | CategorySortExercise;

// One character's intro shown in the Teach phase before the exercises.
export interface KanaTeachCard {
  kind?: "kana"; // default; omitted on existing content
  char: string; // あ
  romaji: string; // a
  mnemonic: string; // "あ looks like a fish saying 'ah'"
  mnemonicEmoji?: string; // 🐟
  example: { word: string; romaji: string; meaning: string }; // あめ / ame / rain
  // A pair heard/seen side by side: what a diacritic does (か↔が), what a
  // silent mark does to a word (きて↔きって), or a lookalike to tell apart
  // (は↔ほ). `label` overrides the default caption.
  contrast?: {
    label?: string;
    a: { word: string; romaji: string; meaning: string };
    b: { word: string; romaji: string; meaning: string };
  };
}

// One segment of a phrase's interactive breakdown.
export interface PhrasePart {
  kana: string; // a segment of the term, e.g. "は" or "こ"
  reading: string; // in-context sound, e.g. "wa"
  base?: string; // literal sound when it differs (triggers the "why" callout)
  note?: string; // e.g. "sentence-ending は is said 'wa'"
}

// A quick active-recall question shown in the breakdown.
export interface PhraseCheck {
  prompt: string;
  options: string[];
  answer: string;
  note?: string; // explanation shown after answering
}

// One taught situation for a phrase. Keep to 1–2 per first teach; tests and
// vocab.gloss should match these, not a fake one-line English equivalent.
export interface PhraseUse {
  situation: string; // "After you introduce yourself"
  english: string; // "I look forward to this"
  example?: string; // the Japanese line it sits in
}

// A word/phrase intro (greetings, nouns, adjectives) — hear it, read it, say
// it, and (optionally) break it down interactively. No stroke order for the
// whole word; a single tricky kana can offer a trace hook.
export interface PhraseTeachCard {
  kind: "phrase";
  term: string; // こんにちは
  reading: string; // konnichiwa
  meaning: string; // Hello (daytime) — primary use, not a dictionary dump
  note?: string; // short usage tip
  parts?: PhrasePart[]; // interactive kana-by-kana breakdown
  check?: PhraseCheck; // 1-tap active recall
  context?: string; // when/where you'd say it
  uses?: PhraseUse[]; // 1–2 taught situations; omit on thin cards
  polite?: { term: string; reading: string; note?: string }; // variant + when
  trace?: string; // one kana to trace (only if strokeData has it)
}

export type TeachCard = KanaTeachCard | PhraseTeachCard;

export interface Lesson {
  id: string; // globally unique — used by completedLessons + routing
  title: string;
  subtitle: string;
  icon: string; // emoji used on the node
  skill: SkillCategory; // which skill this lesson trains
  xp: number; // bonus XP awarded on completion
  teach?: TeachCard[]; // optional intro phase shown before exercises
  // Mandatory review checkpoint: no new material, mixes previously-taught
  // items to keep them fresh. Rendered as a distinct dojo node in the path.
  checkpoint?: boolean;
  exercises: Exercise[];
}

// A group of related lessons spanning the four skills.
export interface Unit {
  id: string;
  title: string;
  subtitle: string;
  lessons: Lesson[];
}

// A proficiency tier containing several units.
export interface Level {
  id: "beginner" | "intermediate" | "advanced" | "fluent";
  title: string;
  blurb: string;
  comingSoon?: boolean; // true while the level has no authored content yet
  units: Unit[];
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  correction?: string; // grammar correction surfaced by Claude
}

// Per-skill performance, accumulated across every answered exercise.
export interface SkillStat {
  correct: number;
  total: number;
  xp: number;
}

export type SkillStats = Record<SkillCategory, SkillStat>;

export interface GameState {
  xp: number;
  streak: number;
  lastActiveDay: string | null; // YYYY-MM-DD
  // Checkpoint-lives (patch 1.2.2): a shared pool spent on a lesson-test
  // fail, refilled to maxLives on a checkpoint pass. Distinct from
  // ExamPlayer's own local per-attempt hearts, which this never touches.
  lives: number;
  completedLessons: string[];
  // Lessons whose Learn part (teach + recall) is done — gates the Test part.
  learnedLessons: string[];
  skillStats: SkillStats;
  // Items missed on the first try, kept for revision (id = `${lessonId}#${i}`).
  revisionItems: string[];
  // How many flagged items belong to each skill (drives weakness training).
  revisionSkills: Record<SkillCategory, number>;
  // Unit ids whose end-of-unit exam has been passed (belt earned + gate open).
  examsPassed: string[];
  // Spaced-repetition schedule per item (`kana:さ` / `vocab:...`).
  seen: Record<string, { last: number; level: number }>;
  // Scheduled-review accuracy per local day — the retention signal (are
  // recalls holding up over time?), as opposed to streak/XP vanity metrics.
  reviewLog: { day: string; total: number; correct: number }[];
}
