import "server-only";
import { learnedKana } from "@/lib/content/ja/kana";
import { learnedVocab } from "@/lib/content/ja/vocab";
import { getScenario } from "@/lib/content/ja/scenarios";
import { lessonCatalog, catalogBlock } from "@/lib/ai/lessonTags";

// Builds the vocabulary-constraint block appended to both tutors' system
// prompts (turn and debrief alike). The client sends only its
// completed-lesson ids; the allowed language and the lesson catalog are
// derived server-side from the content registries, so the curriculum stays
// the single source of truth.
//
// Note: the "never with a grammar lecture" rule deliberately lives in the
// turn prompt only (lib/ai/prompt.ts) — the debrief prompt is the one place
// that's allowed to lecture.
export function buildTutorContext(
  completedLessons: string[],
  scenarioId?: string
): string {
  const kana = learnedKana(completedLessons);
  const vocab = learnedVocab(completedLessons);
  const scenario = scenarioId ? getScenario(scenarioId) : undefined;
  const catalog = catalogBlock(lessonCatalog(completedLessons));

  // Nothing learned yet (direct API call before the page gate opens):
  // stay safe and maximally simple rather than unconstrained.
  if (kana.length === 0 && vocab.length === 0) {
    return `
LEARNER LEVEL: absolute beginner with no lessons completed yet.
Use only the very simplest greeting Japanese (こんにちは), always with romaji and English.

${catalog}`;
  }

  const kanaList = kana.map((k) => k.char).join(" ");
  const vocabList = vocab.map((v) => `${v.word} (${v.gloss})`).join(", ");

  return `
LEARNER LEVEL — the learner has ONLY studied the following. This is a hard constraint.

Kana they can read: ${kanaList || "(none yet)"}
Words/phrases they know: ${vocabList || "(none yet)"}

Rules:
- Your Japanese output must use ONLY the kana and words above. Do not introduce new vocabulary, kanji, or katakana.
- Exception: minimal grammar glue is allowed (です, か, は, も, と, が) — but no other unlisted words.
- Romaji and short English glosses in parentheses are always allowed as scaffolding.
- ONE short exchange per turn: say one thing, ask at most one thing, then wait.
- If the learner uses words beyond their list, respond warmly but steer back to language they know.
${scenario ? `- Stay in scenario: ${scenario.brief}` : ""}

${catalog}`;
}
