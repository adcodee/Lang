"use client";

import { useEffect, useState } from "react";
import { MessageSquare, Mic, Lock } from "lucide-react";
import ChatPanel from "@/components/ChatPanel";
import VoiceChat from "@/components/VoiceChat";
import { scenarios, isScenarioUnlocked } from "@/lib/content/scenarios";
import { getLesson } from "@/lib/content/curriculum";
import { useGameStore } from "@/lib/store/gameStore";

type Mode = "text" | "voice";

// The tutor unlocks with the first greetings lesson — same progression
// pattern as the Dojo drills. Scenarios unlock individually after the
// lesson that teaches their language.
const TUTOR_UNLOCK = "u2-greetings-core";

export default function PracticePage() {
  const completed = useGameStore((s) => s.completedLessons);
  const [mode, setMode] = useState<Mode>("text");
  const [scenarioId, setScenarioId] = useState(scenarios[0].id);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const tutorUnlocked = !mounted || completed.includes(TUTOR_UNLOCK);
  const unlockedScenarios = scenarios.filter(
    (s) => !mounted || isScenarioUnlocked(s, completed)
  );
  const scenario =
    unlockedScenarios.find((s) => s.id === scenarioId) ??
    unlockedScenarios[0] ??
    scenarios[0];

  if (!tutorUnlocked) {
    return (
      <div className="card flex flex-col items-center gap-3 p-10 text-center">
        <Lock className="h-8 w-8 text-muted" />
        <h1 className="text-xl font-extrabold text-ink">
          Your tutor is waiting
        </h1>
        <p className="max-w-xs text-sm text-muted">
          Complete “{getLesson(TUTOR_UNLOCK)?.title ?? "Basic Greetings"}” to
          unlock conversation practice — the tutor only ever uses the Japanese
          you&apos;ve learned.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="card mb-4 p-6 text-center">
        <h1 className="text-2xl font-extrabold text-ink">Conversation practice</h1>
        <p className="mt-1 text-muted">
          Hold a real conversation with your AI tutor — it sticks to the
          Japanese you&apos;ve learned and corrects you gently.
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

      {/* Scenario chips — locked ones show until their lesson is completed */}
      <div className="mb-6 flex flex-wrap justify-center gap-2">
        {scenarios.map((s) => {
          const unlocked = !mounted || isScenarioUnlocked(s, completed);
          if (!unlocked) {
            return (
              <span
                key={s.id}
                title={`Complete “${getLesson(s.unlockAfter)?.title ?? s.unlockAfter}” to unlock`}
                className="flex cursor-not-allowed items-center gap-1 rounded-full bg-white px-3 py-1.5 text-sm font-bold text-muted opacity-60 shadow-card"
              >
                <Lock className="h-3 w-3" /> {s.label}
              </span>
            );
          }
          return (
            <button
              key={s.id}
              onClick={() => setScenarioId(s.id)}
              className={`rounded-full px-3 py-1.5 text-sm font-bold transition ${
                scenario.id === s.id
                  ? "bg-brand text-white shadow-[0_2px_0_#3a5a34]"
                  : "bg-white text-muted shadow-card hover:text-ink"
              }`}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {mode === "text" ? (
        // key on scenario so switching scenarios restarts with the new opener.
        <ChatPanel
          key={scenario.id}
          starter={scenario.starter}
          scenarioId={scenario.id}
        />
      ) : (
        <VoiceChat
          key={scenario.id}
          starter={scenario.starter.content}
          scenarioId={scenario.id}
        />
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
