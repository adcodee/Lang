// Standalone verification for lib/ai/moves.ts (Patch 1.4.1, Phase B),
// run the same way scripts/check-content.ts is (`npm run check:moves`,
// tsx, no test framework — this repo doesn't have one installed and
// adding one wasn't part of what was asked for this patch).
//
// Concretely proves the plan's own claim: a move filled early in a long
// session still reads back correctly, because matchMoves recomputes from
// the full history every call instead of a trailing window.

import {
  matchMoves,
  resolveStickyTopic,
  matchLinkKeyword,
  computeSuggestEnd,
  accumulateSpans,
} from "../lib/ai/moves";
import { meetMoveMap, sceneLinks } from "../lib/content/ja/scenarios";
import type { ChatMessage } from "../lib/types";

interface Check {
  ok: boolean;
  message: string;
}

function user(content: string): ChatMessage {
  return { role: "user", content };
}
function assistant(content: string): ChatMessage {
  return { role: "assistant", content };
}

function checkBundledOpenerFullyCovered(): Check[] {
  // "Why this exists" #2 from the plan: a single bundled opener must clear
  // greet + give_name + ask_name in one turn, with close still legitimately
  // open (not yet said).
  const history: ChatMessage[] = [user("はじめまして、Aduleです。おなまえは？")];
  const { movesFilledEver, movesOpen } = matchMoves(meetMoveMap, history);

  const checks: Check[] = [];
  for (const id of ["greet", "give_name", "ask_name"] as const) {
    checks.push({
      ok: movesFilledEver.has(id),
      message: movesFilledEver.has(id)
        ? `bundled opener fills "${id}"`
        : `FAIL: bundled opener should fill "${id}" but didn't`,
    });
  }
  checks.push({
    ok: movesOpen.includes("close"),
    message: movesOpen.includes("close")
      ? `"close" correctly still open after the bundled opener`
      : `FAIL: "close" should still be open (no よろしく said yet)`,
  });
  return checks;
}

function checkSteppedOpenerAlsoFullyCovered(): Check[] {
  // The other legal shape from "Why this exists": こんにちは / name / ask /
  // よろしく split across four turns must reach the same full coverage.
  const history: ChatMessage[] = [
    user("こんにちは。"),
    assistant("こんにちは！おなまえは？"),
    user("わたしは Adule です。"),
    assistant("はじめまして。"),
    user("よろしく。"),
  ];
  const { movesFilledEver, movesOpen } = matchMoves(meetMoveMap, history);
  const allFilled = ["greet", "give_name", "close"].every((id) =>
    movesFilledEver.has(id as never)
  );
  return [
    {
      ok: allFilled,
      message: allFilled
        ? "stepped opener across separate turns fills greet/give_name/close"
        : `FAIL: stepped opener missing coverage — filled=${[...movesFilledEver].join(",")}`,
    },
    {
      ok: movesOpen.length === 0,
      message:
        movesOpen.length === 0
          ? "nothing left open after the full stepped exchange"
          : `FAIL: expected no open moves, got ${movesOpen.join(",")}`,
    },
  ];
}

function checkClosePreconditionBlocksEarlyYoroshiku(): Check[] {
  // "do not accept よろしく before a name exists" — precondition must keep
  // close out of movesOpen until give_name has actually happened.
  const history: ChatMessage[] = [user("こんにちは。")];
  const { movesOpen } = matchMoves(meetMoveMap, history);
  return [
    {
      ok: !movesOpen.includes("close"),
      message: !movesOpen.includes("close")
        ? "close correctly excluded from movesOpen before a name exists"
        : "FAIL: close is open despite give_name's precondition never being met",
    },
  ];
}

function checkGreetWaiverIsLearnerOwnAction(): Check[] {
  // waivedIf should waive the LEARNER's obligation to greet only when the
  // LEARNER is the one who gave a name — the partner introducing itself
  // first must not let the learner skip greet for free.
  const partnerNamedFirst: ChatMessage[] = [assistant("わたしは ゆき です。")];
  const { movesOpen: openAfterPartnerName } = matchMoves(meetMoveMap, partnerNamedFirst);

  const learnerNamedSelf: ChatMessage[] = [user("わたしは Adule です。")];
  const { movesOpen: openAfterLearnerName } = matchMoves(meetMoveMap, learnerNamedSelf);

  return [
    {
      ok: openAfterPartnerName.includes("greet"),
      message: openAfterPartnerName.includes("greet")
        ? "greet stays open when only the partner has given a name"
        : "FAIL: partner's own name-giving incorrectly waived the learner's greet",
    },
    {
      ok: !openAfterLearnerName.includes("greet"),
      message: !openAfterLearnerName.includes("greet")
        ? "greet correctly waived once the learner gives their own name"
        : "FAIL: learner's give_name should waive their own greet requirement",
    },
  ];
}

// The concrete regression test for the drift bug this whole patch exists to
// fix: pad the history well past Grok's 12-message MAX_HISTORY window with
// unrelated small talk, and confirm a move filled at turn 1 still reads as
// filled — because matchMoves scans the FULL history, not a trailing slice.
function checkMoveSurvivesPastTheOldHistoryWindow(): Check[] {
  const history: ChatMessage[] = [
    user("わたしは Adule です。"), // give_name filled here, turn 1
    ...Array.from({ length: 20 }, (_, i) => [
      assistant("そうですか。"),
      user(`すみません、もう一度。 (${i})`),
    ]).flat(),
  ];
  const { movesFilledEver, movesOpen } = matchMoves(meetMoveMap, history);
  return [
    {
      ok: history.length > 12,
      message: `sanity: history is ${history.length} messages, well past the old 12-message window`,
    },
    {
      ok: movesFilledEver.has("give_name"),
      message: movesFilledEver.has("give_name")
        ? "give_name from turn 1 still reads as filled 21 turns later"
        : "FAIL: give_name from turn 1 was lost — this is the exact drift bug the patch fixes",
    },
    {
      ok: !movesOpen.includes("give_name"),
      message: !movesOpen.includes("give_name")
        ? "give_name correctly absent from movesOpen that late"
        : "FAIL: give_name still shows as open despite being said 21 turns ago",
    },
  ];
}

function checkStickyTopicSwitchesAndReverts(): Check[] {
  const foodCandidate = {
    sceneId: "food",
    map: [{ id: "greet" as const, required: false as const, forms: ["すき", "ごはん"] }],
  };
  const candidates = [foodCandidate];

  const switches: ChatMessage[] = [user("ごはん すき。")];
  const afterSwitch = resolveStickyTopic(candidates, switches, "meet");

  const oneMiss: ChatMessage[] = [user("ごはん すき。"), user("こんにちは。")];
  const afterOneMiss = resolveStickyTopic(candidates, oneMiss, "meet");

  const twoMisses: ChatMessage[] = [
    user("ごはん すき。"),
    user("こんにちは。"),
    user("すみません。"),
  ];
  const afterTwoMisses = resolveStickyTopic(candidates, twoMisses, "meet");

  return [
    {
      ok: afterSwitch === "food",
      message: afterSwitch === "food" ? "topic switches to food on a hit" : `FAIL: got "${afterSwitch}"`,
    },
    {
      ok: afterOneMiss === "food",
      message:
        afterOneMiss === "food"
          ? "one miss doesn't revert the sticky topic yet"
          : `FAIL: reverted after only one miss — got "${afterOneMiss}"`,
    },
    {
      ok: afterTwoMisses === "meet",
      message:
        afterTwoMisses === "meet"
          ? "two consecutive misses revert sticky topic to the default"
          : `FAIL: expected revert to "meet", got "${afterTwoMisses}"`,
    },
  ];
}

function checkLinkKeywordBackstop(): Check[] {
  const hit = matchLinkKeyword(sceneLinks, "ごはん すき？");
  const miss = matchLinkKeyword(sceneLinks, "こんにちは。");
  return [
    { ok: hit?.to === "food", message: hit?.to === "food" ? "food keyword hit resolves to the food link" : `FAIL: got ${JSON.stringify(hit)}` },
    { ok: miss === null, message: miss === null ? "no false positive on an unrelated greeting" : `FAIL: got ${JSON.stringify(miss)}` },
  ];
}

function checkSuggestEndThreshold(): Check[] {
  const under = Array.from({ length: 5 }, () => user("すみません。"));
  const over = Array.from({ length: 25 }, () => user("すみません。"));
  return [
    { ok: !computeSuggestEnd(under, 20), message: "suggestEnd false well under the cap" },
    { ok: computeSuggestEnd(over, 20), message: "suggestEnd true once learner turns cross the cap" },
  ];
}

function checkSpanCapVsFullLog(): Check[] {
  const spansSoFar = [{ avoid: "a", prefer: "A", issue: "word-choice", holeLessonId: "" }];
  const reportedThisTurn = [
    { avoid: "b", prefer: "B", issue: "word-choice", holeLessonId: "" },
    { avoid: "c", prefer: "C", issue: "word-choice", holeLessonId: "" },
    { avoid: "d", prefer: "D", issue: "word-choice", holeLessonId: "" },
  ];
  const { allSpansEver, turnSpans } = accumulateSpans(spansSoFar, reportedThisTurn);
  return [
    {
      ok: turnSpans.length === 2,
      message: turnSpans.length === 2 ? "turnSpans capped at 2 for mid-chat display" : `FAIL: turnSpans.length=${turnSpans.length}`,
    },
    {
      ok: allSpansEver.length === 4,
      message:
        allSpansEver.length === 4
          ? "allSpansEver keeps every span (1 prior + 3 this turn) for the debrief"
          : `FAIL: allSpansEver.length=${allSpansEver.length}`,
    },
  ];
}

function main() {
  const results = [
    ...checkBundledOpenerFullyCovered(),
    ...checkSteppedOpenerAlsoFullyCovered(),
    ...checkClosePreconditionBlocksEarlyYoroshiku(),
    ...checkGreetWaiverIsLearnerOwnAction(),
    ...checkMoveSurvivesPastTheOldHistoryWindow(),
    ...checkStickyTopicSwitchesAndReverts(),
    ...checkLinkKeywordBackstop(),
    ...checkSuggestEndThreshold(),
    ...checkSpanCapVsFullLog(),
  ];
  const failures = results.filter((r) => !r.ok);

  for (const r of results) {
    console.log(`${r.ok ? "OK  " : "FAIL"} ${r.message}`);
  }

  if (failures.length > 0) {
    console.error(`\n${failures.length} moves.ts check(s) failed.`);
    process.exit(1);
  }
  console.log("\nAll moves.ts checks passed.");
}

main();
