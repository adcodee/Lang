import "server-only";

// Grok (xAI) powers the VOICE tutor: speaking/listening practice.
// The browser handles speech-to-text (SpeechRecognition) and text-to-speech
// (SpeechSynthesis); this adapter produces the assistant's *text* turn that the
// browser then speaks aloud. With XAI_API_KEY set we call Grok's
// OpenAI-compatible chat endpoint; otherwise we return a deterministic stub.

export interface VoiceTurn {
  reply: string; // text the browser will speak back (Japanese + English)
  romaji?: string; // pronunciation hint
  stubbed: boolean;
}

export function grokConfigured(): boolean {
  return Boolean(process.env.XAI_API_KEY);
}

const SYSTEM_PROMPT = `You are a friendly Japanese speaking partner for a beginner.
Keep replies to ONE short, easy spoken sentence in Japanese, then its English.
Respond ONLY with compact JSON: {"reply":"<Japanese + English>","romaji":"<romaji of the Japanese>"}`;

export async function voiceTurn(transcript: string): Promise<VoiceTurn> {
  if (!grokConfigured()) {
    return stubVoiceTurn(transcript);
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
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: transcript },
        ],
        temperature: 0.7,
      }),
    });

    if (!res.ok) throw new Error(`xAI responded ${res.status}`);
    const data = await res.json();
    const text: string = data?.choices?.[0]?.message?.content ?? "";
    const parsed = safeParse(text);
    return {
      reply: parsed?.reply || text,
      romaji: parsed?.romaji,
      stubbed: false,
    };
  } catch (err) {
    console.error("Grok request failed, using stub:", err);
    return stubVoiceTurn(transcript);
  }
}

function safeParse(text: string): { reply?: string; romaji?: string } | null {
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

const STUB_TURNS: VoiceTurn[] = [
  { reply: "こんにちは！おげんきですか？(Hello! How are you?)", romaji: "Konnichiwa! O-genki desu ka?", stubbed: true },
  { reply: "いいですね。なまえは なんですか？(Nice. What's your name?)", romaji: "Ii desu ne. Namae wa nan desu ka?", stubbed: true },
  { reply: "はじめまして！(Nice to meet you!)", romaji: "Hajimemashite!", stubbed: true },
  { reply: "じょうずです！またはなしましょう。(Great! Let's talk again.)", romaji: "Jouzu desu! Mata hanashimashou.", stubbed: true },
];

function stubVoiceTurn(transcript: string): VoiceTurn {
  // Pick a reply based on transcript length so repeated turns vary.
  const idx = Math.min(
    STUB_TURNS.length - 1,
    Math.floor(transcript.trim().length / 6) % STUB_TURNS.length
  );
  return STUB_TURNS[idx];
}
