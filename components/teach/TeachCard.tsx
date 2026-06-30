"use client";

import { useState } from "react";
import { Volume2 } from "lucide-react";
import { speak, matchesSpoken } from "@/lib/speech";
import SpeakInput from "@/components/SpeakInput";
import StrokeOrder from "@/components/teach/StrokeOrder";
import TraceCanvas from "@/components/teach/TraceCanvas";
import type { KanaTeachCard } from "@/lib/types";

// One character's introduction: listen & say, mnemonic, stroke order, trace,
// and an example word. Side effects (XP / speaking stats) are lifted to the
// parent via callbacks so this stays presentational.
export default function TeachCard({
  card,
  onSpeakAttempt,
  onTraced,
}: {
  card: KanaTeachCard;
  onSpeakAttempt: (correct: boolean) => void;
  onTraced: () => void;
}) {
  const [heard, setHeard] = useState<null | boolean>(null);

  function gradeSpoken(text: string) {
    const ok = matchesSpoken(text, card.char, [card.romaji]);
    setHeard(ok);
    onSpeakAttempt(ok);
  }

  return (
    <div className="teach-surface flex flex-col gap-6 rounded-2xl border-2 border-gray-100 p-6">
      {/* 1) Listen & Say */}
      <section className="text-center">
        <div className="font-jp text-7xl text-sumi">{card.char}</div>
        <div className="mt-1 text-lg font-bold text-muted">{card.romaji}</div>
        <div className="mt-3 flex flex-col items-center gap-3">
          <button
            onClick={() => speak(card.char)}
            className="flex items-center gap-1.5 rounded-full bg-sky px-4 py-2 font-bold text-white shadow-[0_2px_0_#1a8fc7]"
          >
            <Volume2 className="h-4 w-4" /> Hear it
          </button>
          <SpeakInput
            onTranscript={gradeSpoken}
            typedPlaceholder={`Type "${card.romaji}"`}
          />
        </div>
        {heard !== null && (
          <p
            className={`mt-2 text-sm font-bold ${
              heard ? "text-brand-dark" : "text-muted"
            }`}
          >
            {heard ? "Nice — that sounded right!" : "Give it another go."}
          </p>
        )}
        <p className="mt-1 text-xs text-muted">Tap to hear it, then say it aloud.</p>
      </section>

      {/* 2) Mnemonic */}
      <section className="rounded-2xl bg-washi p-4 text-center">
        <div className="text-3xl">{card.mnemonicEmoji ?? "💡"}</div>
        <p className="mt-1 text-sm text-sumi">{card.mnemonic}</p>
      </section>

      {/* 3) Stroke order */}
      <section className="flex flex-col items-center">
        <h3 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-muted">
          Stroke order
        </h3>
        <StrokeOrder char={card.char} />
      </section>

      {/* 4) Trace */}
      <section className="flex flex-col items-center">
        <h3 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-muted">
          Your turn — trace it
        </h3>
        <TraceCanvas
          char={card.char}
          onDrawnChange={(drawn) => drawn && onTraced()}
        />
      </section>

      {/* 5) Example word */}
      <section className="flex items-center justify-between rounded-2xl border-2 border-gray-100 p-4">
        <div>
          <div className="font-jp text-2xl text-sumi">{card.example.word}</div>
          <div className="text-sm text-muted">
            {card.example.romaji} — {card.example.meaning}
          </div>
        </div>
        <button
          onClick={() => speak(card.example.word)}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-sky text-white shadow-[0_2px_0_#1a8fc7]"
          aria-label="Hear the example word"
        >
          <Volume2 className="h-5 w-5" />
        </button>
      </section>
    </div>
  );
}
