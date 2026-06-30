import "server-only";

// Speech-to-text adapter for the "Say it" speaking practice. iOS browsers don't
// expose the Web Speech recognition API, so the client records audio and posts
// it here to be transcribed by a cloud ASR. Provider-agnostic: targets any
// OpenAI-compatible /audio/transcriptions endpoint via env vars, so dropping in
// a key makes it live with no code change. Stub-first like the other adapters:
// with no key we report `stubbed` so the client uses its typed-romaji fallback.

export interface Transcription {
  transcript: string;
  stubbed: boolean;
}

export function transcribeConfigured(): boolean {
  return Boolean(process.env.STT_API_KEY);
}

const BASE_URL = process.env.STT_BASE_URL || "https://api.openai.com/v1";
const MODEL = process.env.STT_MODEL || "whisper-1";

export async function transcribeAudio(
  audio: Blob,
  language = "ja"
): Promise<Transcription> {
  if (!transcribeConfigured()) {
    return { transcript: "", stubbed: true };
  }

  try {
    const form = new FormData();
    form.append("file", audio, fileName(audio.type));
    form.append("model", MODEL);
    form.append("language", language);

    const res = await fetch(`${BASE_URL}/audio/transcriptions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.STT_API_KEY}` },
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

// Name the upload by its container so Whisper-style ASRs accept it.
// (iOS MediaRecorder emits audio/mp4; Chrome emits audio/webm.)
function fileName(mime: string): string {
  if (mime.includes("mp4") || mime.includes("m4a")) return "audio.mp4";
  if (mime.includes("ogg")) return "audio.ogg";
  if (mime.includes("wav")) return "audio.wav";
  return "audio.webm";
}
