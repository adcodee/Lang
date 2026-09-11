import "server-only";
import type { ChatMessage } from "@/lib/types";
import { buildTutorContext } from "@/lib/ai/constraints";
import { lessonCatalog } from "@/lib/ai/lessonTags";
import { turnSystemPrompt, debriefSystemPrompt } from "@/lib/ai/prompt";
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

// Locked routing: /api/chat and /api/voice turns both go through here to
// Grok. If Grok is down, this stubs rather than failing over to Claude —
// a mid-chat failover would mean the partner starts lecturing.
export async function runTutorTurn(args: RunTurnArgs): Promise<TutorResult<TutorTurn>> {
  const catalog = lessonCatalog(args.completedLessons);
  const catalogIds = new Set(catalog.map((c) => c.id));
  const context = buildTutorContext(args.completedLessons, args.scenarioId);
  const system = turnSystemPrompt(context);

  const { text, stubbed } = await grokTurn(system, args.messages);
  const data = parseTutorTurn(text, catalogIds) ?? emptyTutorTurn();
  return { data, stubbed };
}

// Claude, always — regardless of which channel the session ran on (signed:
// "Grok turn / Claude debrief / no GPT"). channel only shapes the prompt.
export async function runTutorDebrief(args: RunDebriefArgs): Promise<TutorResult<TutorDebrief>> {
  const catalog = lessonCatalog(args.completedLessons);
  const catalogIds = new Set(catalog.map((c) => c.id));
  const context = buildTutorContext(args.completedLessons, args.scenarioId);
  const system = `${debriefSystemPrompt(context)}\n\n${holesBlock(args.holes)}`;
  const transcript = formatTranscript(args.messages, args.channel);

  const { text, stubbed } = await claudeDebrief(system, transcript);
  const data = parseTutorDebrief(text, catalogIds) ?? emptyTutorDebrief();
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
