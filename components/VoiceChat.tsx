"use client";

import { useState } from "react";
import { Volume2 } from "lucide-react";
import { DemoBadge } from "@/components/ChatPanel";
import { speak } from "@/lib/speech";
import SpeakInput from "@/components/SpeakInput";

interface VoiceLine {
  role: "user" | "assistant";
  text: string;
  romaji?: string;
}

export default function VoiceChat() {
  const [lines, setLines] = useState<VoiceLine[]>([]);
  const [thinking, setThinking] = useState(false);
  const [demo, setDemo] = useState(false);

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

      <div className="flex justify-center border-t-2 border-gray-100 p-3">
        <SpeakInput
          onTranscript={handleTranscript}
          idleLabel="Tap to speak"
          typedPrompt="Type what you said (or type in Japanese)"
          typedPlaceholder="Type here…"
        />
      </div>
    </div>
  );
}

// The tutor replies with "Japanese (English)" — speak only the Japanese part.
function stripEnglish(text: string): string {
  return text.replace(/\([^)]*\)/g, "").trim() || text;
}
