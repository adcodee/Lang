export interface Vocab {
  word: string;
  gloss: string;
  category: string;
  lessonId: string;
}

export const vocab: Vocab[] = [
  { word: "a", gloss: "short a (as in 'father')", category: "sounds", lessonId: "lg-u0-vowels" },
  { word: "e", gloss: "short e (as in 'bed', tenser)", category: "sounds", lessonId: "lg-u0-vowels" },
  { word: "i", gloss: "short i (as in 'see' but shorter)", category: "sounds", lessonId: "lg-u0-vowels" },
  { word: "o", gloss: "short o (as in 'or', pure)", category: "sounds", lessonId: "lg-u0-vowels" },
  { word: "u", gloss: "short u (as in 'food' but shorter)", category: "sounds", lessonId: "lg-u0-vowels" },
  { word: "kola", gloss: "work / do", category: "length-pairs", lessonId: "lg-u0-length" },
  { word: "koola", gloss: "weed (the garden)", category: "length-pairs", lessonId: "lg-u0-length" },
  { word: "tuma", gloss: "send", category: "length-pairs", lessonId: "lg-u0-length" },
  { word: "tuuma", gloss: "name / give a name", category: "length-pairs", lessonId: "lg-u0-length" },
  { word: "bana", gloss: "four", category: "length-pairs", lessonId: "lg-u0-length" },
  { word: "baana", gloss: "children", category: "length-pairs", lessonId: "lg-u0-length" },
  { word: "kuba", gloss: "to be", category: "length-pairs", lessonId: "lg-u0-length" },
  { word: "kubba", gloss: "to steal", category: "length-pairs", lessonId: "lg-u0-length" },
  { word: "nyama", gloss: "meat", category: "sounds", lessonId: "lg-u0-ny-ng" },
  { word: "ng'ombe", gloss: "cow", category: "sounds", lessonId: "lg-u0-ny-ng" },
];

export function learnedVocab(completed: string[]): Vocab[] {
  return vocab.filter((v) => completed.includes(v.lessonId));
}
