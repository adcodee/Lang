import "server-only";
import type { ChatMessage } from "@/lib/types";
import { buildTutorContext } from "@/lib/ai/constraints";
import { lessonCatalog } from "@/lib/ai/lessonTags";
import {
  turnSystemPrompt,
  debriefSystemPrompt,
  turnMoveBlock,
  turnLinksBlock,
  debriefMoveBlock,
} from "@/lib/ai/prompt";
import {
  parseTutorTurn,
  parseTutorDebrief,
  emptyTutorTurn,
  emptyTutorDebrief,
  type TutorTurn,
  type TutorDebrief,
  type TutorHole,
} from "@/lib/ai/schema";
import { grokTurn } from "@/lib/ai/grok";
import { claudeDebrief } from "@/lib/ai/claude";
import {
  getScenario,
  scenarios,
  sceneLinks,
  isScenarioUnlocked,
  type MoveSpec,
} from "@/lib/content/ja/scenarios";
import { matchMoves, resolveStickyTopic, matchLinkKeyword, computeSuggestEnd } from "@/lib/ai/moves";

export interface RunTurnArgs {
  channel: "text" | "voice";
  messages: ChatMessage[]; // history + the learner's latest turn
  completedLessons: string[];
  scenarioId?: string;
}

export interface RunDebriefArgs {
  channel: "text" | "voice";
  messages: ChatMessage[];
  completedLessons: string[];
  scenarioId?: string;
  holes: TutorHole[]; // the client's silent per-turn mistake log
}

export interface TutorResult<T> {
  data: T;
  stubbed: boolean;
}

// Patch 1.4.1 Phase C (Lang-tutor-1.4.1-plan.md). Resolves which move map
// governs this request: the scenario's own map if it has one (meet), or —
// for `free` — the sticky-resolved map of whichever OTHER unlocked, mapped
// scenario the session has drifted toward, defaulting to meet. Scenarios
// with neither (food, in 1.4.1's scope) get undefined: no move grading,
// behavior unchanged from 1.4.
//
// Caveat worth knowing: `fullHistory` here is already the API route's
// sanitizeMessages() output (lib/ai/sanitize.ts, MAX_MESSAGES=20) — the
// matcher recomputes from all of THAT, which is a real improvement over
// Grok's own further-truncated 12-message window (lib/ai/grok.ts), but
// it is not literally "the whole session forever." Raising that 20-message
// ceiling is a deliberate cost/payload tradeoff, not a Phase C decision —
// see the plan's Phase E.
function resolveMoveMap(
  scenarioId: string | undefined,
  fullHistory: ChatMessage[],
  completedLessons: string[]
): MoveSpec[] | undefined {
  const scenario = scenarioId ? getScenario(scenarioId) : undefined;
  if (!scenario) return undefined;
  if (scenario.map) return scenario.map;
  if (scenario.id !== "free") return undefined;

  const candidates = scenarios
    .filter((s): s is typeof s & { map: MoveSpec[] } => s.id !== "free" && Boolean(s.map))
    .filter((s) => isScenarioUnlocked(s, completedLessons))
    .map((s) => ({ sceneId: s.id, map: s.map }));
  if (candidates.length === 0) return undefined;

  const stickyId = resolveStickyTopic(candidates, fullHistory, "meet");
  return candidates.find((c) => c.sceneId === stickyId)?.map;
}

// Locked routing: /api/chat and /api/voice turns both go through here to
// Grok. If Grok is down, this stubs rather than failing over to Claude —
// a mid-chat failover would mean the partner starts lecturing.
export async function runTutorTurn(args: RunTurnArgs): Promise<TutorResult<TutorTurn>> {
  const catalog = lessonCatalog(args.completedLessons);
  const catalogIds = new Set(catalog.map((c) => c.id));
  const context = buildTutorContext(args.completedLessons, args.scenarioId);

  const map = resolveMoveMap(args.scenarioId, args.messages, args.completedLessons);
  const matched = map ? matchMoves(map, args.messages) : undefined;
  const validLinkTargets = map ? new Set(sceneLinks.map((l) => l.to)) : new Set<string>();
  const moveBlock = map
    ? `${turnMoveBlock(map, matched!.movesOpen, [...matched!.movesFilledEver])}\n${turnLinksBlock(sceneLinks)}`
    : "";
  const system = turnSystemPrompt(context, moveBlock);

  const { text, stubbed } = await grokTurn(system, args.messages);
  const parsed = parseTutorTurn(text, catalogIds, validLinkTargets) ?? emptyTutorTurn();

  // Grok's own link judgment wins if it set one; the keyword backstop only
  // ever ADDS a link Grok didn't set (see matchLinkKeyword's doc comment).
  // Either way, `gated` is always recomputed here — Grok can't know the
  // learner's real completedLessons against the link's unlockAfter.
  const lastLearnerMessage = [...args.messages].reverse().find((m) => m.role === "user")?.content ?? "";
  const keywordLink = map ? matchLinkKeyword(sceneLinks, lastLearnerMessage) : null;
  const linkSceneId = parsed.link ? parsed.link.sceneId : keywordLink?.to ?? "";
  const linkMeta = sceneLinks.find((l) => l.to === linkSceneId);
  const link: TutorTurn["link"] = linkMeta
    ? { sceneId: linkMeta.to, gated: !args.completedLessons.includes(linkMeta.unlockAfter) }
    : "";

  const data: TutorTurn = {
    ...parsed,
    moves_filled: matched ? [...matched.movesFilledEver] : [],
    moves_open: matched ? matched.movesOpen : [],
    link,
    suggestEnd: computeSuggestEnd(args.messages),
  };
  return { data, stubbed };
}

// Claude, always — regardless of which channel the session ran on (signed:
// "Grok turn / Claude debrief / no GPT"). channel only shapes the prompt.
export async function runTutorDebrief(args: RunDebriefArgs): Promise<TutorResult<TutorDebrief>> {
  const catalog = lessonCatalog(args.completedLessons);
  const catalogIds = new Set(catalog.map((c) => c.id));
  const context = buildTutorContext(args.completedLessons, args.scenarioId);

  const map = resolveMoveMap(args.scenarioId, args.messages, args.completedLessons);
  const moveBlock = map ? debriefMoveBlock(map) : "";
  const system = `${debriefSystemPrompt(context, moveBlock)}\n\n${holesBlock(args.holes)}`;
  const transcript = formatTranscript(args.messages, args.channel);

  const { text, stubbed } = await claudeDebrief(system, transcript);
  const parsed = parseTutorDebrief(text, catalogIds) ?? emptyTutorDebrief();

  // Scenario-specific filter: MOVE_IDS validates against the whole app's
  // move vocabulary, but coverage should only ever name moves that are
  // actually part of THIS session's resolved map.
  const data: TutorDebrief = {
    ...parsed,
    coverage: map ? parsed.coverage.filter((c) => map.some((m) => m.id === c.move)) : [],
  };
  return { data, stubbed };
}

function holesBlock(holes: TutorHole[]): string {
  if (holes.length === 0) {
    return "SILENT HOLE LOG: none — the learner made no flagged mistakes this session.";
  }
  return `SILENT HOLE LOG (collected mid-chat, never shown to the learner until now):\n${holes
    .map(
      (h, i) =>
        `${i + 1}. issue=${h.issue} holeLessonId=${h.lessonId || "(none)"} avoid="${h.avoid}" prefer="${h.prefer}"`
    )
    .join("\n")}`;
}

function formatTranscript(messages: ChatMessage[], channel: "text" | "voice"): string {
  const lines = messages
    .slice(-24)
    .map((m) => `${m.role === "user" ? "Learner" : "Tutor"}: ${m.content}`)
    .join("\n");
  return `TRANSCRIPT (${channel} practice session):\n${lines}`;
}
