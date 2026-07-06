// Unit-4 nouns for the Category Fill drill, tagged with category + the lesson
// that introduces them, so boards only use words the learner has met.
export interface Vocab {
  word: string;
  gloss: string;
  category: string; // bucket label
  lessonId: string;
}

export const vocab: Vocab[] = [
  // u4-people-things — people vs things
  { word: "おかあさん", gloss: "mother", category: "ひと (people)", lessonId: "u4-people-things" },
  { word: "おとうさん", gloss: "father", category: "ひと (people)", lessonId: "u4-people-things" },
  { word: "せんせい", gloss: "teacher", category: "ひと (people)", lessonId: "u4-people-things" },
  { word: "ほん", gloss: "book", category: "もの (things)", lessonId: "u4-people-things" },
  { word: "くるま", gloss: "car", category: "もの (things)", lessonId: "u4-people-things" },
  { word: "でんわ", gloss: "phone", category: "もの (things)", lessonId: "u4-people-things" },
  // u4-food-objects — food vs objects
  { word: "ごはん", gloss: "rice", category: "たべもの (food)", lessonId: "u4-food-objects" },
  { word: "さかな", gloss: "fish", category: "たべもの (food)", lessonId: "u4-food-objects" },
  { word: "りんご", gloss: "apple", category: "たべもの (food)", lessonId: "u4-food-objects" },
  { word: "やさい", gloss: "vegetable", category: "たべもの (food)", lessonId: "u4-food-objects" },
  { word: "いえ", gloss: "house", category: "もの (objects)", lessonId: "u4-food-objects" },
  { word: "つくえ", gloss: "desk", category: "もの (objects)", lessonId: "u4-food-objects" },
];

export function learnedVocab(completed: string[]): Vocab[] {
  return vocab.filter((v) => completed.includes(v.lessonId));
}
