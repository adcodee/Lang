import type { Exercise, Lesson, SkillCategory } from "@/lib/types";
import { getLesson } from "@/lib/content/curriculum";

// Dojo drills. Endless kinds (trace/category) render their own components;
// fixed kinds carry `exercises` and run through LessonPlayer (mode "drill").
// Each drill unlocks once the lesson that introduces its content is completed.
export type DrillKind =
  | "trace"
  | "category"
  | "match"
  | "listen"
  | "punctuation";

export interface DojoDrill {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  skill: SkillCategory;
  kind: DrillKind;
  unlockAfter: string; // lessonId that must be completed
  exercises?: Exercise[]; // present for fixed kinds
}

export const dojoDrills: DojoDrill[] = [
  {
    id: "trace",
    title: "Kana Trace",
    subtitle: "Draw the kana — auto-graded",
    icon: "✍️",
    skill: "writing",
    kind: "trace",
    unlockAfter: "u1-vowels",
  },
  {
    id: "category",
    title: "Category Fill",
    subtitle: "Sort kana & words into groups",
    icon: "🗂️",
    skill: "writing",
    kind: "category",
    unlockAfter: "u1-ka-row", // need 2+ groups to sort
  },
  {
    id: "match",
    title: "Quick Match Pairs",
    subtitle: "Kana ↔ sound",
    icon: "⚡",
    skill: "listening",
    kind: "match",
    unlockAfter: "u1-vowels",
    exercises: [
      {
        type: "match-pairs",
        prompt: "Match the kana to its sound",
        pairs: [
          { left: "あ", right: "a" },
          { left: "か", right: "ka" },
          { left: "さ", right: "sa" },
          { left: "た", right: "ta" },
        ],
      },
      {
        type: "match-pairs",
        prompt: "Match the word to its meaning",
        pairs: [
          { left: "りんご", right: "apple" },
          { left: "くるま", right: "car" },
          { left: "ほん", right: "book" },
        ],
      },
    ],
  },
  {
    id: "listen",
    title: "Listen & Repeat",
    subtitle: "Hear it, then say it",
    icon: "👂",
    skill: "speaking",
    kind: "listen",
    unlockAfter: "u2-greetings-core",
    exercises: [
      {
        type: "listen-choice",
        prompt: "What did you hear?",
        audio: "こんにちは",
        options: ["Hello", "Thank you", "Good evening", "Goodbye"],
        answer: "Hello",
      },
      {
        type: "speak-phrase",
        prompt: "Now say it back",
        display: "こんにちは",
        romaji: "konnichiwa",
        accept: ["こんにちわ", "konnichiwa"],
      },
      {
        type: "speak-phrase",
        prompt: "Say 'Thank you'",
        display: "ありがとう",
        romaji: "arigatou",
        accept: ["ありがとうございます", "arigato", "arigatou"],
      },
    ],
  },
  {
    id: "punctuation",
    title: "Punctuation Dojo",
    subtitle: "Fix the 。 、 ー っ",
    icon: "。",
    skill: "punctuation",
    kind: "punctuation",
    unlockAfter: "u2-punctuation",
    exercises: [
      {
        type: "translate-choice",
        prompt: "Which mark ends a statement?",
        display: "？",
        options: ["。", "、", "ー", "っ"],
        answer: "。",
        note: "。 (maru) is the full stop.",
      },
      {
        type: "build-sentence",
        prompt: "Build 'Thank you.' with the full stop",
        display: "Thank you.",
        tiles: ["ありがとう", "。"],
        answer: ["ありがとう", "。"],
        note: "End statements with 。.",
      },
      {
        type: "translate-choice",
        prompt: "How is らーめん read?",
        display: "らーめん",
        options: ["raamen (long a)", "ramen (short)", "ra-men-u", "rai-men"],
        answer: "raamen (long a)",
        note: "ー lengthens the vowel before it.",
      },
    ],
  },
];

export function getDrillConfig(id: string): DojoDrill | undefined {
  return dojoDrills.find((d) => d.id === id);
}

export function isDrillUnlocked(drill: DojoDrill, completed: string[]): boolean {
  return completed.includes(drill.unlockAfter);
}

// Title of the lesson a drill unlocks after (for the "Complete X" hint).
export function unlockLessonTitle(drill: DojoDrill): string {
  return getLesson(drill.unlockAfter)?.title ?? "the relevant lesson";
}

// Lesson-shaped view for the fixed kinds, consumed by LessonPlayer.
export function getDrill(id: string): Lesson | undefined {
  const d = getDrillConfig(id);
  if (!d || !d.exercises) return undefined;
  return {
    id: d.id,
    title: d.title,
    subtitle: d.subtitle,
    icon: d.icon,
    skill: d.skill,
    xp: 0,
    exercises: d.exercises,
  };
}

// First unlocked drill that trains a given skill (for "Train your weakness").
export function getDrillForSkill(
  skill: SkillCategory,
  completed: string[]
): DojoDrill | undefined {
  return dojoDrills.find(
    (d) => d.skill === skill && isDrillUnlocked(d, completed)
  );
}

// Build a synthetic "Review mistakes" drill from flagged revision item ids
// (`${lessonId}#${exerciseIndex}`). Returns null when nothing is flagged.
export function buildReviewLesson(itemIds: string[]): Lesson | null {
  const exercises = itemIds
    .map((id) => {
      const [lessonId, idxStr] = id.split("#");
      return getLesson(lessonId)?.exercises[Number(idxStr)];
    })
    .filter((ex): ex is Exercise => Boolean(ex));

  if (exercises.length === 0) return null;

  return {
    id: "review",
    title: "Review mistakes",
    subtitle: "Questions you missed",
    icon: "🔁",
    skill: "writing", // unused — review mode doesn't record skill stats
    xp: 0,
    exercises,
  };
}
