import "server-only";
import type { ChatMessage } from "@/lib/types";

// Claude powers the TEXT tutor: grammar correction + conversational feedback.
// When ANTHROPIC_API_KEY is present we call the real API; otherwise we return a
// deterministic stub so the UI is fully demoable offline.

export interface TextFeedback {
  reply: string;
  correction?: string;
  stubbed: boolean;
}

export function claudeConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

const SYSTEM_PROMPT = `You are a warm, encouraging Japanese tutor for a beginner.
Rules:
- The learner is practicing simple Japanese. Reply in BOTH simple Japanese and English.
- Keep replies to 1-2 short sentences so a beginner can follow.
- If their Japanese has a mistake, gently correct it.
Respond ONLY with a compact JSON object of the form:
{"reply": "<your reply, Japanese + English>", "correction": "<short correction or empty string>"}`;

export async function getTextFeedback(
  messages: ChatMessage[]
): Promise<TextFeedback> {
  if (!claudeConfigured()) {
    return stubFeedback(messages);
  }

  try {
    // Imported lazily so the SDK is only loaded when a key is configured.
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const model = process.env.ANTHROPIC_MODEL || "claude-opus-4-8";
    const response = await client.messages.create({
      model,
      max_tokens: 400,
      system: SYSTEM_PROMPT,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });

    const text = response.content
      .filter((b): b is { type: "text"; text: string } => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    const parsed = safeParse(text);
    return {
      reply: parsed?.reply || text,
      correction: parsed?.correction || undefined,
      stubbed: false,
    };
  } catch (err) {
    // Network/auth failure — fall back to the stub so the UI never breaks.
    console.error("Claude request failed, using stub:", err);
    return stubFeedback(messages);
  }
}

function safeParse(text: string): { reply?: string; correction?: string } | null {
  try {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1) return null;
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

// --- Deterministic offline stub -------------------------------------------

const STUB_REPLIES: { reply: string; correction?: string }[] = [
  {
    reply: "いいですね！(Nice!) Keep going — try asking me a question in Japanese.",
  },
  {
    reply: "そうですね。(I see.) はい、わかります。(Yes, I understand.)",
    correction: "Tip: end polite sentences with です/ます.",
  },
  {
    reply: "じょうずですね！(You're good at this!) もう一度どうぞ。(Once more, please.)",
  },
  {
    reply: "はい！(Yes!) がんばってください。(Please do your best.)",
    correction: "Small note: は as a topic marker is read 'wa', not 'ha'.",
  },
];

function stubFeedback(messages: ChatMessage[]): TextFeedback {
  const userTurns = messages.filter((m) => m.role === "user").length;
  const pick = STUB_REPLIES[userTurns % STUB_REPLIES.length];
  return { ...pick, stubbed: true };
}
