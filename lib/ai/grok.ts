import "server-only";
import type { ChatMessage } from "@/lib/types";
import type { TutorTurn } from "@/lib/ai/schema";

// Grok runs EVERY mid-chat tutor turn — text and voice alike, same contract
// on both channels. It's the speaking partner: one Japanese reply, a quiet
// correction if needed, one next question. The coaching debrief is Claude's
// job (see claude.ts). With XAI_API_KEY set we call Grok's OpenAI-compatible
// chat endpoint; otherwise we return a deterministic stub.

export interface GrokResult {
  text: string;
  stubbed: boolean;
}

export function grokConfigured(): boolean {
  return Boolean(process.env.XAI_API_KEY);
}

// Cap the conversation memory sent upstream — enough to hold a short
// scripted exchange without growing unbounded.
const MAX_HISTORY = 12;

export async function grokTurn(system: string, messages: ChatMessage[]): Promise<GrokResult> {
  if (!grokConfigured()) {
    return { text: stubTurnJson(messages), stubbed: true };
  }

  try {
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.XAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.XAI_MODEL || "grok-2-latest",
        messages: [
          { role: "system", content: system },
          ...messages.slice(-MAX_HISTORY).map((m) => ({ role: m.role, content: m.content })),
        ],
        temperature: 0.5,
      }),
    });

    if (!res.ok) throw new Error(`xAI responded ${res.status}`);
    const data = await res.json();
    const text: string = data?.choices?.[0]?.message?.content ?? "";
    return { text, stubbed: false };
  } catch (err) {
    console.error("Grok turn request failed, using stub:", err);
    return { text: stubTurnJson(messages), stubbed: true };
  }
}

// --- Deterministic offline stub -------------------------------------------
// Rotates through a few clean TutorTurn shapes (one with a flagged miss) so
// Demo mode still exercises the "Did you mean" line and the hole log.

const STUB_TURNS: TutorTurn[] = [
  {
    spoken_ja: "こんにちは！おげんきですか？",
    romaji: "Konnichiwa! O-genki desu ka?",
    ask_next_ja: "",
    did_you_mean: "",
    issue: "ok",
    avoid: "",
    holeLessonId: "",
  },
  {
    spoken_ja: "そうですか。",
    romaji: "Sou desu ka.",
    ask_next_ja: "なまえは なんですか？",
    did_you_mean: "わたしは がくせいです。",
    issue: "particle",
    avoid: "わたし がくせいです。",
    holeLessonId: "u2-self-intro",
  },
  {
    spoken_ja: "はじめまして。ゆき です。よろしく。",
    romaji: "Hajimemashite. Yuki desu. Yoroshiku.",
    ask_next_ja: "",
    did_you_mean: "",
    issue: "ok",
    avoid: "",
    holeLessonId: "",
  },
  {
    spoken_ja: "ありがとう。",
    romaji: "Arigatou.",
    ask_next_ja: "",
    did_you_mean: "",
    issue: "ok",
    avoid: "",
    holeLessonId: "",
  },
];

function stubTurnJson(messages: ChatMessage[]): string {
  const userTurns = messages.filter((m) => m.role === "user").length;
  const pick = STUB_TURNS[userTurns % STUB_TURNS.length];
  return JSON.stringify(pick);
}
