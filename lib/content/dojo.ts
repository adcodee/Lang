import type { Exercise, Lesson, SkillCategory } from "@/lib/types";
import { getLesson } from "@/lib/content/curriculum";

// Dojo drills — standalone, replayable practice not tied to lesson progression.
// They reuse the Lesson shape so LessonPlayer can render them in freePlay mode.
// Each drill tags a `skill` so the Rank tab attributes the practice correctly.
export const dojoDrills: Lesson[] = [
  {
    id: "drill-kana-sort",
    title: "Vowel & Kana Sorting",
    subtitle: "Park kana into their rows",
    icon: "🗂️",
    skill: "writing",
    xp: 0,
    exercises: [
      {
        type: "category-sort",
        prompt: "Sort each kana into its row",
        categories: ["Vowels", "K-row", "S-row"],
        items: [
          { label: "あ", romaji: "a", category: "Vowels" },
          { label: "え", romaji: "e", category: "Vowels" },
          { label: "か", romaji: "ka", category: "K-row" },
          { label: "こ", romaji: "ko", category: "K-row" },
          { label: "さ", romaji: "sa", category: "S-row" },
          { label: "す", romaji: "su", category: "S-row" },
        ],
      },
    ],
  },
  {
    id: "drill-word-categorise",
    title: "Word Categorising",
    subtitle: "Food, people & objects",
    icon: "🍙",
    skill: "writing",
    xp: 0,
    exercises: [
      {
        type: "category-sort",
        prompt: "Park each word into the right group",
        categories: ["たべもの (food)", "ひと (people)", "もの (objects)"],
        items: [
          { label: "ごはん", romaji: "rice", category: "たべもの (food)" },
          { label: "りんご", romaji: "apple", category: "たべもの (food)" },
          { label: "せんせい", romaji: "teacher", category: "ひと (people)" },
          { label: "おかあさん", romaji: "mother", category: "ひと (people)" },
          { label: "くるま", romaji: "car", category: "もの (objects)" },
          { label: "ほん", romaji: "book", category: "もの (objects)" },
        ],
      },
    ],
  },
  {
    id: "drill-punctuation",
    title: "Punctuation Dojo",
    subtitle: "Fix the 。 、 ー っ",
    icon: "。",
    skill: "punctuation",
    xp: 0,
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
  {
    id: "drill-listen-repeat",
    title: "Listen & Repeat",
    subtitle: "Hear it, then say it",
    icon: "👂",
    skill: "speaking",
    xp: 0,
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
    id: "drill-quick-match",
    title: "Quick Match Pairs",
    subtitle: "Kana ↔ meaning",
    icon: "⚡",
    skill: "listening",
    xp: 0,
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
];

export function getDrill(id: string): Lesson | undefined {
  return dojoDrills.find((d) => d.id === id);
}

// The drill that best trains a given skill (for "Train your weakness").
export function getDrillForSkill(skill: SkillCategory): Lesson | undefined {
  return dojoDrills.find((d) => d.skill === skill);
}

// Build a synthetic "Review mistakes" drill from flagged revision item ids
// (`${lessonId}#${exerciseIndex}`). Returns null when nothing is flagged.
export function buildReviewLesson(itemIds: string[]): Lesson | null {
  const exercises = itemIds
    .map((id) => {
      const [lessonId, idxStr] = id.split("#");
      const ex = getLesson(lessonId)?.exercises[Number(idxStr)];
      return ex;
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
