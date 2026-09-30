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
  // Verb stems join the candidate list so the prefix-based strip can
  // decompose polite conjugations (たべ + ません) it cannot reach from the
  // citation form alone. `word` is still what every other consumer reads.
  const vocabWords = new Set(
    jaVocab.flatMap((v) => (v.stem ? [v.word, v.stem] : [v.word]))
  );
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

// Patch 1.8: every vocab `word` must be registered EXACTLY ONCE. This check
// did not exist, and its absence let three separate collisions through in a
// single session (のみます and いきます registered by both Unit 7 and Unit 8;
// どこ by both the u1b and u4 weaves) — every one of them from a different
// author who could not see the others' registrations.
//
// A duplicate ships green but breaks things quietly: srs.ts keys on
// `vocab:<word>`, so two rows collapse to one SRS entry; the glossary shows
// the word twice; augmentLesson puts it in `core` for BOTH lessons; and
// distractorsFor() (lessonExercises.ts) filters only against the target and
// does NOT dedupe among the distractors it picks, so a generated item can
// render an options list containing the same gloss twice — unanswerable.
// Patch 1.8.2: every kana registry row must be a distinct character.
// This check did not exist, and its absence let five duplicate yōon rows
// (きゃ しゅ ちょ じゃ りょ) sit in kana.ts unnoticed — added because an audit
// regex of `char: "(.)"` matched only SINGLE-character rows and reported the
// existing multi-character ones as absent. A duplicate inflates the taught
// count, gives learnedKana() the same character twice, and lets a generated
// match board draw one character into two cells of the same board.
// Patch 1.8.2: the beginner course is kana-only BY DESIGN, and nothing
// asserted it. A scan found 24 Han characters across 10 lines of
// beginner.ts — including a graded category-sort whose bucket labels were
// "1画 (one stroke)" and "交差 (crossing strokes)", i.e. untaught kanji on
// screen inside an item the learner is scored on, plus 行 in four subtitles
// rendered on the skill tree. check-content's header already admits
// hand-authored prose is "only checked by eye"; this is the part of that
// which can be machine-checked, so it is.
//
// Patch 1.9: that version scanned lessons and nothing else, which left every
// OTHER learner-visible surface unguarded — unit titles/subtitles (rendered
// on the skill tree above the lesson nodes), level titles/blurbs (the level
// picker), vocab.ts (`word`/`gloss`/`senses`/`category`, all of which reach
// the glossary, match boards and generated type-answer items), kana.ts, and
// scenarios.ts (the `brief` goes into the tutor's system prompt,
// `starter.content` and `label` go on screen, and the move `forms`/`alts` are
// the phrases the tutor is told the learner knows). 1.9 writes three new unit
// strings and ~20 new vocab rows, so the hole was about to be walked through.
//
// ¥ (U+00A5) and ￥ (U+FFE5) need no allowlist: neither is Han, so both fall
// outside the range by construction and a price ships freely. 円 (U+5186) IS
// Han and is caught anywhere in here, `note` prose included — see
// Lang-beginner-gaps-1.9-plan.md, open question 4 ("neither in 1.9").
//
// Scope is deliberately every level, not just beginner: intermediate and
// advanced are empty `comingSoon` shells today, so scanning them costs
// nothing, and whoever first authors legitimate kanji up there should hit a
// red check and decide the scoping rule then, rather than inherit a carve-out
// nobody asked for.
function checkNoKanji(): Check[] {
  const checks: Check[] = [];
  const HAN = /[\u4E00-\u9FFF]/g;
  let scanned = 0;

  // One area/id pair per learner-visible record. Whole records are
  // stringified rather than field-picked where the shape allows it: every
  // remaining field on a vocab/kana/scenario row is an ASCII id or flag, so
  // there is nothing to false-positive on, and a field added later is covered
  // without anyone having to remember this check exists.
  const scan = (area: string, id: string, blob: string) => {
    scanned++;
    const found = Array.from(new Set(blob.match(HAN) ?? []));
    if (found.length > 0) {
      checks.push({
        ok: false,
        message: `${area} "${id}" contains kanji (${found.join(" ")}) — the beginner course is kana-only`,
      });
    }
  };

  for (const level of jaLevels) {
    scan(
      "level (levels/*.ts)",
      level.id,
      JSON.stringify({ title: level.title, blurb: level.blurb })
    );
    for (const unit of level.units) {
      scan(
        "unit (levels/*.ts)",
        unit.id,
        JSON.stringify({ title: unit.title, subtitle: unit.subtitle })
      );
      for (const lesson of unit.lessons) {
        // Everything the learner can actually see: titles, subtitles, and
        // every string inside the teach cards and exercises.
        scan(
          "lesson (levels/*.ts)",
          lesson.id,
          JSON.stringify({
            title: lesson.title,
            subtitle: lesson.subtitle,
            teach: lesson.teach ?? [],
            recap: lesson.recap ?? "",
            exercises: lesson.exercises,
          })
        );
      }
    }
  }

  for (const v of jaVocab) scan("vocab.ts word", v.word, JSON.stringify(v));
  for (const k of jaKana) scan("kana.ts char", k.char, JSON.stringify(k));
  // The whole scenario: `brief` (tutor prompt), `starter`/`label` (on screen),
  // and `map`'s move forms/alts (the phrases it grades the learner against).
  for (const s of jaScenarios) scan("scenarios.ts scenario", s.id, JSON.stringify(s));

  if (checks.length === 0) {
    checks.push({
      ok: true,
      message: `${scanned} learner-visible record(s) — levels, units, lessons, vocab, kana, scenarios — contain no kanji`,
    });
  }
  return checks;
}

// Patch 1.9: the content rule, applied to HAND-AUTHORED items.
//
// checkGeneratedContentRule above only covers generated filler; this file's
// header says hand-authored exercises are "still only checked by eye". That
// eye missed real cases, found in live testing: u6-katakana-t-n-h asked the
// learner to type ホテル when ル is not taught until the NEXT lesson, and
// played トマト as a listen-choice option when マ is equally unтaught.
//
// Only ANSWERABLE fields are checked — display, audio, options, tiles,
// match-pairs left, category-sort labels and buckets, accept, answer. Prose
// (`prompt`, `note`) is deliberately exempt: a forward reference like "don't
// mix it up with ツ later" is good teaching, not a violation.
//
// ゛ and ゜ (U+309B/U+309C) are diacritic marks, not kana. The lessons that
// teach them necessarily show them, so they are never counted.
const DIACRITICS = new Set(["\u309B", "\u309C"]);
const KANA_RANGE = /[\u3040-\u30FF]/;

function answerableStrings(ex: Exercise): string[] {
  const e = ex as unknown as Record<string, unknown>;
  const out: string[] = [];
  const push = (v: unknown) => {
    if (typeof v === "string") out.push(v);
  };
  for (const k of ["display", "audio", "answer"]) push(e[k]);
  for (const k of ["options", "tiles", "accept", "categories"]) {
    if (Array.isArray(e[k])) (e[k] as unknown[]).forEach(push);
  }
  if (Array.isArray(e.pairs)) {
    for (const p of e.pairs as { left?: unknown }[]) push(p.left);
  }
  if (Array.isArray(e.items)) {
    for (const it of e.items as { label?: unknown }[]) push(it.label);
  }
  return out;
}

function checkAuthoredContentRule(): Check[] {
  const checks: Check[] = [];
  const lessons = jaAllLessons();
  const order = lessons.map((l) => l.id);
  let scanned = 0;

  for (const lesson of lessons) {
    const idx = order.indexOf(lesson.id);
    const allowedIds = new Set([...order.slice(0, idx), lesson.id]);
    const taught = new Set(
      jaKana
        .filter((k) => allowedIds.has(k.lessonId))
        .flatMap((k) => k.char.split(""))
    );

    for (const [i, ex] of lesson.exercises.entries()) {
      for (const str of answerableStrings(ex)) {
        if (!KANA_RANGE.test(str)) continue;
        scanned++;
        const untaught = Array.from(
          new Set(
            str
              .split("")
              .filter((c) => KANA_RANGE.test(c) && !DIACRITICS.has(c) && !taught.has(c))
          )
        );
        if (untaught.length > 0) {
          checks.push({
            ok: false,
            message: `lesson "${lesson.id}" exercise #${i} (${ex.type}) uses "${str}" — ${untaught.join(" ")} not taught until later`,
          });
        }
      }
    }
  }

  if (checks.length === 0) {
    checks.push({
      ok: true,
      message: `${scanned} hand-authored Japanese string(s) use only kana taught by that point`,
    });
  }
  return checks;
}

// Patch 1.9.2: the content rule, applied to the Learn-phase RECAP line.
//
// `recap` is the one line the lesson wants carried away, shown on the summary
// page between the last teach card and the recall round. It is prose, so it is
// not covered by checkAuthoredContentRule (which only reads answerable fields)
// — but unlike a teach card's `note`, a recap is framed as consolidation of
// what the learner has just been shown. A recap naming something from a LATER
// lesson is the same bug as the か card's いくらですか example, which pulled a
// Unit 9 word into Unit 7 and was caught by eye rather than by machine.
//
// The allowance is wider than checkAuthoredContentRule's on purpose: a recap
// may name anything on ITS OWN lesson's teach cards, example words included.
// Unit 1's rows teach あ with the example あめ before め exists, so a recap
// that quotes あめ is describing what is on screen, not reaching forward.
function checkRecapContentRule(): Check[] {
  const checks: Check[] = [];
  const lessons = jaAllLessons();
  const order = lessons.map((l) => l.id);
  let scanned = 0;

  for (const lesson of lessons) {
    if (!lesson.recap) continue;
    scanned++;

    const idx = order.indexOf(lesson.id);
    const allowedIds = new Set([...order.slice(0, idx), lesson.id]);
    const taught = new Set(
      jaKana
        .filter((k) => allowedIds.has(k.lessonId))
        .flatMap((k) => k.char.split(""))
    );
    // Everything this lesson's own cards put in front of the learner.
    for (const card of lesson.teach ?? []) {
      const shown =
        card.kind === "phrase"
          ? card.term
          : `${card.char}${card.example?.word ?? ""}`;
      for (const c of shown) taught.add(c);
    }

    const untaught = Array.from(
      new Set(
        lesson.recap
          .split("")
          .filter((c) => KANA_RANGE.test(c) && !DIACRITICS.has(c) && !taught.has(c))
      )
    );
    if (untaught.length > 0) {
      checks.push({
        ok: false,
        message: `lesson "${lesson.id}" recap names ${untaught.join(" ")} — not taught by this point, and not on this lesson's own cards`,
      });
    }
  }

  // A recap is only worth a page where there are items to compare, which is
  // exactly where TeachSummary shows one: two or more teach cards.
  const missing = lessons
    .filter((l) => (l.teach?.length ?? 0) >= 2 && !l.recap)
    .map((l) => l.id);
  if (missing.length > 0) {
    checks.push({
      ok: false,
      message: `${missing.length} lesson(s) show a recap page with no recap line: ${missing.join(", ")}`,
    });
  }

  if (checks.length === 0) {
    checks.push({
      ok: true,
      message: `${scanned} lesson recap line(s) name only kana taught by that point`,
    });
  }
  return checks;
}

function checkKanaUniqueness(): Check[] {
  const checks: Check[] = [];
  const seen = new Map<string, string>();
  for (const k of jaKana) {
    const prev = seen.get(k.char);
    if (prev) {
      checks.push({
        ok: false,
        message: `kana "${k.char}" is registered twice (lessons "${prev}" and "${k.lessonId}")`,
      });
    } else {
      seen.set(k.char, k.lessonId);
    }
  }
  if (checks.length === 0) {
    checks.push({ ok: true, message: `${jaKana.length} kana row(s), all distinct characters` });
  }
  return checks;
}

function checkVocabUniqueness(): Check[] {
  const checks: Check[] = [];
  const seen = new Map<string, string>(); // word -> first lessonId

  for (const v of jaVocab) {
    const prev = seen.get(v.word);
    if (prev) {
      checks.push({
        ok: false,
        message: `vocab word "${v.word}" is registered twice (lessons "${prev}" and "${v.lessonId}") — register it once, at the lesson that first teaches it`,
      });
    } else {
      seen.set(v.word, v.lessonId);
    }
  }

  // The same trap on the answer side: two different words sharing a gloss can
  // land on one generated match board or in one options list, where the
  // learner is asked to pick between two identical-looking right answers.
  // Senses count as meanings too: if ちょっと's sense "no thank you" collided
  // with another word's gloss, a generated board could still offer two
  // correct-looking answers — exactly what this check exists to stop.
  const byGloss = new Map<string, string[]>();
  for (const v of jaVocab) {
    for (const meaning of [v.gloss, ...(v.senses ?? [])]) {
      byGloss.set(meaning, [...(byGloss.get(meaning) ?? []), v.word]);
    }
  }
  for (const [gloss, words] of byGloss) {
    if (words.length > 1) {
      checks.push({
        ok: false,
        message: `gloss "${gloss}" is shared by ${words.length} words (${words.join(", ")}) — a generated board can show it twice, which has no correct answer`,
      });
    }
  }

  if (checks.length === 0) {
    checks.push({
      ok: true,
      message: `${jaVocab.length} vocab word(s) and gloss(es) are each unique`,
    });
  }
  return checks;
}

function main() {
  const results = [
    ...checkUniqueIds(),
    ...checkLessonReferences(),
    ...checkNoKanji(),
    ...checkAuthoredContentRule(),
    ...checkRecapContentRule(),
    ...checkKanaUniqueness(),
    ...checkVocabUniqueness(),
    ...checkScenarioMoveVocab(),
    ...checkGeneratedContentRule(),
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
