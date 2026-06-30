"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square, Send } from "lucide-react";
import { speechSupported, listenOnce } from "@/lib/speech";
import {
  mediaRecorderSupported,
  startRecording,
  type Recorder,
} from "@/lib/audio";

type Tier = "web-speech" | "cloud" | "typed";
type Status = "idle" | "listening" | "recording" | "uploading" | "error";

// One speaking-capture control used by every "say it" surface. Picks the best
// available method: browser Web Speech (free, instant) → cloud STT via
// /api/transcribe (iOS-safe) → typed-romaji fallback (keeps it speaking
// practice when no STT key is configured). Always reports the recognized /
// typed text through onTranscript; grading stays with the caller.
export default function SpeakInput({
  onTranscript,
  idleLabel = "Say it",
  typedPrompt = "Say it aloud, then type what you said (romaji)",
  typedPlaceholder = "Type the romaji…",
}: {
  onTranscript: (text: string) => void;
  idleLabel?: string;
  typedPrompt?: string;
  typedPlaceholder?: string;
}) {
  const [tier, setTier] = useState<Tier>("typed");
  const [status, setStatus] = useState<Status>("idle");
  const [showTyped, setShowTyped] = useState(false);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [diag, setDiag] = useState<string | null>(null);
  const recorderRef = useRef<Recorder | null>(null);

  useEffect(() => {
    if (speechSupported()) setTier("web-speech");
    else if (mediaRecorderSupported()) setTier("cloud");
    else {
      setTier("typed");
      setShowTyped(true);
    }
  }, []);

  async function runWebSpeech() {
    setStatus("listening");
    setError(null);
    try {
      const { promise } = listenOnce("ja-JP");
      const text = await promise;
      onTranscript(text);
    } catch {
      // Recognition failed at runtime — offer the typed fallback.
      setShowTyped(true);
    } finally {
      setStatus("idle");
    }
  }

  async function startCloud() {
    setError(null);
    try {
      recorderRef.current = await startRecording();
      setStatus("recording");
    } catch {
      setError("Mic permission is needed — or just type what you said below.");
      setShowTyped(true);
    }
  }

  async function stopCloud() {
    const rec = recorderRef.current;
    if (!rec) return;
    recorderRef.current = null;
    setStatus("uploading");
    try {
      const blob = await rec.stop();
      const form = new FormData();
      form.append("audio", blob, "audio");
      form.append("language", "ja");
      const res = await fetch("/api/transcribe", { method: "POST", body: form });
      const data = await res.json();
      if (data?.stubbed || !data?.transcript) {
        // No cloud key (or empty) — fall back to typed-romaji practice.
        setDiag(describeDiag(data, blob));
        setShowTyped(true);
      } else {
        setDiag(null);
        onTranscript(data.transcript as string);
      }
    } catch {
      setDiag("network error reaching transcription");
      setShowTyped(true);
    } finally {
      setStatus("idle");
    }
  }

  function submitTyped() {
    const t = typed.trim();
    if (!t) return;
    setTyped("");
    onTranscript(t);
  }

  // Short, human-readable reason the cloud transcription didn't return text.
  function describeDiag(
    data: { reason?: string; status?: number; provider?: string },
    blob: Blob
  ): string {
    const size = `${Math.round(blob.size / 1024)}KB ${blob.type || "?"}`;
    switch (data?.reason) {
      case "no-key":
        return "no STT key on the server (set XAI_API_KEY and redeploy)";
      case "error":
        return `STT ${data.provider ?? ""} HTTP ${data.status} (${size})`;
      case "empty":
        return `STT heard nothing (${size})`;
      case "exception":
        return `STT request failed (${size})`;
      default:
        return `fell back (${size})`;
    }
  }

  function handleMic() {
    if (tier === "web-speech") {
      if (status === "idle") runWebSpeech();
    } else if (tier === "cloud") {
      if (status === "recording") stopCloud();
      else if (status === "idle") startCloud();
    }
  }

  const busy = status === "uploading";
  const active = status === "listening" || status === "recording";
  const micLabel =
    status === "listening"
      ? "Listening…"
      : status === "recording"
      ? "Tap to stop"
      : status === "uploading"
      ? "Checking…"
      : idleLabel;

  return (
    <div className="flex flex-col items-center gap-2">
      {tier !== "typed" && (
        <button
          onClick={handleMic}
          disabled={busy}
          className={`flex items-center gap-1.5 rounded-full px-4 py-2 font-bold text-white shadow-[0_2px_0_#46a302] disabled:opacity-60 ${
            active ? "animate-pulse bg-torii" : "bg-brand"
          }`}
        >
          {status === "recording" ? (
            <Square className="h-4 w-4" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
          {micLabel}
        </button>
      )}

      {error && <p className="text-xs text-heart">{error}</p>}
      {diag && <p className="text-[11px] text-muted">⚠️ {diag}</p>}

      {showTyped && (
        <div className="w-full max-w-xs">
          <p className="mb-1 text-center text-xs text-muted">{typedPrompt}</p>
          <div className="flex items-center gap-2">
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitTyped()}
              placeholder={typedPlaceholder}
              className="flex-1 rounded-2xl border-2 border-gray-200 px-3 py-2 outline-none focus:border-brand"
            />
            <button
              onClick={submitTyped}
              disabled={!typed.trim()}
              className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand text-white disabled:opacity-50"
              aria-label="Submit"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
