import type { Exercise, Lesson, SkillCategory, TeachCard } from "@/lib/types";
import { allLessons, getLesson } from "@/lib/content/curriculum";
import { learnedKana } from "@/lib/content/kana";
import { learnedVocab } from "@/lib/content/vocab";
import { isDue, kanaItemId, vocabItemId, type SeenEntry } from "@/lib/srs";

// Dojo drills. Endless kinds (trace/category) render their own components;
// fixed kinds carry `exercises` and run through LessonPlayer (mode "drill").
// Each drill unlocks once the lesson that introduces its content is completed.
export type DrillKind =
  | "trace"
  | "vowel-sort"
  | "lookalike"
  | "word-flash"
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
    id: "vowel-sort",
    title: "Vowel Row Sort",
    subtitle: "Sort kana by their vowel sound",
    icon: "🔤",
    skill: "reading",
    kind: "vowel-sort",
    // Unlocks once the vowels are learned, then grows one row at a time as
    // each later row lesson is completed (the drill draws only from learned kana).
    unlockAfter: "u1-vowels",
  },
  {
    id: "lookalike",
    title: "Lookalike Pairs",
    subtitle: "Near-twins — pick the right one",
    icon: "👯",
    skill: "listening",
    kind: "lookalike",
    // あ/お is available from the vowels; more twins join as rows are learned.
    unlockAfter: "u1-vowels",
  },
  {
    id: "word-flash",
    title: "Word Flash",
    subtitle: "Read the word, pick its meaning",
    icon: "📖",
    skill: "reading",
    kind: "word-flash",
    // First lesson that registers enough vocab for distractors.
    unlockAfter: "u2-greetings-core",
  },
  {
    id: "match",
    title: "Quick Match Pairs",
    subtitle: "Kana ↔ sound",
    icon: "⚡",
    skill: "listening",
    kind: "match",
    unlockAfter: "u1-vowels",
    // Content rule: this unlocks right after the vowels lesson, so it may only
    // use vowel kana — no later rows or vocab.
    exercises: [
      {
        type: "match-pairs",
        prompt: "Match the kana to its sound",
        pairs: [
          { left: "あ", right: "a" },
          { left: "い", right: "i" },
          { left: "う", right: "u" },
          { left: "え", right: "e" },
        ],
      },
      {
        type: "match-pairs",
        prompt: "Match the kana to its sound",
        pairs: [
          { left: "お", right: "o" },
          { left: "え", right: "e" },
          { left: "あ", right: "a" },
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

// Authored teach cards indexed by SRS id (`kana:X` / `vocab:X`), so review
// re-teaching shows the real mnemonic/breakdown instead of a bare fabricated
// card. Built lazily once — curriculum content is static.
let teachCardIndex: Map<string, TeachCard> | null = null;
function authoredCard(srsId: string): TeachCard | undefined {
  if (!teachCardIndex) {
    teachCardIndex = new Map();
    for (const l of allLessons()) {
      for (const c of l.teach ?? []) {
        teachCardIndex.set(
          c.kind === "phrase" ? vocabItemId(c.term) : kanaItemId(c.char),
          c
        );
      }
    }
  }
  return teachCardIndex.get(srsId);
}

// Learned kana/vocab that are due for spaced-repetition review, as teach cards
// the RecallRound can quiz over. Snapshot once per review session.
export function dueReviewCards(
  completed: string[],
  seen: Record<string, SeenEntry>
): TeachCard[] {
  return collectReviewCards(completed, seen).due;
}

// The deck a review session actually runs. RecallRound needs 2+ cards for
// distractors, so a lone due item is padded with a couple of non-due learned
// cards — a little extra review instead of silently skipping the due one.
export function reviewDeck(
  completed: string[],
  seen: Record<string, SeenEntry>
): TeachCard[] {
  const { due, fresh } = collectReviewCards(completed, seen);
  if (due.length === 1 && fresh.length > 0) {
    return [...due, ...shuffleCards(fresh).slice(0, 2)];
  }
  return due;
}

function collectReviewCards(
  completed: string[],
  seen: Record<string, SeenEntry>
): { due: TeachCard[]; fresh: TeachCard[] } {
  const now = Date.now();
  const due: TeachCard[] = [];
  const fresh: TeachCard[] = []; // learned but not due (padding material)
  for (const k of learnedKana(completed)) {
    const id = kanaItemId(k.char);
    const card: TeachCard =
      authoredCard(id) ?? {
        char: k.char,
        romaji: k.romaji,
        mnemonic: "",
        example: { word: k.char, romaji: k.romaji, meaning: "" },
      };
    (isDue(seen[id], now) ? due : fresh).push(card);
  }
  for (const v of learnedVocab(completed)) {
    const id = vocabItemId(v.word);
    const card: TeachCard =
      authoredCard(id) ?? {
        kind: "phrase",
        term: v.word,
        reading: "",
        meaning: v.gloss,
      };
    (isDue(seen[id], now) ? due : fresh).push(card);
  }
  return { due, fresh };
}

function shuffleCards<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

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
// Known limitation: the index refers to the exercise's position at flag time —
// editing a lesson's exercise list shifts indexes, so a stale flag can point
// at the wrong (or a missing, silently dropped) exercise until the next reset.
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
