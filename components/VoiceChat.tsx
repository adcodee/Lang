"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2, Radio, Square, Flag } from "lucide-react";
import { DemoBadge } from "@/components/ChatPanel";
import { CorrectionMark } from "@/components/ui/JaMark";
import { speak, speechSupported, listenOnce } from "@/lib/speech";
import { recordUntilSilence } from "@/lib/audio";
import { useGameStore } from "@/lib/store/gameStore";
import SpeakInput from "@/components/SpeakInput";
import { API_BASE } from "@/lib/apiBase";
import type { TutorDebrief, TutorHole, TutorTurn } from "@/lib/ai/schema";
import DebriefCard from "@/components/tutor/DebriefCard";

interface VoiceLine {
  role: "user" | "assistant";
  text: string; // for an assistant line this is pure Japanese (spoken_ja + ask_next_ja)
  romaji?: string;
  didYouMean?: string;
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
  const [holes, setHoles] = useState<TutorHole[]>([]);
  const [ended, setEnded] = useState(false);
  const [debriefing, setDebriefing] = useState(false);
  const [debrief, setDebrief] = useState<TutorDebrief | null>(null);

  const handsFreeRef = useRef(false);
  const emptyTriesRef = useRef(0);
  const runTurnRef = useRef<() => void>(() => {});

  const started = lines.some((l) => l.role === "user");

  // Stop hands-free on unmount (cuts any pending speech).
  useEffect(() => {
    return () => {
      handsFreeRef.current = false;
      window.speechSynthesis?.cancel();
    };
  }, []);

  // Send a user turn to the tutor; append both lines; return the parsed turn.
  async function sendForReply(text: string): Promise<TutorTurn | null> {
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
      const data: TutorTurn & { stubbed?: boolean } = await res.json();
      setDemo(Boolean(data.stubbed));
      if (data.issue && data.issue !== "ok") {
        setHoles((h) => [
          ...h,
          {
            lessonId: data.holeLessonId || "",
            issue: data.issue,
            avoid: data.avoid || "",
            prefer: data.did_you_mean || "",
          },
        ]);
      }
      const spoken = [data.spoken_ja, data.ask_next_ja].filter(Boolean).join(" ");
      setLines((l) => [
        ...l,
        {
          role: "assistant",
          text: spoken || "…",
          romaji: data.romaji || undefined,
          didYouMean: data.did_you_mean || undefined,
        },
      ]);
      return data;
    } catch {
      setLines((l) => [
        ...l,
        { role: "assistant", text: "(Connection error — please try again.)" },
      ]);
      return null;
    } finally {
      setThinking(false);
    }
  }

  function spokenLine(data: TutorTurn): string {
    return [data.spoken_ja, data.ask_next_ja].filter(Boolean).join(" ");
  }

  // Manual (tap-to-speak) turn.
  async function handleTranscript(transcript: string) {
    const text = transcript.trim();
    if (!text || ended) return;
    const data = await sendForReply(text);
    if (data) speak(spokenLine(data));
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
    const data = await sendForReply(transcript);
    if (!handsFreeRef.current) return;
    if (!data) {
      stopHandsFree("Connection error — tap Start to resume.");
      return;
    }

    setPhase("speaking");
    speak(spokenLine(data), "ja-JP", () => {
      if (handsFreeRef.current) runTurnRef.current();
      else setPhase("idle");
    });
  }
  runTurnRef.current = runTurn;

  function startHandsFree() {
    if (ended) return;
    setNote(null);
    emptyTriesRef.current = 0;
    handsFreeRef.current = true;
    setHandsFree(true);
    runTurn(); // kicked off within the tap gesture (iOS-friendly)
  }

  async function endPractice() {
    if (ended || debriefing) return;
    stopHandsFree();
    setEnded(true);
    setDebriefing(true);
    try {
      const res = await fetch(`${API_BASE}/api/debrief`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: "voice",
          messages: lines.map((l) => ({ role: l.role, content: l.text })),
          completedLessons: completed,
          scenario: scenarioId,
          holes,
        }),
      });
      const data = await res.json();
      setDemo(Boolean(data.stubbed));
      setDebrief(data);
    } catch {
      setDebrief({
        went_well: "Couldn't reach the coach — try End practice again.",
        notes: [],
        redo: [],
      });
    } finally {
      setDebriefing(false);
    }
  }

  function practiceAgain() {
    setLines(starter ? [{ role: "assistant", text: starter }] : []);
    setHoles([]);
    setEnded(false);
    setDebrief(null);
    setPhase("idle");
    setNote(null);
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
        <div className="flex items-center gap-2">
          {demo && <DemoBadge />}
          <button
            onClick={endPractice}
            disabled={!started || ended}
            className="flex items-center gap-1 rounded-full border-2 border-gray-200 px-3 py-1 text-xs font-bold text-muted disabled:opacity-40"
          >
            <Flag className="h-3 w-3" /> End practice
          </button>
        </div>
      </div>

      {debrief ? (
        <DebriefCard debrief={debrief} onPracticeAgain={practiceAgain} />
      ) : (
        <>
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
                  {l.didYouMean && (
                    <div className="mt-2 rounded-xl bg-gold/15 px-3 py-2 text-sm text-ink">
                      <span className="inline-flex items-start gap-1.5">
                        <CorrectionMark className="mt-0.5 h-4 w-4" />
                        Did you mean: {l.didYouMean}
                      </span>
                    </div>
                  )}
                  {l.role === "assistant" && (
                    <button
                      onClick={() => speak(l.text)}
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
            {debriefing && (
              <div className="text-sm text-muted">Coach is reviewing the session…</div>
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
                  disabled={ended}
                  className="flex items-center gap-2 rounded-full bg-brand px-5 py-2 font-bold text-white shadow-[0_3px_0_#3a5a34] disabled:opacity-50"
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
        </>
      )}
    </div>
  );
}
