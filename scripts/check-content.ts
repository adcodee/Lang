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

import { levels as jaLevels, allLessons as jaAllLessons } from "../lib/content/ja/curriculum";
import { kana as jaKana } from "../lib/content/ja/kana";
import { vocab as jaVocab } from "../lib/content/ja/vocab";
import { augmentLesson } from "../lib/content/ja/lessonExercises";
import type { Exercise } from "../lib/types";

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

function main() {
  const results = [...checkUniqueIds(), ...checkLessonReferences(), ...checkGeneratedContentRule()];
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
