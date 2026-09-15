// Content integrity check, run manually (`npm run check:content`) or in CI
// later. Two things it actually checks today:
//
//   1. Every lesson id and unit id is globally unique — across all
//      languages, not just within one. This is the concrete safety net for
//      the Luganda build plan's "prefix all lg ids" rule: if a Luganda
//      lesson id ever collides with a Japanese one, completedLessons/
//      learnedLessons/examsPassed (shared array shape, id-keyed) would
//      silently conflate two unrelated lessons' progress.
//   2. Every vocab/kana entry's `lessonId` back-reference points at a
//      lesson that actually exists — catches a typo'd or stale reference
//      that would otherwise silently mean that word/kana never counts as
//      "learned".
//
//   3. Patch 1.2, Phase E: every lesson's generated filler (augmentLesson)
//      only ever names kana/vocab terms this lesson or an earlier one
//      actually teaches — the runtime version of the content rule above.
//      Hand-authored exercises are still only checked by eye (parsing
//      arbitrary prose for stray kana isn't worth building for ~180 items
//      with no known violations); this covers the ~250-item generated
//      portion, where scale makes an eyeball check unreliable.
//
//   4. Patch 1.4.1, Phase F: every tutor scenario's move `forms`/`alts`
//      (lib/content/ja/scenarios.ts) resolves entirely to registered
//      vocab.ts words plus GLUE_TOKENS (also vocab.ts) and punctuation.
//      Catches the exact bug this project has already hit twice — a
//      scenario or a stub teaching a word (おなまえは？, once;
//      おげんきですか/がくせいです, before this patch) that nobody
//      registered as taught. Scene-link keywords are intentionally NOT
//      checked here — they name future/locked scenes on purpose.

import { levels as jaLevels, allLessons as jaAllLessons } from "../lib/content/ja/curriculum";
import { kana as jaKana } from "../lib/content/ja/kana";
import { vocab as jaVocab, GLUE_TOKENS } from "../lib/content/ja/vocab";
import { scenarios as jaScenarios } from "../lib/content/ja/scenarios";
import { augmentLesson } from "../lib/content/ja/lessonExercises";
import {
  coreMeaning,
  matchesTypedAnswer,
  meaningFeedback,
  typedMeaningAccepts,
} from "../lib/exercise";
import type { Exercise, TypeAnswerExercise } from "../lib/types";

interface Check {
  ok: boolean;
  message: string;
}

function checkUniqueIds(): Check[] {
  const checks: Check[] = [];
  const lessonSeen = new Map<string, string>(); // id -> unit id (for the error message)
  const unitSeen = new Map<string, string>(); // id -> level name

  for (const level of jaLevels) {
    for (const unit of level.units) {
      const prevUnit = unitSeen.get(unit.id);
      if (prevUnit) {
        checks.push({
          ok: false,
          message: `duplicate unit id "${unit.id}" (also in ${prevUnit})`,
        });
      } else {
        unitSeen.set(unit.id, level.title);
      }

      for (const lesson of unit.lessons) {
        const prevUnitForLesson = lessonSeen.get(lesson.id);
        if (prevUnitForLesson) {
          checks.push({
            ok: false,
            message: `duplicate lesson id "${lesson.id}" (in "${unit.id}" and "${prevUnitForLesson}")`,
          });
        } else {
          lessonSeen.set(lesson.id, unit.id);
        }
      }
    }
  }

  checks.push({
    ok: true,
    message: `${lessonSeen.size} lesson id(s) and ${unitSeen.size} unit id(s) checked, all unique`,
  });
  return checks;
}

function checkLessonReferences(): Check[] {
  const checks: Check[] = [];
  const lessonIds = new Set(
    jaLevels.flatMap((l) => l.units.flatMap((u) => u.lessons.map((les) => les.id)))
  );

  for (const k of jaKana) {
    if (!lessonIds.has(k.lessonId)) {
      checks.push({
        ok: false,
        message: `kana "${k.char}" references unknown lessonId "${k.lessonId}"`,
      });
    }
  }
  for (const v of jaVocab) {
    if (!lessonIds.has(v.lessonId)) {
      checks.push({
        ok: false,
        message: `vocab "${v.word}" references unknown lessonId "${v.lessonId}"`,
      });
    }
  }

  if (checks.length === 0) {
    checks.push({
      ok: true,
      message: `${jaKana.length} kana + ${jaVocab.length} vocab lessonId reference(s) all resolve to a real lesson`,
    });
  }
  return checks;
}

// Longest-match-first greedy strip: repeatedly removes whichever known
// token (a vocab word, a glue token, punctuation, or the "X" name
// wildcard) is a prefix of what's left. Whatever can't be stripped is
// untaught/unregistered. Works because scenario forms are short, hand-
// authored strings built only from these pieces — not general tokenization.
const SCENARIO_PUNCTUATION = ["。", "？", "！", "、"];

function stripKnownTokens(raw: string, knownWords: Set<string>): string {
  const candidates = [...knownWords, ...GLUE_TOKENS, ...SCENARIO_PUNCTUATION, "X"]
    .filter((t) => t.length > 0)
    .sort((a, b) => b.length - a.length);

  let remaining = raw.replace(/\s+/g, "");
  let progressed = true;
  while (remaining.length > 0 && progressed) {
    progressed = false;
    for (const token of candidates) {
      if (remaining.startsWith(token)) {
        remaining = remaining.slice(token.length);
        progressed = true;
        break;
      }
    }
  }
  return remaining;
}

function checkScenarioMoveVocab(): Check[] {
  const checks: Check[] = [];
  const vocabWords = new Set(jaVocab.map((v) => v.word));
  let formsChecked = 0;

  for (const scenario of jaScenarios) {
    if (!scenario.map) continue;
    for (const move of scenario.map) {
      for (const form of [...move.forms, ...(move.alts ?? [])]) {
        formsChecked++;
        const leftover = stripKnownTokens(form, vocabWords);
        if (leftover.length > 0) {
          checks.push({
            ok: false,
            message: `scenario "${scenario.id}" move "${move.id}" form "${form}" has untaught/unregistered text "${leftover}" — register it in vocab.ts or GLUE_TOKENS before this ships`,
          });
        }
      }
    }
  }

  if (formsChecked === 0) {
    checks.push({
      ok: false,
      message: `no scenario move forms found to check — expected at least "meet"'s map (lib/content/ja/scenarios.ts)`,
    });
  } else if (checks.length === 0) {
    checks.push({
      ok: true,
      message: `${formsChecked} scenario move form(s)/alt(s) all resolve to registered vocab or glue`,
    });
  }
  return checks;
}

function extractTerms(ex: Exercise): string[] {
  switch (ex.type) {
    case "translate-choice":
      return [ex.display];
    case "type-answer":
      return [ex.display];
    case "listen-choice":
      return [ex.audio, ...ex.options];
    case "match-pairs":
      return ex.pairs.map((p) => p.left);
    default:
      return [];
  }
}

function checkGeneratedContentRule(): Check[] {
  const checks: Check[] = [];
  const lessons = jaAllLessons();
  const order = lessons.map((l) => l.id);
  let violations = 0;
  let generatedCount = 0;

  for (const lesson of lessons) {
    const idx = order.indexOf(lesson.id);
    const allowedIds = new Set([...order.slice(0, idx), lesson.id]);
    const allowedTerms = new Set([
      ...jaKana.filter((k) => allowedIds.has(k.lessonId)).map((k) => k.char),
      ...jaVocab.filter((v) => allowedIds.has(v.lessonId)).map((v) => v.word),
    ]);

    const originalCount = lesson.exercises.length;
    const generated = augmentLesson(lesson).slice(originalCount);
    generatedCount += generated.length;

    for (const ex of generated) {
      for (const term of extractTerms(ex)) {
        if (!allowedTerms.has(term)) {
          violations++;
          checks.push({
            ok: false,
            message: `lesson "${lesson.id}" generated filler references "${term}", not yet taught by this point in the curriculum`,
          });
        }
      }
    }
  }

  if (violations === 0) {
    checks.push({
      ok: true,
      message: `${generatedCount} generated filler exercise(s) across ${lessons.length} lessons all respect the content rule`,
    });
  }
  return checks;
}

const kanaChars = new Set(jaKana.map((k) => k.char));
const kanaRomaji = new Set(jaKana.map((k) => k.romaji));
const vocabWords = new Set(jaVocab.map((v) => v.word));
const vocabGlosses = new Set(jaVocab.map((v) => v.gloss));

// IMG_1274: meaning questions must not offer kana sounds as options
// (ありがとう → thank you / cho / chi / n). Inverse for sound questions.
function checkNoMixedDistractors(): Check[] {
  const checks: Check[] = [];
  const lessons = jaAllLessons();
  let inspected = 0;
  const TRIALS = 8;

  for (const lesson of lessons) {
    for (let trial = 0; trial < TRIALS; trial++) {
      const generated = augmentLesson(lesson).slice(lesson.exercises.length);
      for (const ex of generated) {
        if (ex.type === "translate-choice") {
          inspected++;
          const meaningQ = ex.prompt.startsWith("What does");
          const soundQ = ex.prompt.startsWith("Which sound");
          for (const opt of ex.options) {
            if (meaningQ && kanaRomaji.has(opt) && !vocabGlosses.has(opt)) {
              checks.push({
                ok: false,
                message: `lesson "${lesson.id}" meaning question for "${ex.display}" offers kana sound "${opt}" as a choice`,
              });
            }
            if (soundQ && vocabGlosses.has(opt) && !kanaRomaji.has(opt)) {
              checks.push({
                ok: false,
                message: `lesson "${lesson.id}" sound question for "${ex.display}" offers vocab gloss "${opt}" as a choice`,
              });
            }
          }
        }
        if (ex.type === "listen-choice") {
          inspected++;
          const wordQ = ex.prompt.includes("matching word");
          const charQ = ex.prompt.includes("matching character");
          for (const opt of ex.options) {
            if (wordQ && kanaChars.has(opt) && !vocabWords.has(opt)) {
              checks.push({
                ok: false,
                message: `lesson "${lesson.id}" listen-word question offers kana "${opt}" as a choice`,
              });
            }
            if (charQ && vocabWords.has(opt) && !kanaChars.has(opt)) {
              checks.push({
                ok: false,
                message: `lesson "${lesson.id}" listen-kana question offers vocab "${opt}" as a choice`,
              });
            }
          }
        }
      }
    }
  }

  if (checks.length === 0) {
    checks.push({
      ok: true,
      message: `${inspected} generated choice exercise(s) across ${TRIALS} trials keep kana sounds and vocab meanings unmixed`,
    });
  }
  return checks;
}

function checkTypedMeaningAccepts(): Check[] {
  const checks: Check[] = [];
  const hello = typedMeaningAccepts("hello (daytime)");
  if (!hello.some((v) => v.toLowerCase() === "hello")) {
    checks.push({ ok: false, message: `typedMeaningAccepts("hello (daytime)") missing "hello"` });
  }
  if (meaningFeedback("hello (daytime)").toLowerCase() !== "hello during the day") {
    checks.push({
      ok: false,
      message: `meaningFeedback("hello (daytime)") was "${meaningFeedback("hello (daytime)")}"`,
    });
  }
  if (coreMeaning("excuse me / sorry") !== "excuse me") {
    checks.push({ ok: false, message: `coreMeaning slash split failed` });
  }

  const lessons = jaAllLessons();
  let typed = 0;
  for (const lesson of lessons) {
    for (let trial = 0; trial < 12; trial++) {
      const generated = augmentLesson(lesson).slice(lesson.exercises.length);
      for (const ex of generated) {
        if (ex.type !== "type-answer" || ex.display !== "こんにちは") continue;
        typed++;
        const exercise = ex as TypeAnswerExercise;
        if (!matchesTypedAnswer("hello", exercise)) {
          checks.push({
            ok: false,
            message: `こんにちは type-answer rejects "hello" (answer="${exercise.answer}")`,
          });
        }
        if (!matchesTypedAnswer("hello during the day", exercise)) {
          checks.push({
            ok: false,
            message: `こんにちは type-answer rejects "hello during the day"`,
          });
        }
        if (exercise.note?.toLowerCase() !== "hello during the day") {
          checks.push({
            ok: false,
            message: `こんにちは type-answer green note was "${exercise.note ?? ""}"`,
          });
        }
      }
    }
  }
  if (typed === 0) {
    checks.push({
      ok: false,
      message: "no generated こんにちは type-answer found to check",
    });
  }
  if (checks.length === 0) {
    checks.push({
      ok: true,
      message: `typed meaning accepts "hello" for こんにちは (${typed} generated type-answer(s)); green note is "hello during the day"`,
    });
  }
  return checks;
}

function main() {
  const results = [
    ...checkUniqueIds(),
    ...checkLessonReferences(),
    ...checkScenarioMoveVocab(),
    ...checkGeneratedContentRule(),
    ...checkNoMixedDistractors(),
    ...checkTypedMeaningAccepts(),
  ];
  const failures = results.filter((r) => !r.ok);

  for (const r of results) {
    console.log(`${r.ok ? "OK  " : "FAIL"} ${r.message}`);
  }

  if (failures.length > 0) {
    console.error(`\n${failures.length} content check(s) failed.`);
    process.exit(1);
  }
  console.log("\nAll content checks passed.");
}

main();
