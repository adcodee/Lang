import "server-only";
import type { TutorDebrief } from "@/lib/ai/schema";

// Claude runs ONLY the End-practice debrief — the coach, not the partner.
// It reviews the finished transcript + the silent hole log and returns why/
// when/redo. When ANTHROPIC_API_KEY is present we call the real API;
// otherwise we return a deterministic stub so the UI is fully demoable
// offline.

// Patch 1.4.1 Phase E (Lang-tutor-1.4.1-plan.md) — see grok.ts's matching
// comment: usage undefined means stubbed, nothing was spent.
export interface ClaudeResult {
  text: string;
  stubbed: boolean;
  model?: string;
  usage?: { promptTokens: number; completionTokens: number };
}

export function claudeConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export async function claudeDebrief(system: string, transcript: string): Promise<ClaudeResult> {
  if (!claudeConfigured()) {
    return { text: stubDebriefJson(), stubbed: true };
  }

  try {
    // Imported lazily so the SDK is only loaded when a key is configured.
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // "claude-opus-4-8" (the old default here and in .env.example) is not a
    // real Anthropic model id — every real call was failing with a "model
    // not found" error, caught below, silently degrading to the stub. That
    // looks identical to "no key configured" from the outside, which is
    // exactly why it went unnoticed. claude-opus-5 is the current model.
    const model = process.env.ANTHROPIC_MODEL || "claude-opus-5";

    // The debrief reviews a finished conversation rather than holding one,
    // so the whole transcript goes in as a single user turn — this avoids
    // the Messages API's strict user/assistant alternation entirely.
    const baseParams = {
      model,
      max_tokens: 600,
      system,
      messages: [{ role: "user" as const, content: transcript }],
    };

    // claude-opus-5 rejects `temperature` outright ("`temperature` is
    // deprecated for this model" — a real 400 caught via Vercel runtime
    // logs, 2026-09-20). Try with it first (older models may still want
    // it) and retry once without it on that specific rejection, same
    // pattern already proven for Grok's reasoning_effort incompatibility.
    let response;
    try {
      response = await client.messages.create({ ...baseParams, temperature: 0.3 });
    } catch (err) {
      if (err instanceof Error && /temperature/i.test(err.message)) {
        response = await client.messages.create(baseParams);
      } else {
        throw err;
      }
    }

    const text = response.content
      .filter((b): b is { type: "text"; text: string } => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    const usage = response.usage
      ? {
          promptTokens: response.usage.input_tokens,
          completionTokens: response.usage.output_tokens,
        }
      : undefined;
    return { text, stubbed: false, model, usage };
  } catch (err) {
    console.error("Claude debrief request failed, using stub:", err);
    return { text: stubDebriefJson(), stubbed: true };
  }
}

// --- Deterministic offline stub -------------------------------------------

function stubDebriefJson(): string {
  const stub: TutorDebrief = {
    went_well: "Demo mode — connect an Anthropic key to get real coaching after each session.",
    notes: [],
    redo: [],
    coverage: [],
    alts: [],
  };
  return JSON.stringify(stub);
}
