import type { Lesson } from "@/lib/types";

// Seed curriculum for the MVP: hiragana intro + basic greetings.
// Ordered — each lesson unlocks the next once completed.
export const lessons: Lesson[] = [
  {
    id: "hiragana-vowels",
    title: "Hiragana: Vowels",
    subtitle: "あ い う え お",
    icon: "あ",
    xp: 20,
    exercises: [
      {
        type: "translate-choice",
        prompt: "Which sound does this make?",
        display: "あ",
        options: ["a", "i", "u", "e"],
        answer: "a",
        note: "あ is pronounced like the 'a' in 'father'.",
      },
      {
        type: "translate-choice",
        prompt: "Which sound does this make?",
        display: "い",
        options: ["o", "e", "i", "a"],
        answer: "i",
        note: "い sounds like the 'ee' in 'see'.",
      },
      {
        type: "type-answer",
        prompt: "Type the romaji for this character",
        display: "う",
        answer: "u",
        note: "う sounds like the 'oo' in 'food'.",
      },
      {
        type: "match-pairs",
        prompt: "Match each character to its sound",
        pairs: [
          { left: "え", right: "e" },
          { left: "お", right: "o" },
          { left: "あ", right: "a" },
        ],
        note: "The five vowels are the foundation of every kana.",
      },
    ],
  },
  {
    id: "hiragana-ka-row",
    title: "Hiragana: K-row",
    subtitle: "か き く け こ",
    icon: "か",
    xp: 20,
    exercises: [
      {
        type: "translate-choice",
        prompt: "Which sound does this make?",
        display: "か",
        options: ["ka", "ki", "ku", "ko"],
        answer: "ka",
        note: "か = k + a.",
      },
      {
        type: "type-answer",
        prompt: "Type the romaji for this character",
        display: "き",
        answer: "ki",
        note: "き = k + i.",
      },
      {
        type: "match-pairs",
        prompt: "Match each character to its sound",
        pairs: [
          { left: "く", right: "ku" },
          { left: "け", right: "ke" },
          { left: "こ", right: "ko" },
        ],
        note: "Notice the pattern: consonant + vowel.",
      },
    ],
  },
  {
    id: "greetings",
    title: "Greetings",
    subtitle: "Say hello & thanks",
    icon: "👋",
    xp: 30,
    exercises: [
      {
        type: "translate-choice",
        prompt: "Select the meaning",
        display: "こんにちは",
        options: ["Good morning", "Hello", "Goodbye", "Thank you"],
        answer: "Hello",
        note: "こんにちは (konnichiwa) is a daytime greeting.",
      },
      {
        type: "translate-choice",
        prompt: "Select the meaning",
        display: "ありがとう",
        options: ["Sorry", "Please", "Thank you", "Hello"],
        answer: "Thank you",
        note: "ありがとう (arigatou) means 'thank you'.",
      },
      {
        type: "type-answer",
        prompt: "How do you say 'Good morning'? (romaji)",
        display: "おはよう",
        answer: "ohayou",
        accept: ["ohayo"],
        note: "おはよう (ohayou) — add ございます to be polite.",
      },
      {
        type: "build-sentence",
        prompt: "Build: 'Good evening'",
        display: "Good evening",
        tiles: ["こん", "ばん", "は"],
        answer: ["こん", "ばん", "は"],
        note: "こんばんは (konbanwa) is an evening greeting.",
      },
    ],
  },
  {
    id: "self-intro",
    title: "Introductions",
    subtitle: "Name & nice to meet you",
    icon: "🙋",
    xp: 30,
    exercises: [
      {
        type: "translate-choice",
        prompt: "Select the meaning",
        display: "はじめまして",
        options: [
          "Nice to meet you",
          "See you later",
          "I'm sorry",
          "Excuse me",
        ],
        answer: "Nice to meet you",
        note: "はじめまして (hajimemashite) is said when meeting someone new.",
      },
      {
        type: "build-sentence",
        prompt: "Build: 'I am Tanaka' (Tanaka desu)",
        display: "I am Tanaka",
        tiles: ["たなか", "です"],
        answer: ["たなか", "です"],
        note: "X です (desu) = 'I am X'. Simple and polite.",
      },
      {
        type: "type-answer",
        prompt: "How do you say 'Excuse me / Sorry'? (romaji)",
        display: "すみません",
        answer: "sumimasen",
        note: "すみません (sumimasen) works for both 'excuse me' and 'sorry'.",
      },
    ],
  },
];

export function getLesson(id: string): Lesson | undefined {
  return lessons.find((l) => l.id === id);
}

export function getLessonIndex(id: string): number {
  return lessons.findIndex((l) => l.id === id);
}
