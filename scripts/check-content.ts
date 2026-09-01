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
// What this does NOT check yet: whether a lesson's own exercises only use
// characters/vocabulary already taught by an earlier lesson (the JP build
// plan's "content rule"). That needs to parse displayed text against the
// cumulative taught-kana/vocab set per lesson, which is real work with no
// existing content failing it today — deliberately left for whenever it's
// next actually needed (e.g. once Luganda has enough content to check),
// rather than built speculatively now. Still checked by eye until then.

import { levels as jaLevels } from "../lib/content/ja/curriculum";
import { kana as jaKana } from "../lib/content/ja/kana";
import { vocab as jaVocab } from "../lib/content/ja/vocab";

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

function main() {
  const results = [...checkUniqueIds(), ...checkLessonReferences()];
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
