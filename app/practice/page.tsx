"use client";

import { useState } from "react";
import { MessageSquare, Mic } from "lucide-react";
import ChatPanel from "@/components/ChatPanel";
import VoiceChat from "@/components/VoiceChat";
import type { ChatMessage } from "@/lib/types";

type Mode = "text" | "voice";

// Each scenario seeds the tutor's opening line + context.
const SCENARIOS: { id: string; label: string; starter: ChatMessage }[] = [
  {
    id: "free",
    label: "Free chat",
    starter: {
      role: "assistant",
      content: "こんにちは！日本語で話しましょう。(Hello! Let's talk in Japanese.)",
    },
  },
  {
    id: "friend",
    label: "Meeting a friend",
    starter: {
      role: "assistant",
      content:
        "やあ！ひさしぶり！げんき？ (Hey! Long time no see! How are you?) — We're friends meeting in Tokyo.",
    },
  },
  {
    id: "ramen",
    label: "Ordering ramen",
    starter: {
      role: "assistant",
      content:
        "いらっしゃいませ！ごちゅうもんは？ (Welcome! What would you like to order?) — You're at a ramen shop.",
    },
  },
  {
    id: "directions",
    label: "Asking directions",
    starter: {
      role: "assistant",
      content:
        "はい、どうしましたか？ (Yes, can I help you?) — You're lost and asking a passer-by for directions.",
    },
  },
];

export default function PracticePage() {
  const [mode, setMode] = useState<Mode>("text");
  const [scenarioId, setScenarioId] = useState("free");
  const scenario = SCENARIOS.find((s) => s.id === scenarioId) ?? SCENARIOS[0];

  return (
    <div>
      <div className="card mb-4 p-6 text-center">
        <h1 className="text-2xl font-extrabold text-ink">Conversation practice</h1>
        <p className="mt-1 text-muted">
          Hold a real conversation with your AI tutor and get corrective
          feedback.
        </p>
      </div>

      {/* Text / Voice toggle */}
      <div className="mb-4 flex justify-center">
        <div className="inline-flex rounded-full bg-gray-100 p-1">
          <ToggleButton
            active={mode === "text"}
            onClick={() => setMode("text")}
            icon={<MessageSquare className="h-4 w-4" />}
            label="Text"
          />
          <ToggleButton
            active={mode === "voice"}
            onClick={() => setMode("voice")}
            icon={<Mic className="h-4 w-4" />}
            label="Voice"
          />
        </div>
      </div>

      {/* Scenario chips (text mode seeds the opening line) */}
      <div className="mb-6 flex flex-wrap justify-center gap-2">
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            onClick={() => setScenarioId(s.id)}
            className={`rounded-full px-3 py-1.5 text-sm font-bold transition ${
              scenarioId === s.id
                ? "bg-brand text-white shadow-[0_2px_0_#3a5a34]"
                : "bg-white text-muted shadow-card hover:text-ink"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {mode === "text" ? (
        // key on scenario so switching scenarios restarts with the new opener.
        <ChatPanel key={scenario.id} starter={scenario.starter} />
      ) : (
        <VoiceChat />
      )}

      <p className="mt-4 text-center text-xs text-muted">
        Text tutoring is powered by Claude; voice practice by Grok. Without API
        keys the app runs in Demo mode with sample responses.
      </p>
    </div>
  );
}

function ToggleButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition ${
        active ? "bg-white text-ink shadow-card" : "text-muted hover:text-ink"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
