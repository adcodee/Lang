// Patch 1.4.1, Phase B (Lang-tutor-1.4.1-plan.md). Session-progress matcher
// for the move/form grading model — pure string matching, zero LLM calls.
//
// This is deliberately NOT marked "server-only": it has no secrets and no
// Next.js runtime dependency, and the plan's own implementation order calls
// for unit-testing it standalone (via tsx, see scripts/check-moves.ts)
// before it's wired into anything live. Marking it server-only would break
// that the same way lib/content/ja/vocab.ts's GLUE_TOKENS did (see Phase F).
//
// Not wired into lib/ai/tutor.ts or the prompts yet — that's Phase C.
// Every export here is a pure function of its inputs, recomputed fresh
// each call. That's what fixes the drift bug this patch exists for: Grok's
// 12-message window (lib/ai/grok.ts's MAX_HISTORY) can keep shrinking what
// the *model* sees without shrinking what's actually true about the
// session, because "what's true" is recomputed here from the full history
// the client already sends, not remembered by the model.

import type { ChatMessage } from "@/lib/types";
import type { MoveId, MoveSpec, SceneLink } from "@/lib/content/ja/scenarios";

export interface Span {
  avoid: string;
  prefer: string;
  issue: string; // kept loose here; lib/ai/schema.ts's TutorIssue narrows it on the wire (Phase D)
  holeLessonId: string;
}

export interface MoveMatchResult {
  // "Ever produced, by either side" — what OPEN MOVES / MATCHER HITS tell
  // Grok. Waiver/precondition logic below tracks learner-only separately,
  // internally, since a bundled opener only waives *the learner's own*
  // still-open moves, not a move the partner happened to say first.
  movesFilledEver: Set<MoveId>;
  movesOpen: MoveId[];
}

export interface StickyTopicResult {
  sceneId: string;
}

export interface MatcherResult {
  movesFilledEver: Set<MoveId>;
  movesOpen: MoveId[];
  stickyTopic: string;
  turnSpans: Span[]; // this turn only, capped at 2 — what gets flashed mid-chat
  allSpansEver: Span[]; // uncapped running log — what the debrief actually grades against
  suggestEnd: boolean;
}

const DEFAULT_MAX_TURNS_PER_SCENE = 20; // placeholder; Phase E owns the real constant in tutor.ts

function normalize(text: string): string {
  return text.replace(/\s+/g, "");
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// "X" in a form is a wildcard for a Latin-script name token (Adule, Yuki
// romanized, etc.) — never a literal taught word, so it never needs
// registering in vocab.ts (see scripts/check-content.ts's Phase F check,
// which explicitly treats "X" as a free token for the same reason).
function formMatchesMessage(form: string, normalizedMessage: string): boolean {
  const normalizedForm = normalize(form);
  if (!normalizedForm.includes("X")) {
    return normalizedMessage.includes(normalizedForm);
  }
  const pattern = normalizedForm.split("X").map(escapeRegex).join("[A-Za-z]+");
  return new RegExp(pattern).test(normalizedMessage);
}

function matchesMove(move: MoveSpec, message: string): boolean {
  const normalizedMessage = normalize(message);
  return [...move.forms, ...(move.alts ?? [])].some((form) =>
    formMatchesMessage(form, normalizedMessage)
  );
}

/**
 * Recomputes session move progress from the FULL history every call — not
 * the trailing window Grok sees. This is the concrete fix for "a move
 * filled at turn 2 gets re-graded as missing once it scrolls out of a
 * 12-message window": there is no window here, only the whole session,
 * so nothing "scrolls out."
 */
export function matchMoves(map: MoveSpec[], fullHistory: ChatMessage[]): MoveMatchResult {
  const filledByLearner = new Set<MoveId>();
  const filledByEither = new Set<MoveId>();

  for (const msg of fullHistory) {
    for (const move of map) {
      if (!matchesMove(move, msg.content)) continue;
      filledByEither.add(move.id);
      if (msg.role === "user") filledByLearner.add(move.id);
    }
  }

  const movesOpen: MoveId[] = [];
  for (const move of map) {
    if (!move.required) continue; // optional moves are never "open"
    if (move.precondition && !filledByEither.has(move.precondition)) continue; // not legal yet
    const alreadyDone =
      move.required === "said" ? filledByLearner.has(move.id) : filledByEither.has(move.id);
    if (alreadyDone) continue;
    const waived = move.waivedIf?.some((waiverId) => filledByLearner.has(waiverId)) ?? false;
    if (waived) continue;
    movesOpen.push(move.id);
  }

  return { movesFilledEver: filledByEither, movesOpen };
}

/**
 * Sticky-topic resolution for `free` (plan Phase B, point 5 — the rule the
 * original design note named but didn't specify): replays the learner's
 * turns in order. A hit against a non-current candidate scene switches to
 * it immediately; two consecutive learner turns with no hit against the
 * *current* sticky scene revert to `defaultSceneId`. `repair`/`greet`-only
 * turns are "no hit" for every candidate (as intended — they don't drive
 * topic switches either way) since those moves don't appear in `candidates`
 * unless a caller explicitly includes them.
 */
export function resolveStickyTopic(
  candidates: { sceneId: string; map: MoveSpec[] }[],
  fullHistory: ChatMessage[],
  defaultSceneId: string
): string {
  let current = defaultSceneId;
  let missStreak = 0;

  for (const msg of fullHistory) {
    if (msg.role !== "user") continue;
    const hit = candidates.find((c) => c.map.some((move) => matchesMove(move, msg.content)));

    if (hit) {
      current = hit.sceneId;
      missStreak = 0;
      continue;
    }
    if (current === defaultSceneId) continue; // already home; nothing to revert
    missStreak++;
    if (missStreak >= 2) {
      current = defaultSceneId;
      missStreak = 0;
    }
  }

  return current;
}

/**
 * Cheap keyword backstop under Grok's semantic link judgment (plan Phase
 * B, point 7). Only ever ADDS a link Grok's response didn't set — never
 * overrides one Grok did set, since semantic judgment catches things a
 * fixed keyword list can't. Caller does that merge; this just reports the
 * keyword-side hit, if any.
 */
export function matchLinkKeyword(links: SceneLink[], currentTurnText: string): SceneLink | null {
  const normalizedMessage = normalize(currentTurnText);
  return (
    links.find((link) =>
      link.keywords.some((keyword) => normalizedMessage.includes(normalize(keyword)))
    ) ?? null
  );
}

/** Learner-turn count crossing `maxTurns` — a UI nudge, never a hard stop. */
export function computeSuggestEnd(
  fullHistory: ChatMessage[],
  maxTurns: number = DEFAULT_MAX_TURNS_PER_SCENE
): boolean {
  return fullHistory.filter((m) => m.role === "user").length >= maxTurns;
}

/**
 * Cap enforcement only — NOT mismatch detection. Detecting a wrong-form
 * span (こんにらは vs こんにちは) is still Grok's job this patch, same as
 * 1.4 today; this just enforces the plan's Phase B point 6 distinction
 * between what's shown mid-chat (`turnSpans`, capped at 2, first-by-
 * position tie-break — pass `reportedThisTurn` already in reading order)
 * and what the debrief is allowed to see (`allSpansEver`, uncapped).
 */
export function accumulateSpans(
  spansSoFar: Span[],
  reportedThisTurn: Span[]
): { allSpansEver: Span[]; turnSpans: Span[] } {
  return {
    allSpansEver: [...spansSoFar, ...reportedThisTurn],
    turnSpans: reportedThisTurn.slice(0, 2),
  };
}

export interface MatchTurnArgs {
  map: MoveSpec[];
  fullHistory: ChatMessage[];
  currentTurnText: string;
  stickyCandidates?: { sceneId: string; map: MoveSpec[] }[];
  defaultSceneId?: string;
  spansSoFar?: Span[];
  reportedSpansThisTurn?: Span[];
  maxTurns?: number;
}

/**
 * Orchestrates the pieces above into the one result Phase C's prompt-
 * building needs. Deliberately does NOT take `links`/call `matchLinkKeyword`
 * — link detection isn't part of MatcherResult (the plan doesn't grow the
 * turn schema with a matcher-side link field), it's a merge Phase C does
 * directly against Grok's own `link` judgment on the response. Call
 * `matchLinkKeyword` separately there.
 */
export function matchTurn(args: MatchTurnArgs): MatcherResult {
  const {
    map,
    fullHistory,
    currentTurnText,
    stickyCandidates = [],
    defaultSceneId = "meet",
    spansSoFar = [],
    reportedSpansThisTurn = [],
    maxTurns,
  } = args;
  void currentTurnText; // reserved for Phase C once a mechanical span detector lands; see accumulateSpans's doc comment

  const { movesFilledEver, movesOpen } = matchMoves(map, fullHistory);
  const stickyTopic = stickyCandidates.length
    ? resolveStickyTopic(stickyCandidates, fullHistory, defaultSceneId)
    : defaultSceneId;
  const { allSpansEver, turnSpans } = accumulateSpans(spansSoFar, reportedSpansThisTurn);
  const suggestEnd = computeSuggestEnd(fullHistory, maxTurns ?? DEFAULT_MAX_TURNS_PER_SCENE);

  return { movesFilledEver, movesOpen, stickyTopic, turnSpans, allSpansEver, suggestEnd };
}
