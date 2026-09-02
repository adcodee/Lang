import type { Exercise, Lesson } from "@/lib/types";
import { kana, type Kana } from "@/lib/content/ja/kana";
import { vocab, type Vocab } from "@/lib/content/ja/vocab";
import { allLessons } from "@/lib/content/ja/curriculum";

// Patch 1.2, Phase E — "hybrid" content growth (approach C from the plan).
// Every existing hand-authored exercise in beginner.ts is kept exactly as
// written; this file only generates the *filler* needed to top a lesson's
// test portion up to its target depth, drawn strictly from kana/vocab the
// caller hands it. Callers only ever pass content the learner has actually
// reached (this lesson's own new items, plus whatever came before it in
// curriculum order) — the content rule ("never test what hasn't been
// taught yet") holds by construction, not by manual review at 250-item
// scale the way 1.1's hand-authored seed items had to be checked.

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// A normalized quiz item: kana (char/romaji) and vocab (word/gloss) are the
// same shape from a generator's point of view — a Japanese term and the
// sound/meaning that answers for it.
interface Item {
  kind: "kana" | "vocab";
  term: string;
  answer: string;
}

function toItems(k: Kana[], v: Vocab[]): Item[] {
  return [
    ...k.map((x): Item => ({ kind: "kana", term: x.char, answer: x.romaji })),
    ...v.map((x): Item => ({ kind: "vocab", term: x.word, answer: x.gloss })),
  ];
}

function distractorsFor(target: Item, pool: Item[], n: number): Item[] {
  return shuffle(
    pool.filter((p) => p.term !== target.term && p.answer !== target.answer)
  ).slice(0, n);
}

function translateChoiceFor(target: Item, pool: Item[]): Exercise {
  const distractors = distractorsFor(target, pool, 3);
  return {
    type: "translate-choice",
    skill: "reading",
    prompt:
      target.kind === "kana"
        ? "Which sound does this make?"
        : `What does "${target.term}" mean?`,
    display: target.term,
    options: shuffle([target.answer, ...distractors.map((d) => d.answer)]),
    answer: target.answer,
  };
}

function typeAnswerFor(target: Item): Exercise {
  return {
    type: "type-answer",
    skill: "writing",
    prompt:
      target.kind === "kana"
        ? "Type the romaji for this character"
        : "Type the meaning (English)",
    display: target.term,
    answer: target.answer,
  };
}

function listenChoiceFor(target: Item, pool: Item[]): Exercise {
  const distractors = distractorsFor(target, pool, 3);
  return {
    type: "listen-choice",
    prompt:
      target.kind === "kana"
        ? "Listen and pick the matching character"
        : "Listen and pick the matching word",
    audio: target.term,
    options: shuffle([target.term, ...distractors.map((d) => d.term)]),
    answer: target.term,
  };
}

function matchBoardFor(pool: Item[]): Exercise | null {
  // A board only makes sense with same-kind pairs (kana<->romaji or
  // word<->gloss) — mixing would ask the learner to match across two
  // different question shapes on one board, which no hand-authored board
  // in this app ever does.
  const kindGroups = { kana: pool.filter((p) => p.kind === "kana"), vocab: pool.filter((p) => p.kind === "vocab") };
  const group = kindGroups.kana.length >= kindGroups.vocab.length ? kindGroups.kana : kindGroups.vocab;
  if (group.length < 2) return null;
  const board = shuffle(group).slice(0, Math.min(5, group.length));
  return {
    type: "match-pairs",
    prompt: board[0].kind === "kana" ? "Match each character to its sound" : "Match the word to its meaning",
    pairs: board.map((b) => ({ left: b.term, right: b.answer })),
  };
}

export type SkillBias = "balanced" | "listening" | "speaking";

// Cycle of exercise-type indices (0=translate-choice, 1=type-answer,
// 2=listen-choice) per bias — "balanced" spreads reading/writing/listening
// evenly (Phase E's core ask: lessons should test more than one skill, not
// just whichever the lesson happens to be tagged); "listening" keeps a
// listen-focused lesson's filler mostly listen-choice; "speaking" (used for
// the dedicated speak-phrase lessons, which this generator never creates
// speak-phrase items for — there's no romaji field on vocab to build a
// reliable prompt from) alternates reading/writing recall instead.
const TYPE_CYCLES: Record<SkillBias, number[]> = {
  balanced: [0, 1, 2],
  listening: [2, 0, 2, 1, 2],
  speaking: [0, 1],
};

export function generateFiller(
  core: { kana: Kana[]; vocab: Vocab[] },
  review: { kana: Kana[]; vocab: Vocab[] },
  count: number,
  bias: SkillBias = "balanced"
): Exercise[] {
  if (count <= 0) return [];
  const coreItems = toItems(core.kana, core.vocab);
  const reviewItems = toItems(review.kana, review.vocab);
  const allItems = [...coreItems, ...reviewItems];
  if (allItems.length === 0) return [];

  // Every core item is guaranteed to appear at least once (cycling through
  // it first); once that's exhausted, pad with a random sample of the full
  // pool (core + review) so the target count is always reached as long as
  // there's at least one learned item to draw from.
  const cyclePool = coreItems.length > 0 ? coreItems : allItems;
  const targets: Item[] = [];
  for (let i = 0; i < count; i++) {
    targets.push(i < cyclePool.length ? cyclePool[i] : shuffle(allItems)[0]);
  }

  const cycle = TYPE_CYCLES[bias];
  const maxBoards = Math.max(1, Math.floor(count / 5));
  const boardPool = coreItems.length >= 2 ? coreItems : allItems;
  let boardsInserted = 0;

  const out: Exercise[] = [];
  for (let i = 0; i < targets.length; i++) {
    if (i > 0 && i % 5 === 0 && boardsInserted < maxBoards) {
      const board = matchBoardFor(boardPool);
      if (board) {
        out.push(board);
        boardsInserted++;
        continue;
      }
    }
    const typeIndex = cycle[i % cycle.length];
    const target = targets[i];
    if (typeIndex === 0) out.push(translateChoiceFor(target, allItems));
    else if (typeIndex === 1) out.push(typeAnswerFor(target));
    else out.push(listenChoiceFor(target, allItems));
  }

  return out.slice(0, count);
}

const LESSON_TARGET = 10;
const CHECKPOINT_TARGET = 20;

function biasFor(lesson: Lesson): SkillBias {
  if (lesson.skill === "listening") return "listening";
  if (lesson.skill === "speaking") return "speaking";
  return "balanced";
}

// Tops a lesson's `exercises` up to its target depth with generated filler,
// appended after the hand-authored items (which are always kept, unchanged
// — see the file header). Returns the original array by reference when no
// filler is needed, so callers can cheaply detect "nothing changed".
export function augmentLesson(lesson: Lesson): Exercise[] {
  const target = lesson.checkpoint ? CHECKPOINT_TARGET : LESSON_TARGET;
  const shortfall = target - lesson.exercises.length;
  if (shortfall <= 0) return lesson.exercises;

  const order = allLessons().map((l) => l.id);
  const idx = order.indexOf(lesson.id);
  const priorIds = new Set(idx >= 0 ? order.slice(0, idx) : []);
  const priorKana = kana.filter((k) => priorIds.has(k.lessonId));
  const priorVocab = vocab.filter((v) => priorIds.has(v.lessonId));

  if (lesson.checkpoint) {
    // A checkpoint teaches nothing new — its whole job is testing
    // everything the learner has met so far, so the cumulative prior pool
    // *is* the core material, not a review add-on.
    const filler = generateFiller(
      { kana: priorKana, vocab: priorVocab },
      { kana: [], vocab: [] },
      shortfall,
      "balanced"
    );
    return [...lesson.exercises, ...filler];
  }

  const coreKana = kana.filter((k) => k.lessonId === lesson.id);
  const coreVocab = vocab.filter((v) => v.lessonId === lesson.id);
  const filler = generateFiller(
    { kana: coreKana, vocab: coreVocab },
    { kana: priorKana, vocab: priorVocab },
    shortfall,
    biasFor(lesson)
  );
  return [...lesson.exercises, ...filler];
}
