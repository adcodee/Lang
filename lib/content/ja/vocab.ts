// Every concrete word/phrase the curriculum teaches (via phrase teach cards),
// tagged with a category + the lesson that introduces it. Drives the SRS
// review ("what can resurface") and drill scoping — content the learner has
// met and nothing else. Grammar patterns (です, 〜さい, question sentences)
// are deliberately not registered; they're taught in context, not drilled as
// vocabulary.
export interface Vocab {
  word: string;
  gloss: string;
  category: string; // bucket label
  lessonId: string;
}

export const vocab: Vocab[] = [
  // u2-greetings-core — greetings
  { word: "おはよう", gloss: "good morning", category: "あいさつ (greetings)", lessonId: "u2-greetings-core" },
  { word: "こんにちは", gloss: "hello (daytime)", category: "あいさつ (greetings)", lessonId: "u2-greetings-core" },
  { word: "こんばんは", gloss: "good evening", category: "あいさつ (greetings)", lessonId: "u2-greetings-core" },
  { word: "ありがとう", gloss: "thank you", category: "あいさつ (greetings)", lessonId: "u2-greetings-core" },
  // u2-self-intro — introductions
  { word: "はじめまして", gloss: "nice to meet you (first time)", category: "あいさつ (greetings)", lessonId: "u2-self-intro" },
  { word: "わたし", gloss: "I (polite)", category: "あいさつ (greetings)", lessonId: "u2-self-intro" },
  { word: "よろしく", gloss: "I look forward to this (after an intro)", category: "あいさつ (greetings)", lessonId: "u2-self-intro" },
  { word: "すみません", gloss: "excuse me / sorry", category: "あいさつ (greetings)", lessonId: "u2-self-intro" },
  // u3-numbers-1-10 — numbers
  { word: "いち", gloss: "one (1)", category: "かず (numbers)", lessonId: "u3-numbers-1-10" },
  { word: "に", gloss: "two (2)", category: "かず (numbers)", lessonId: "u3-numbers-1-10" },
  { word: "さん", gloss: "three (3)", category: "かず (numbers)", lessonId: "u3-numbers-1-10" },
  { word: "よん", gloss: "four (4)", category: "かず (numbers)", lessonId: "u3-numbers-1-10" },
  { word: "ご", gloss: "five (5)", category: "かず (numbers)", lessonId: "u3-numbers-1-10" },
  { word: "ろく", gloss: "six (6)", category: "かず (numbers)", lessonId: "u3-numbers-1-10" },
  { word: "なな", gloss: "seven (7)", category: "かず (numbers)", lessonId: "u3-numbers-1-10" },
  { word: "はち", gloss: "eight (8)", category: "かず (numbers)", lessonId: "u3-numbers-1-10" },
  { word: "きゅう", gloss: "nine (9)", category: "かず (numbers)", lessonId: "u3-numbers-1-10" },
  { word: "じゅう", gloss: "ten (10)", category: "かず (numbers)", lessonId: "u3-numbers-1-10" },
  // u4-family — address forms (calling / someone else's family)
  { word: "おかあさん", gloss: "mother (address)", category: "かぞく (family)", lessonId: "u4-family" },
  { word: "おとうさん", gloss: "father (address)", category: "かぞく (family)", lessonId: "u4-family" },
  { word: "おにいさん", gloss: "older brother (address)", category: "かぞく (family)", lessonId: "u4-family" },
  { word: "いもうとさん", gloss: "younger sister (address)", category: "かぞく (family)", lessonId: "u4-family" },
  // u4-people-things — people vs things
  { word: "せんせい", gloss: "teacher", category: "ひと (people)", lessonId: "u4-people-things" },
  { word: "ほん", gloss: "book", category: "もの (things)", lessonId: "u4-people-things" },
  { word: "くるま", gloss: "car", category: "もの (things)", lessonId: "u4-people-things" },
  { word: "でんわ", gloss: "phone", category: "もの (things)", lessonId: "u4-people-things" },
  // u4-food-objects — food vs objects
  { word: "ごはん", gloss: "rice / a meal", category: "たべもの (food)", lessonId: "u4-food-objects" },
  { word: "さかな", gloss: "fish", category: "たべもの (food)", lessonId: "u4-food-objects" },
  { word: "りんご", gloss: "apple", category: "たべもの (food)", lessonId: "u4-food-objects" },
  { word: "やさい", gloss: "vegetable", category: "たべもの (food)", lessonId: "u4-food-objects" },
  { word: "いえ", gloss: "house", category: "もの (objects)", lessonId: "u4-food-objects" },
  { word: "つくえ", gloss: "desk", category: "もの (objects)", lessonId: "u4-food-objects" },
  // u5-size-temp — adjectives (size & temperature)
  { word: "おおきい", gloss: "big", category: "けいようし (adjectives)", lessonId: "u5-size-temp" },
  { word: "ちいさい", gloss: "small", category: "けいようし (adjectives)", lessonId: "u5-size-temp" },
  { word: "あつい", gloss: "hot (weather)", category: "けいようし (adjectives)", lessonId: "u5-size-temp" },
  { word: "さむい", gloss: "cold (weather)", category: "けいようし (adjectives)", lessonId: "u5-size-temp" },
  // u5-positive-negative — adjectives (judgement)
  { word: "おいしい", gloss: "delicious", category: "けいようし (adjectives)", lessonId: "u5-positive-negative" },
  { word: "まずい", gloss: "bad-tasting", category: "けいようし (adjectives)", lessonId: "u5-positive-negative" },
  { word: "いい", gloss: "good", category: "けいようし (adjectives)", lessonId: "u5-positive-negative" },
  { word: "わるい", gloss: "bad", category: "けいようし (adjectives)", lessonId: "u5-positive-negative" },
  { word: "あたらしい", gloss: "new", category: "けいようし (adjectives)", lessonId: "u5-positive-negative" },
  { word: "ふるい", gloss: "old (things)", category: "けいようし (adjectives)", lessonId: "u5-positive-negative" },
];

export function learnedVocab(completed: string[]): Vocab[] {
  return vocab.filter((v) => completed.includes(v.lessonId));
}
