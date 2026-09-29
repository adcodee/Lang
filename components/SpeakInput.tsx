"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square, Send } from "lucide-react";
import {
  speechSupported,
  listenOnce,
  nativeSpeechPlatform,
  nativeSpeechReady,
  listenOnceNative,
  checkOfflineSpeech,
  offlineSpeechState,
  OFFLINE_PACK_HINT,
  offlineSpeechReason,
  type OfflineSpeechState,
} from "@/lib/speech";
import {
  mediaRecorderSupported,
  isIOS,
  startRecording,
  type Recorder,
} from "@/lib/audio";
import { API_BASE } from "@/lib/apiBase";

type Tier = "native" | "web-speech" | "cloud" | "typed";
type Status = "idle" | "listening" | "recording" | "uploading" | "error";

// One speaking-capture control used by every "say it" surface. Picks the best
// available method: native device recogniser (packaged app) → browser Web
// Speech (free, instant) → cloud STT via /api/transcribe (iOS-safe) →
// typed-romaji fallback. Always reports the recognized / typed text through
// onTranscript; grading stays with the caller.
//
// The native tier exists because inside an Android WebView neither of the
// other two works: SpeechRecognition is absent entirely (a Chrome feature,
// not a WebView one), and getUserMedia is refused because the WebView asks
// its own permission question the host app never answers — separate from the
// OS RECORD_AUDIO grant, which the app already held. Result before this:
// every speaking exercise dropped silently to typing. See lib/speech.ts.
export default function SpeakInput({
  onTranscript,
  idleLabel = "Say it",
  typedPrompt = "Say it aloud, then type what you said (romaji)",
  typedPlaceholder = "Type the romaji…",
  hint,
}: {
  onTranscript: (text: string) => void;
  idleLabel?: string;
  typedPrompt?: string;
  typedPlaceholder?: string;
  hint?: string; // expected phrase — biases the cloud ASR toward it
}) {
  const [tier, setTier] = useState<Tier>("typed");
  const [status, setStatus] = useState<Status>("idle");
  const [showTyped, setShowTyped] = useState(false);
  const [typed, setTyped] = useState("");
  const [note, setNote] = useState<string | null>(null);
  // Offline-model state for the "works without internet" notice. Starts from
  // the module cache so the notice does not flicker between exercises.
  const [offline, setOffline] = useState<OfflineSpeechState>(offlineSpeechState());
  const [offlineDismissed, setOfflineDismissed] = useState(false);
  const recorderRef = useRef<Recorder | null>(null);

  useEffect(() => {
    let cancelled = false;
    const canRecord = mediaRecorderSupported();

    // Packaged app: ask the device first. Async because it may have to
    // request the mic permission, so the tier settles a beat after mount.
    if (nativeSpeechPlatform()) {
      nativeSpeechReady().then((ok) => {
        if (cancelled) return;
        if (ok) {
          setTier("native");
          // Safe to run unprompted: checkRecognitionSupport never opens the
          // mic. Doing it here means tryOfflineFirst is already correct
          // before the learner's first tap, so a device without the model
          // goes straight to the network instead of stalling on a doomed
          // offline attempt first.
          checkOfflineSpeech("ja-JP").then((st) => {
            if (!cancelled) setOffline(st);
          });
        } else if (canRecord) {
          setTier("cloud");
        } else {
          setTier("typed");
          setShowTyped(true);
        }
      });
      return () => {
        cancelled = true;
      };
    }

    // iOS exposes a non-functional webkitSpeechRecognition, so prefer cloud STT
    // there. Elsewhere, the browser engine is free + instant when present.
    if (canRecord && (isIOS() || !speechSupported())) {
      setTier("cloud");
    } else if (speechSupported()) {
      setTier("web-speech");
    } else if (canRecord) {
      setTier("cloud");
    } else {
      setTier("typed");
      setShowTyped(true);
    }
    return () => {
      cancelled = true;
    };
  }, []);

  async function runNative() {
    setStatus("listening");
    setNote(null);
    try {
      const { promise } = listenOnceNative("ja-JP");
      const text = await promise;
      if (!text.trim()) {
        setNote("Did not catch that — try again, or type what you said.");
        setShowTyped(true);
        return;
      }
      onTranscript(text);
    } catch (err) {
      // Say WHICH attempt failed. Three separate speech bugs this session all
      // surfaced as the same vague sentence, which sent the debugging the
      // wrong way each time — the phone should name the failure, not the log.
      const msg = err instanceof Error ? err.message : "";
      setNote(
        msg.includes("timed out")
          ? "The recogniser did not respond — type what you said below."
          : "Speech recognition is unavailable — type what you said below."
      );
      setShowTyped(true);
    } finally {
      setStatus("idle");
    }
  }

  async function runWebSpeech() {
    setStatus("listening");
    setNote(null);
    try {
      const { promise } = listenOnce("ja-JP");
      const text = await promise;
      if (!text.trim()) {
        // Browser recognition returned nothing — recover with typed entry.
        setShowTyped(true);
        return;
      }
      onTranscript(text);
    } catch {
      setShowTyped(true);
    } finally {
      setStatus("idle");
    }
  }

  async function startCloud() {
    setNote(null);
    try {
      recorderRef.current = await startRecording();
      setStatus("recording");
    } catch {
      // Almost always a denied/blocked mic permission.
      setNote("Allow microphone access to speak — or type what you said below.");
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
      if (hint) form.append("prompt", hint);
      const res = await fetch(`${API_BASE}/api/transcribe`, { method: "POST", body: form });
      const data = await res.json();
      if (data?.stubbed || !data?.transcript) {
        // No cloud key (or nothing heard) — fall back to typed-romaji practice.
        setShowTyped(true);
      } else {
        onTranscript(data.transcript as string);
      }
    } catch {
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

  function handleMic() {
    if (tier === "native") {
      if (status === "idle") runNative();
    } else if (tier === "web-speech") {
      if (status === "idle") runWebSpeech();
    } else if (tier === "cloud") {
      if (status === "recording") stopCloud();
      else if (status === "idle") startCloud();
    }
  }

  async function probeOffline() {
    setOffline("checking");
    setOffline(await checkOfflineSpeech("ja-JP"));
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

  const showOfflineNotice =
    tier === "native" && offline !== "available" && !offlineDismissed;

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Speech works over the internet already; this is about whether it
          ALSO works without one. The learner has to install the language
          model themselves — the app cannot — so it has to be said out loud
          rather than the exercise just being quietly network-dependent. */}
      {showOfflineNotice && (
        <div className="w-full max-w-xs rounded-xl border-2 border-gold/50 bg-gold/10 px-3 py-2 text-left">
          <p className="text-xs font-extrabold uppercase tracking-wide text-wood">
            Needs internet
          </p>
          <p className="mt-0.5 text-sm text-ink">
            {offline === "missing" || offline === "claimed"
              ? "This device cannot recognise Japanese offline, so speaking practice needs a connection."
              : "Speaking practice uses the internet unless the Japanese voice pack is installed."}
          </p>
          <p className="mt-1 text-xs text-muted">
            {offline === "missing" && offlineSpeechReason()
              ? offlineSpeechReason()
              : OFFLINE_PACK_HINT}
          </p>
          <div className="mt-1.5 flex gap-3">
            <button
              onClick={probeOffline}
              disabled={offline === "checking"}
              className="text-xs font-bold text-brand-dark disabled:opacity-50"
            >
              {offline === "checking" ? "Checking…" : "I've installed it"}
            </button>
            <button
              onClick={() => setOfflineDismissed(true)}
              className="text-xs font-bold text-muted"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {tier !== "typed" && (
        <button
          onClick={handleMic}
          disabled={busy}
          className={`flex items-center gap-1.5 rounded-full px-4 py-2 font-bold text-white shadow-[0_2px_0_#3a5a34] disabled:opacity-60 ${
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

      {note && <p className="text-center text-xs text-muted">{note}</p>}

      {/* Always-available escape: if the mic mis-hears, type what you said. */}
      {tier !== "typed" && !showTyped && (
        <button
          onClick={() => setShowTyped(true)}
          className="text-xs font-bold text-muted underline underline-offset-2 hover:text-ink"
        >
          ⌨️ Type what you said instead
        </button>
      )}

      {showTyped && (
        <div className="w-full max-w-xs">
          <p className="mb-1 text-center text-xs text-muted">{typedPrompt}</p>
          <div className="flex items-center gap-2">
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitTyped()}
              placeholder={typedPlaceholder}
              className="min-w-0 flex-1 rounded-2xl border-2 border-gray-200 px-3 py-2 outline-none focus:border-brand"
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
