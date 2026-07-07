"use client";

import { useRef, useState } from "react";
import { Send, Sparkles } from "lucide-react";
import { useGameStore } from "@/lib/store/gameStore";
import type { ChatMessage } from "@/lib/types";

const STARTER: ChatMessage = {
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
  const [messages, setMessages] = useState<ChatMessage[]>([starter ?? STARTER]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [demo, setDemo] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // completedLessons lets the server derive the allowed vocabulary —
        // the tutor stays inside what's actually been taught.
        body: JSON.stringify({
          messages: next,
          completedLessons: completed,
          scenario: scenarioId,
        }),
      });
      const data = await res.json();
      setDemo(Boolean(data.stubbed));
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: data.reply ?? "…",
          correction: data.correction || undefined,
        },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "(Connection error — please try again.)" },
      ]);
    } finally {
      setLoading(false);
      requestAnimationFrame(() =>
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
      );
    }
  }

  return (
    <div className="card flex h-[28rem] flex-col">
      <div className="flex items-center justify-between border-b-2 border-gray-100 px-4 py-3">
        <div className="flex items-center gap-2 font-extrabold text-ink">
          <Sparkles className="h-5 w-5 text-sky" /> Text tutor
          <span className="text-xs font-normal text-muted">· Claude</span>
        </div>
        {demo && <DemoBadge />}
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2 ${
                m.role === "user"
                  ? "bg-sky text-white"
                  : "border-2 border-gray-100 bg-white"
              }`}
            >
              <div className="whitespace-pre-wrap">{m.content}</div>
              {m.correction && (
                <div className="mt-2 rounded-xl bg-gold/15 px-3 py-2 text-sm text-ink">
                  ✏️ {m.correction}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && <div className="text-sm text-muted">考え中… (thinking…)</div>}
      </div>

      <div className="flex items-center gap-2 border-t-2 border-gray-100 p-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Type in Japanese or English…"
          className="flex-1 rounded-2xl border-2 border-gray-200 px-4 py-2 outline-none focus:border-sky"
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky text-white shadow-[0_3px_0_#244a40] disabled:opacity-50"
          aria-label="Send"
        >
          <Send className="h-5 w-5" />
        </button>
      </div>
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
