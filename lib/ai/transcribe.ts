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
  // Diagnostics so a failed call can be told apart from "no key configured".
  reason?: "no-key" | "ok" | "empty" | "error" | "exception";
  status?: number; // upstream HTTP status on error
  provider?: "xai" | "openai";
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

// --- Abuse limits -----------------------------------------------------------
// This route is reachable from the public Vercel URL (the APK has to call it
// over the network, and that URL is in the repo), so without these three
// clamps it is a free general-purpose transcription service billed to the
// owner's xAI key. Each one is exported so the route can answer with the right
// HTTP status instead of silently swallowing the upload.

// ~4MB. Generous: a few seconds of speech in opus/webm is tens of KB, and even
// a full 15s hands-free turn is well under 200KB — so this is minutes of audio,
// not a tight fit. Vercel caps serverless request bodies at 4.5MB regardless,
// so the real job of this number is to fail with a clear 413 just below that
// ceiling rather than letting the platform fail with an opaque one.
export const MAX_AUDIO_BYTES = 4 * 1024 * 1024;

// 200 chars is plenty for the "expected answer" hint SpeakInput sends to bias
// recognition. It is not a free text channel to the provider.
const MAX_PROMPT_CHARS = 200;

// The app only ever teaches Japanese, and both call sites hardcode "ja".
// Deliberately NOT a parameter with a default: accepting a caller-supplied
// language is exactly what turned this into a general transcription service,
// and a default is something a future caller can pass over by accident.
const LANGUAGE = "ja";

// Clamp the recognition hint: length-capped and stripped of C0/C1 control
// characters (newlines included) so nothing can smuggle structure into the
// multipart field we hand the provider.
export function sanitizePrompt(input: unknown): string | undefined {
  if (typeof input !== "string") return undefined;
  const clean = input
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, " ")
    .trim()
    .slice(0, MAX_PROMPT_CHARS);
  return clean.length > 0 ? clean : undefined;
}

// Allowlist of upload content types. The awkward entries are load-bearing, so
// do not "tidy" them away:
//   • video/* — iOS MediaRecorder emits audio inside an mp4 container and some
//     builds label it video/mp4; see fileName() at the bottom of this file.
//   • application/octet-stream and "" — both call sites append the recording as
//     `form.append("audio", blob, "audio")`, and lib/audio.ts has two paths
//     that yield a Blob with an empty type (`new Blob(chunks)` in the recorder's
//     stop-failed fallback, and `recorder.mimeType || mimeType` when neither is
//     set). A browser serialising a typeless Blob into multipart fills the part
//     in as application/octet-stream, so rejecting those two would break real
//     recordings on exactly the browsers the cloud tier exists for.
// Which means this check only turns away callers who bother to label their
// upload as something that plainly isn't audio. It is a filter against careless
// misuse; MAX_AUDIO_BYTES plus the rate limit are what actually cap the bill.
export function audioTypeAllowed(type: string): boolean {
  const t = type.toLowerCase().trim();
  if (t === "" || t === "application/octet-stream") return true;
  return t.startsWith("audio/") || t.startsWith("video/");
}

export async function transcribeAudio(
  audio: Blob,
  prompt?: string
): Promise<Transcription> {
  const cfg = sttConfig();
  if (!cfg) return { transcript: "", stubbed: true, reason: "no-key" };

  // Re-clamp here rather than trusting the route: this is the function that
  // actually ships text to a third party, so the limit lives next to the wire.
  const hint = sanitizePrompt(prompt);

  try {
    const form = new FormData();
    form.append("file", audio, fileName(audio.type));

    let url: string;
    if (cfg.mode === "xai") {
      url = "https://api.x.ai/v1/stt";
      // xAI /v1/stt ignores unknown fields; send hints best-effort.
      form.append("language", LANGUAGE);
      if (hint) form.append("prompt", hint);
    } else {
      url = `${cfg.base}/audio/transcriptions`;
      form.append("model", cfg.model);
      form.append("language", LANGUAGE);
      if (hint) form.append("prompt", hint);
    }

    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${cfg.key}` },
      body: form,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      // Log the status and only a short, scrubbed head of the upstream reply.
      // This used to dump 500 chars verbatim, which is a bad habit for two
      // reasons: provider error bodies sometimes echo back the request
      // (Authorization header included), and server logs are the one place a
      // leaked key would sit in plaintext forever. The status is what actually
      // diagnoses these failures; the snippet is a hint, not evidence.
      console.error(
        `STT (${cfg.mode}) responded ${res.status} for ${audio.type} ${audio.size}B:`,
        redact(body).slice(0, 100)
      );
      return {
        transcript: "",
        stubbed: true,
        reason: "error",
        status: res.status,
        provider: cfg.mode,
      };
    }

    const data = await res.json();
    const transcript: string = typeof data?.text === "string" ? data.text : "";
    return {
      transcript,
      stubbed: false,
      reason: transcript ? "ok" : "empty",
      provider: cfg.mode,
    };
  } catch (err) {
    // Message only, never the error object. An undici fetch failure carries a
    // `cause` chain that can reference the request we just built — and that
    // request has the `Authorization: Bearer <key>` header on it, so handing
    // the whole object to console.error risks printing the key. Scrubbed on the
    // way out too, because some providers put detail in the message itself.
    const detail = err instanceof Error ? err.message : String(err);
    console.error(
      `Transcription request threw, falling back to stub: ${redact(detail).slice(0, 200)}`
    );
    return { transcript: "", stubbed: true, reason: "exception", provider: cfg.mode };
  }
}

// Scrub anything key-shaped before it reaches a log line. Deliberately eager:
// a false positive costs a few characters of diagnostic text, a false negative
// writes a live credential into the Vercel log stream.
function redact(text: string): string {
  return text.replace(
    /(Bearer\s+\S+|\b(?:xai|sk|key)-[A-Za-z0-9_-]{8,}|\b[A-Za-z0-9_-]{32,}\b)/gi,
    "[redacted]"
  );
}

// Name the upload by its container so the ASR accepts it.
// (iOS MediaRecorder emits audio/mp4; Chrome emits audio/webm.)
function fileName(mime: string): string {
  if (mime.includes("mp4") || mime.includes("m4a")) return "audio.mp4";
  if (mime.includes("ogg")) return "audio.ogg";
  if (mime.includes("wav")) return "audio.wav";
  return "audio.webm";
}
