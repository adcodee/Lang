import "server-only";

// Speech-to-text adapter for the "Say it" speaking practice. iOS browsers don't
// expose the Web Speech recognition API, so the client records audio and posts
// it here to be transcribed. Two providers are supported, stub-first like the
// other adapters (no key → `stubbed`, client uses its typed-romaji fallback):
//
//   • xAI Grok Voice STT — POST https://api.x.ai/v1/stt (multipart `file`, no
//     model field, returns {text}). Reuses XAI_API_KEY, so no extra key needed.
//   • Any OpenAI-compatible /audio/transcriptions endpoint — opt in by setting
//     STT_API_KEY (+ optional STT_BASE_URL / STT_MODEL).

export interface Transcription {
  transcript: string;
  stubbed: boolean;
}

type SttConfig =
  | { mode: "xai"; key: string }
  | { mode: "openai"; key: string; base: string; model: string }
  | null;

function sttConfig(): SttConfig {
  // Explicit OpenAI-compatible provider takes precedence.
  if (process.env.STT_API_KEY) {
    return {
      mode: "openai",
      key: process.env.STT_API_KEY,
      base: process.env.STT_BASE_URL || "https://api.openai.com/v1",
      model: process.env.STT_MODEL || "whisper-1",
    };
  }
  // Otherwise reuse the Grok/xAI key with xAI's native STT endpoint.
  if (process.env.XAI_API_KEY) {
    return { mode: "xai", key: process.env.XAI_API_KEY };
  }
  return null;
}

export function transcribeConfigured(): boolean {
  return sttConfig() !== null;
}

export async function transcribeAudio(
  audio: Blob,
  language = "ja"
): Promise<Transcription> {
  const cfg = sttConfig();
  if (!cfg) return { transcript: "", stubbed: true };

  try {
    const form = new FormData();
    form.append("file", audio, fileName(audio.type));

    let url: string;
    if (cfg.mode === "xai") {
      url = "https://api.x.ai/v1/stt";
    } else {
      url = `${cfg.base}/audio/transcriptions`;
      form.append("model", cfg.model);
      form.append("language", language);
    }

    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${cfg.key}` },
      body: form,
    });

    if (!res.ok) throw new Error(`STT responded ${res.status}`);
    const data = await res.json();
    const transcript: string = typeof data?.text === "string" ? data.text : "";
    return { transcript, stubbed: false };
  } catch (err) {
    console.error("Transcription failed, falling back to stub:", err);
    return { transcript: "", stubbed: true };
  }
}

// Name the upload by its container so the ASR accepts it.
// (iOS MediaRecorder emits audio/mp4; Chrome emits audio/webm.)
function fileName(mime: string): string {
  if (mime.includes("mp4") || mime.includes("m4a")) return "audio.mp4";
  if (mime.includes("ogg")) return "audio.ogg";
  if (mime.includes("wav")) return "audio.wav";
  return "audio.webm";
}
