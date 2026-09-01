"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2, Radio, Square } from "lucide-react";
import { DemoBadge } from "@/components/ChatPanel";
import { speak, speechSupported, listenOnce } from "@/lib/speech";
import { recordUntilSilence } from "@/lib/audio";
import { useGameStore } from "@/lib/store/gameStore";
import SpeakInput from "@/components/SpeakInput";
import { API_BASE } from "@/lib/apiBase";

interface VoiceLine {
  role: "user" | "assistant";
  text: string;
  romaji?: string;
}

type Phase = "idle" | "listening" | "thinking" | "speaking";

export default function VoiceChat({
  starter,
  scenarioId,
}: {
  starter?: string; // opening assistant line (scenario opener)
  scenarioId?: string;
}) {
  const completed = useGameStore((s) => s.completedLessons);
  const [lines, setLines] = useState<VoiceLine[]>(
    starter ? [{ role: "assistant", text: starter }] : []
  );
  const [thinking, setThinking] = useState(false);
  const [demo, setDemo] = useState(false);
  const [handsFree, setHandsFree] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [note, setNote] = useState<string | null>(null);

  const handsFreeRef = useRef(false);
  const emptyTriesRef = useRef(0);
  const runTurnRef = useRef<() => void>(() => {});

  // Stop hands-free on unmount (cuts any pending speech).
  useEffect(() => {
    return () => {
      handsFreeRef.current = false;
      window.speechSynthesis?.cancel();
    };
  }, []);

  // Send a user turn to the tutor; append both lines; return the reply text.
  async function sendForReply(text: string): Promise<string> {
    // Snapshot before appending — the transcript itself goes as `transcript`.
    const history = lines.map((l) => ({ role: l.role, content: l.text }));
    setLines((l) => [...l, { role: "user", text }]);
    setThinking(true);
    try {
      const res = await fetch(`${API_BASE}/api/voice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // history gives the tutor memory of the exchange; completedLessons
        // lets the server constrain it to taught vocabulary.
        body: JSON.stringify({
          transcript: text,
          history,
          completedLessons: completed,
          scenario: scenarioId,
        }),
      });
      const data = await res.json();
      setDemo(Boolean(data.stubbed));
      const reply: string = data.reply ?? "…";
      setLines((l) => [
        ...l,
        { role: "assistant", text: reply, romaji: data.romaji },
      ]);
      return reply;
    } catch {
      setLines((l) => [
        ...l,
        { role: "assistant", text: "(Connection error — please try again.)" },
      ]);
      return "";
    } finally {
      setThinking(false);
    }
  }

  // Manual (tap-to-speak) turn.
  async function handleTranscript(transcript: string) {
    const text = transcript.trim();
    if (!text) return;
    const reply = await sendForReply(text);
    if (reply) speak(stripEnglish(reply));
  }

  async function cloudTranscribe(blob: Blob): Promise<string | null> {
    const form = new FormData();
    form.append("audio", blob, "audio");
    form.append("language", "ja");
    const res = await fetch(`${API_BASE}/api/transcribe`, { method: "POST", body: form });
    const data = await res.json();
    if (data?.stubbed) return null; // no STT key — can't run hands-free
    return typeof data?.transcript === "string" ? data.transcript : "";
  }

  function stopHandsFree(msg?: string) {
    handsFreeRef.current = false;
    setHandsFree(false);
    setPhase("idle");
    if (msg) setNote(msg);
    window.speechSynthesis?.cancel();
  }

  // One conversational turn: listen → transcribe → reply → speak → repeat.
  async function runTurn() {
    if (!handsFreeRef.current) return;
    setPhase("listening");
    setNote(null);

    let transcript = "";
    try {
      if (speechSupported()) {
        transcript = await listenOnce("ja-JP").promise;
      } else {
        const blob = await recordUntilSilence();
        const t = await cloudTranscribe(blob);
        if (t === null) {
          stopHandsFree("Hands-free needs a speech-to-text key configured.");
          return;
        }
        transcript = t;
      }
    } catch {
      stopHandsFree("Microphone unavailable — allow access and try again.");
      return;
    }
    if (!handsFreeRef.current) return;

    if (!transcript.trim()) {
      // Give a couple of chances before bowing out, to avoid tight loops.
      emptyTriesRef.current += 1;
      if (emptyTriesRef.current >= 2) {
        stopHandsFree("Didn't catch that — tap Start to resume.");
      } else {
        setTimeout(() => runTurnRef.current(), 300);
      }
      return;
    }
    emptyTriesRef.current = 0;

    setPhase("thinking");
    const reply = await sendForReply(transcript);
    if (!handsFreeRef.current) return;
    if (!reply) {
      stopHandsFree("Connection error — tap Start to resume.");
      return;
    }

    setPhase("speaking");
    speak(stripEnglish(reply), "ja-JP", () => {
      if (handsFreeRef.current) runTurnRef.current();
      else setPhase("idle");
    });
  }
  runTurnRef.current = runTurn;

  function startHandsFree() {
    setNote(null);
    emptyTriesRef.current = 0;
    handsFreeRef.current = true;
    setHandsFree(true);
    runTurn(); // kicked off within the tap gesture (iOS-friendly)
  }

  const phaseLabel =
    phase === "listening"
      ? "🎤 Listening… speak now"
      : phase === "thinking"
      ? "考え中… (thinking…)"
      : phase === "speaking"
      ? "🔊 Tutor speaking…"
      : "";

  return (
    <div className="card flex h-[28rem] flex-col">
      <div className="flex items-center justify-between border-b-2 border-gray-100 px-4 py-3">
        <div className="flex items-center gap-2 font-extrabold text-ink">
          <Volume2 className="h-5 w-5 text-brand" /> Voice tutor
          <span className="text-xs font-normal text-muted">· Grok</span>
        </div>
        {demo && <DemoBadge />}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {lines.length === 0 && (
          <p className="text-center text-sm text-muted">
            Start a hands-free conversation, or tap the mic for one turn.
            <br />
            Say something in Japanese — like「こんにちは」.
          </p>
        )}
        {lines.map((l, i) => (
          <div
            key={i}
            className={`flex ${l.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2 ${
                l.role === "user"
                  ? "bg-brand text-white"
                  : "border-2 border-gray-100 bg-white"
              }`}
            >
              <div>{l.text}</div>
              {l.romaji && (
                <div className="mt-1 text-sm italic text-muted">{l.romaji}</div>
              )}
              {l.role === "assistant" && (
                <button
                  onClick={() => speak(stripEnglish(l.text))}
                  className="mt-1 flex items-center gap-1 text-xs text-sky"
                >
                  <Volume2 className="h-3 w-3" /> Replay
                </button>
              )}
            </div>
          </div>
        ))}
        {thinking && !handsFree && (
          <div className="text-sm text-muted">考え中… (thinking…)</div>
        )}
      </div>

      <div className="border-t-2 border-gray-100 p-3">
        {handsFree ? (
          <div className="flex flex-col items-center gap-2">
            <div className="min-h-[1.25rem] text-sm font-bold text-ink">
              {phaseLabel}
            </div>
            <button
              onClick={() => stopHandsFree()}
              className="flex items-center gap-1.5 rounded-full bg-heart px-4 py-2 font-bold text-white shadow-[0_2px_0_#a04a4a]"
            >
              <Square className="h-4 w-4" /> Stop conversation
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={startHandsFree}
              className="flex items-center gap-2 rounded-full bg-brand px-5 py-2 font-bold text-white shadow-[0_3px_0_#3a5a34]"
            >
              <Radio className="h-4 w-4" /> Start hands-free conversation
            </button>
            {note && <p className="text-center text-xs text-muted">{note}</p>}
            <div className="text-[11px] uppercase tracking-wide text-muted">
              or one turn
            </div>
            <SpeakInput
              onTranscript={handleTranscript}
              idleLabel="Tap to speak"
              typedPrompt="Type what you said (or type in Japanese)"
              typedPlaceholder="Type here…"
            />
          </div>
        )}
      </div>
    </div>
  );
}

// The tutor replies with "Japanese (English)" — speak only the Japanese part.
function stripEnglish(text: string): string {
  return text.replace(/\([^)]*\)/g, "").trim() || text;
}
