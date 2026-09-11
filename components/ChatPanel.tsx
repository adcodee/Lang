"use client";

import { useRef, useState } from "react";
import { Send, Sparkles, Flag } from "lucide-react";
import { CorrectionMark } from "@/components/ui/JaMark";
import { useGameStore } from "@/lib/store/gameStore";
import type { ChatMessage } from "@/lib/types";
import type { TutorDebrief, TutorHole } from "@/lib/ai/schema";
import { API_BASE } from "@/lib/apiBase";
import DebriefCard from "@/components/tutor/DebriefCard";

// A line as rendered in the panel. Distinct from ChatMessage (the
// role+content shape sent to the server) so the tutor's romaji / quiet
// correction never leak into what gets POSTed as conversation history.
interface Line {
  role: "user" | "assistant";
  content: string;
  romaji?: string;
  didYouMean?: string;
}

const STARTER: Line = {
  role: "assistant",
  content: "こんにちは！日本語で話しましょう。(Hello! Let's talk in Japanese.)",
};

export default function ChatPanel({
  starter,
  scenarioId,
}: {
  starter?: ChatMessage;
  scenarioId?: string;
}) {
  const completed = useGameStore((s) => s.completedLessons);
  const [lines, setLines] = useState<Line[]>([
    starter ? { role: "assistant", content: starter.content } : STARTER,
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [demo, setDemo] = useState(false);
  const [holes, setHoles] = useState<TutorHole[]>([]);
  const [ended, setEnded] = useState(false);
  const [debriefing, setDebriefing] = useState(false);
  const [debrief, setDebrief] = useState<TutorDebrief | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const started = lines.some((l) => l.role === "user");

  async function send() {
    const text = input.trim();
    if (!text || loading || ended) return;
    const next: Line[] = [...lines, { role: "user", content: text }];
    setLines(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // completedLessons lets the server derive the allowed vocabulary —
        // the tutor stays inside what's actually been taught.
        body: JSON.stringify({
          messages: next.map((l) => ({ role: l.role, content: l.content })),
          completedLessons: completed,
          scenario: scenarioId,
        }),
      });
      const data = await res.json();
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
          content: spoken || "…",
          romaji: data.romaji || undefined,
          didYouMean: data.did_you_mean || undefined,
        },
      ]);
    } catch {
      setLines((l) => [
        ...l,
        { role: "assistant", content: "(Connection error — please try again.)" },
      ]);
    } finally {
      setLoading(false);
      requestAnimationFrame(() =>
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
      );
    }
  }

  async function endPractice() {
    if (ended || debriefing) return;
    setEnded(true);
    setDebriefing(true);
    try {
      const res = await fetch(`${API_BASE}/api/debrief`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: "text",
          messages: lines.map((l) => ({ role: l.role, content: l.content })),
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
    setLines([starter ? { role: "assistant", content: starter.content } : STARTER]);
    setHoles([]);
    setEnded(false);
    setDebrief(null);
  }

  return (
    <div className="card flex h-[28rem] flex-col">
      <div className="flex items-center justify-between border-b-2 border-gray-100 px-4 py-3">
        <div className="flex items-center gap-2 font-extrabold text-ink">
          <Sparkles className="h-5 w-5 text-sky" /> Text tutor
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
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
            {lines.map((l, i) => (
              <div
                key={i}
                className={`flex ${l.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2 ${
                    l.role === "user"
                      ? "bg-sky text-white"
                      : "border-2 border-gray-100 bg-white"
                  }`}
                >
                  <div className="whitespace-pre-wrap">{l.content}</div>
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
                </div>
              </div>
            ))}
            {loading && <div className="text-sm text-muted">考え中… (thinking…)</div>}
            {debriefing && (
              <div className="text-sm text-muted">Coach is reviewing the session…</div>
            )}
          </div>

          <div className="flex items-center gap-2 border-t-2 border-gray-100 p-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Type in Japanese or English…"
              disabled={ended}
              className="flex-1 rounded-2xl border-2 border-gray-200 px-4 py-2 outline-none focus:border-sky disabled:opacity-50"
            />
            <button
              onClick={send}
              disabled={loading || ended || !input.trim()}
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky text-white shadow-[0_3px_0_#244a40] disabled:opacity-50"
              aria-label="Send"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function DemoBadge() {
  return (
    <span className="rounded-full bg-gold/20 px-2 py-1 text-xs font-bold text-yellow-700">
      Demo mode
    </span>
  );
}
