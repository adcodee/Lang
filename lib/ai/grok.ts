import "server-only";
import type { ChatMessage } from "@/lib/types";
import type { TutorTurn } from "@/lib/ai/schema";

// Grok runs EVERY mid-chat tutor turn — text and voice alike, same contract
// on both channels. It's the speaking partner: one Japanese reply, a quiet
// correction if needed, one next question. The coaching debrief is Claude's
// job (see claude.ts). With XAI_API_KEY set we call Grok's OpenAI-compatible
// chat endpoint; otherwise we return a deterministic stub.

// Patch 1.4.1 Phase E (Lang-tutor-1.4.1-plan.md): usage is undefined when
// stubbed — no real call happened, nothing was spent. tutor.ts logs this;
// this file only surfaces what the API actually reported.
export interface GrokResult {
  text: string;
  stubbed: boolean;
  model?: string;
  usage?: { promptTokens: number; completionTokens: number };
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

  // "grok-2-latest" (an earlier default) was fully retired by xAI on
  // 2026-05-15. "grok-4.6" (the flagship) always reasons, ~23s/call for
  // this prompt — too slow. "grok-4.20-0309-non-reasoning" was faster
  // still (~1.3-1.5s) and passed the benchmark's two fixed test turns, but
  // failed on-device in a real conversation: asked "お名前は？" (what's
  // your name?), it returned did_you_mean="わたしは ゆき です。" (I am
  // Yuki) as the "correction" — confusing its own next line with the
  // separate "what you should have said" field the prompt asks for. A
  // model with zero deliberation is exactly the wrong tradeoff for an
  // instruction that requires keeping two distinct jobs straight. grok-4.3
  // (owner's pick, 2026-09-19): still a reasoning model — "still pretty
  // fast and thinks first" — cheapest reasoning candidate benchmarked
  // (~2.7x cheaper than grok-4.6), ~7.2s avg, correct on every test run.
  const model = process.env.XAI_MODEL || "grok-4.3";
  // reasoning_effort only makes sense on a model that reasons at all —
  // the current default doesn't and rejects the field outright with a 400.
  // Try it anyway (someone may override XAI_MODEL back to a reasoning
  // model) and retry once without it on that specific rejection, instead
  // of assuming per-model — same fix already proven in
  // scripts/bench-grok-models.ts against the real API.
  const reasoningEffort = process.env.XAI_REASONING_EFFORT || "low";

  async function callXai(withReasoningEffort: boolean) {
    return fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.XAI_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          ...messages.slice(-MAX_HISTORY).map((m) => ({ role: m.role, content: m.content })),
        ],
        temperature: 0.5,
        ...(withReasoningEffort ? { reasoning_effort: reasoningEffort } : {}),
      }),
    });
  }

  try {
    let res = await callXai(true);
    if (!res.ok && res.status === 400) {
      const probeText = await res.text();
      if (/reasoningEffort|reasoning_effort/i.test(probeText)) {
        res = await callXai(false);
      } else {
        throw new Error(`xAI responded ${res.status}: ${probeText.slice(0, 200)}`);
      }
    }
    if (!res.ok) throw new Error(`xAI responded ${res.status}`);
    const data = await res.json();
    const text: string = data?.choices?.[0]?.message?.content ?? "";
    const usage = data?.usage
      ? {
          promptTokens: Number(data.usage.prompt_tokens) || 0,
          completionTokens: Number(data.usage.completion_tokens) || 0,
        }
      : undefined;
    return { text, stubbed: false, model, usage };
  } catch (err) {
    console.error("Grok turn request failed, using stub:", err);
    return { text: stubTurnJson(messages), stubbed: true };
  }
}

// --- Deterministic offline stub -------------------------------------------
// Rotates through a few clean TutorTurn shapes (one with a flagged miss) so
// Demo mode still exercises the "Did you mean" line and the hole log.

// moves_filled/moves_open/suggestEnd left empty/false here on purpose —
// tutor.ts overwrites them from the matcher unconditionally even in stub
// mode, same as a real Grok response (see schema.ts's TutorTurn doc comment).
const STUB_TURNS: TutorTurn[] = [
  {
    spoken_ja: "こんにちは！おなまえは？",
    romaji: "Konnichiwa! Onamae wa?",
    ask_next_ja: "",
    did_you_mean: "",
    issue: "ok",
    avoid: "",
    holeLessonId: "",
    moves_filled: [],
    moves_open: [],
    spans: [],
    link: "",
    suggestEnd: false,
  },
  {
    spoken_ja: "はじめまして。",
    romaji: "Hajimemashite.",
    ask_next_ja: "",
    did_you_mean: "わたしは Adule です。",
    issue: "particle",
    avoid: "わたし Adule です。",
    holeLessonId: "u2-self-intro",
    moves_filled: [],
    moves_open: [],
    spans: [
      {
        avoid: "わたし Adule です。",
        prefer: "わたしは Adule です。",
        issue: "particle",
        holeLessonId: "u2-self-intro",
      },
    ],
    link: "",
    suggestEnd: false,
  },
  {
    spoken_ja: "はじめまして。ゆき です。よろしく。",
    romaji: "Hajimemashite. Yuki desu. Yoroshiku.",
    ask_next_ja: "",
    did_you_mean: "",
    issue: "ok",
    avoid: "",
    holeLessonId: "",
    moves_filled: [],
    moves_open: [],
    spans: [],
    link: "",
    suggestEnd: false,
  },
  {
    spoken_ja: "ありがとう。",
    romaji: "Arigatou.",
    ask_next_ja: "",
    did_you_mean: "",
    issue: "ok",
    avoid: "",
    holeLessonId: "",
    moves_filled: [],
    moves_open: [],
    spans: [],
    link: "",
    suggestEnd: false,
  },
];

function stubTurnJson(messages: ChatMessage[]): string {
  const userTurns = messages.filter((m) => m.role === "user").length;
  const pick = STUB_TURNS[userTurns % STUB_TURNS.length];
  return JSON.stringify(pick);
}
