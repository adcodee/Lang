"use client";

import { useState } from "react";
import { Volume2 } from "lucide-react";
import { speak, matchesSpoken } from "@/lib/speech";
import SpeakInput from "@/components/SpeakInput";
import type { PhraseTeachCard } from "@/lib/types";

// Intro for a word/phrase: hear it, read it, say it. No stroke order/tracing.
export default function PhraseCard({
  card,
  onSpeakAttempt,
}: {
  card: PhraseTeachCard;
  onSpeakAttempt: (correct: boolean) => void;
}) {
  const [heard, setHeard] = useState<null | boolean>(null);

  function gradeSpoken(text: string) {
    const ok = matchesSpoken(text, card.term, [card.reading]);
    setHeard(ok);
    onSpeakAttempt(ok);
  }

  return (
    <div className="teach-surface flex flex-col gap-6 rounded-2xl border-2 border-gray-100 p-6">
      {/* Term + meaning */}
      <section className="text-center">
        <div className="font-jp text-4xl font-bold text-sumi">{card.term}</div>
        <div className="mt-1 text-lg font-bold text-muted">{card.reading}</div>
        <div className="mt-2 text-xl font-extrabold text-ink">{card.meaning}</div>
      </section>

      {/* Listen & Say */}
      <section className="flex flex-col items-center gap-3">
        <button
          onClick={() => speak(card.term)}
          className="flex items-center gap-1.5 rounded-full bg-sky px-4 py-2 font-bold text-white shadow-[0_2px_0_#1a8fc7]"
        >
          <Volume2 className="h-4 w-4" /> Hear it
        </button>
        <SpeakInput
          onTranscript={gradeSpoken}
          typedPlaceholder={`Type "${card.reading}"`}
        />
        {heard !== null && (
          <p
            className={`text-sm font-bold ${
              heard ? "text-brand-dark" : "text-muted"
            }`}
          >
            {heard ? "Nice — that sounded right!" : "Give it another go."}
          </p>
        )}
        <p className="text-xs text-muted">Tap to hear it, then say it aloud.</p>
      </section>

      {/* Usage note */}
      {card.note && (
        <section className="rounded-2xl bg-washi p-4 text-center text-sm text-sumi">
          💡 {card.note}
        </section>
      )}
    </div>
  );
}
