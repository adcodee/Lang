"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square, Volume2, Type } from "lucide-react";
import { DemoBadge } from "@/components/ChatPanel";
import { listenOnce, speak, speechSupported } from "@/lib/speech";

interface VoiceLine {
  role: "user" | "assistant";
  text: string;
  romaji?: string;
}

export default function VoiceChat() {
  const [lines, setLines] = useState<VoiceLine[]>([]);
  const [listening, setListening] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [demo, setDemo] = useState(false);
  const [supported, setSupported] = useState(true);
  const [typed, setTyped] = useState("");
  const stopRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    setSupported(speechSupported());
  }, []);

  async function handleTranscript(transcript: string) {
    const text = transcript.trim();
    if (!text) return;
    setLines((l) => [...l, { role: "user", text }]);
    setThinking(true);
    try {
      const res = await fetch("/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: text }),
      });
      const data = await res.json();
      setDemo(Boolean(data.stubbed));
      const reply: string = data.reply ?? "…";
      setLines((l) => [
        ...l,
        { role: "assistant", text: reply, romaji: data.romaji },
      ]);
      speak(stripEnglish(reply));
    } catch {
      setLines((l) => [
        ...l,
        { role: "assistant", text: "(Connection error — please try again.)" },
      ]);
    } finally {
      setThinking(false);
    }
  }

  async function startListening() {
    if (!supported) return;
    setListening(true);
    const { promise, stop } = listenOnce("ja-JP");
    stopRef.current = stop;
    try {
      const transcript = await promise;
      await handleTranscript(transcript);
    } catch {
      // ignore recognition errors (e.g. no speech)
    } finally {
      setListening(false);
      stopRef.current = null;
    }
  }

  function stopListening() {
    stopRef.current?.();
    setListening(false);
  }

  function sendTyped() {
    const t = typed.trim();
    if (!t) return;
    setTyped("");
    handleTranscript(t);
  }

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
            Tap the mic and say something in Japanese — like「こんにちは」.
            <br />
            The tutor will reply out loud.
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
        {thinking && (
          <div className="text-sm text-muted">考え中… (thinking…)</div>
        )}
      </div>

      <div className="border-t-2 border-gray-100 p-3">
        {supported ? (
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={listening ? stopListening : startListening}
              disabled={thinking}
              className={`flex h-16 w-16 items-center justify-center rounded-full text-white shadow-node disabled:opacity-50 ${
                listening ? "animate-pulse bg-heart" : "bg-brand"
              }`}
              aria-label={listening ? "Stop" : "Speak"}
            >
              {listening ? <Square className="h-6 w-6" /> : <Mic className="h-7 w-7" />}
            </button>
            <span className="text-xs text-muted">
              {listening ? "Listening…" : "Tap to speak"}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Type className="h-5 w-5 text-muted" />
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendTyped()}
              placeholder="Voice not supported — type instead…"
              className="flex-1 rounded-2xl border-2 border-gray-200 px-4 py-2 outline-none focus:border-brand"
            />
            <button onClick={sendTyped} className="btn-brand px-4 py-2">
              Send
            </button>
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
