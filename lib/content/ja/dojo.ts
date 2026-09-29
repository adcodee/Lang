import type { Exercise, Lesson, SkillCategory, TeachCard } from "@/lib/types";
import { allLessons, getLesson } from "@/lib/content/ja/curriculum";
import { learnedKana } from "@/lib/content/ja/kana";
import { learnedVocab } from "@/lib/content/ja/vocab";
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
  | "punctuation"
  | "script-sort";

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
    subtitle: "Kana ↔ sound — no audio",
    icon: "⚡",
    skill: "reading",
    kind: "match",
    unlockAfter: "u1-vowels",
    // No `exercises` here — this is an endless drill, its own component
    // (QuickMatchDrill.tsx), routed directly in DrillPageClient.tsx rather
    // than through getDrill()/LessonPlayer. See lib/content/ja/matchBoards.ts.
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
    id: "script-sort",
    title: "Which Script?",
    subtitle: "Hiragana or katakana — same sound, different set",
    icon: "🪞",
    skill: "reading",
    kind: "script-sort",
    // The one question the Dojo never asked. Only meaningful once katakana
    // exists, so it unlocks on the first katakana lesson rather than with the
    // other reading drills — before that the answer is always "hiragana".
    unlockAfter: "u6-katakana-vowels-k-s",
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
      {
        type: "translate-choice",
        prompt: "Which mark doubles the next consonant?",
        display: "❓",
        options: ["っ", "ー", "。", "、"],
        answer: "っ",
        note: "Small っ holds the sound before it — きって, not きて. ー stretches a vowel instead.",
      },
      {
        type: "translate-choice",
        prompt: "ビル or ビール — which one is 'beer'?",
        display: "❓",
        options: ["ビール", "ビル", "both", "neither"],
        answer: "ビール",
        note: "ー stretches the vowel. Drop it and ビル is a building — two real words, one mark apart.",
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
    // Patch 1.9.1: recognition-only words (staff phrases, signage) still
    // resurface here — being able to recognise いらっしゃいませ is the whole
    // point of registering it. What must never happen is the review loop
    // asking the learner to PRODUCE one; that is enforced where the review
    // picks its format, not by withholding the card.
    const id = vocabItemId(v.word);
    const base: TeachCard =
      authoredCard(id) ?? {
        kind: "phrase",
        term: v.word,
        reading: "",
        meaning: v.gloss,
      };
    // Carry the flag through to the review loop. An authored card does not
    // know it belongs to a recognition-only word; vocab.ts does.
    const card: TeachCard =
      v.recognitionOnly && base.kind === "phrase"
        ? { ...base, recognitionOnly: true }
        : base;
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
// "match" is an endless drill with its own component now (QuickMatchDrill),
// not routed through here — see DrillPageClient.tsx.
// Patch 1.9.1: Listen & Repeat was three hand-authored items — こんにちは and
// ありがとう — frozen since Unit 2. A learner at brown belt with 161 words was
// still hearing the same two. It now draws from what they have actually
// learned, so the drill grows with the course instead of ageing out of it.
//
// Recognition-only words (staff phrases, signage) are heard but never asked
// to be said back: they take the listen half and are excluded from the speak
// half, which is the distinction the flag exists to make.
function buildListenExercises(completed: string[]): Exercise[] {
  const pool = learnedVocab(completed);
  if (pool.length < 4) return [];

  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const heard = shuffled.slice(0, 4);
  const out: Exercise[] = [];

  for (const v of heard) {
    const distractors = pool
      .filter((x) => x.word !== v.word && x.gloss !== v.gloss)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map((x) => x.gloss);
    if (distractors.length < 3) continue;
    out.push({
      type: "listen-choice",
      prompt: "What did you hear?",
      audio: v.word,
      options: [v.gloss, ...distractors].sort(() => Math.random() - 0.5),
      answer: v.gloss,
    });
    if (!v.recognitionOnly) {
      out.push({
        type: "speak-phrase",
        prompt: "Now say it back",
        display: v.word,
        note: v.gloss,
      });
    }
  }
  return out;
}

// Patch 1.9.1: nothing in the Dojo ever asked "is this hiragana or katakana?"
// Every lookalike pair compared two kana of the SAME script, so a learner who
// finished Unit 6 was never tested on the confusion a real menu produces,
// where both scripts sit in one line.
//
// Built from learned kana only, and marks are excluded — っ and ッ are a
// genuine cross-script pair but sorting them teaches nothing about reading.
function buildScriptSortExercises(completed: string[]): Exercise[] {
  const pool = learnedKana(completed).filter((k) => !k.mark && k.char !== "ん");
  const hira = pool.filter((k) => (k.script ?? "hiragana") === "hiragana");
  const kata = pool.filter((k) => k.script === "katakana");
  if (hira.length < 3 || kata.length < 3) return [];

  const pick = <T,>(arr: T[], n: number) =>
    [...arr].sort(() => Math.random() - 0.5).slice(0, n);

  const out: Exercise[] = [];
  for (let round = 0; round < 3; round++) {
    const items = [...pick(hira, 3), ...pick(kata, 3)].sort(() => Math.random() - 0.5);
    out.push({
      type: "category-sort",
      prompt: "Sort each character into its script",
      categories: ["Hiragana", "Katakana"],
      items: items.map((k) => ({
        label: k.char,
        // No romaji: the sound is not the question, and showing it would name
        // the answer for any learner who knows one script's readings better.
        category: (k.script ?? "hiragana") === "hiragana" ? "Hiragana" : "Katakana",
      })),
      note: "Katakana is the sharper, more angular set — straight strokes and corners where hiragana curves.",
    });
  }
  return out;
}

export function getDrill(id: string, completed: string[] = []): Lesson | undefined {
  const d = getDrillConfig(id);
  if (!d) return undefined;
  if (d.kind === "script-sort") {
    const exercises = buildScriptSortExercises(completed);
    if (exercises.length === 0) return undefined;
    return {
      id: d.id, title: d.title, subtitle: d.subtitle, icon: d.icon,
      skill: d.skill, xp: 0, exercises,
    };
  }
  if (d.kind === "listen") {
    const generated = buildListenExercises(completed);
    // Fall back to the authored starter set before enough vocab exists.
    const exercises = generated.length > 0 ? generated : d.exercises ?? [];
    if (exercises.length === 0) return undefined;
    return {
      id: d.id, title: d.title, subtitle: d.subtitle, icon: d.icon,
      skill: d.skill, xp: 0, exercises,
    };
  }
  if (!d.exercises) return undefined;
  const exercises = d.exercises;
  return {
    id: d.id,
    title: d.title,
    subtitle: d.subtitle,
    icon: d.icon,
    skill: d.skill,
    xp: 0,
    exercises,
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
