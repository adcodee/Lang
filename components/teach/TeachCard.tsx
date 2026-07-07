"use client";

import { Volume2 } from "lucide-react";
import { speak } from "@/lib/speech";
import StrokeOrder from "@/components/teach/StrokeOrder";
import TraceCanvas from "@/components/teach/TraceCanvas";
import { strokeData } from "@/lib/content/strokes";
import type { KanaTeachCard } from "@/lib/types";

// One character's introduction: listen, mnemonic, stroke order, trace, and an
// example word. (No speech grading here — a single isolated kana can't be
// reliably recognised; speaking practice lives at the word/phrase level.)
export default function TeachCard({
  card,
  onTraced,
}: {
  card: KanaTeachCard;
  onTraced: () => void;
}) {
  // Voiced/combined kana (が, ぱ, きゃ…) reuse base shapes and carry no separate
  // stroke data — skip the stroke-order/trace sections for them gracefully.
  const hasStrokes = Boolean(strokeData[card.char]);
  return (
    <div className="teach-surface flex flex-col gap-6 rounded-2xl border-2 border-gray-100 p-6">
      {/* 1) Listen — a pronounceable kana speaks itself; a silent mark (っ, ー)
          demos a minimal pair instead, since the mark can't be said alone. */}
      <section className="text-center">
        <div className="font-jp text-7xl text-sumi">{card.char}</div>
        <div className="mt-1 text-lg font-bold text-muted">{card.romaji}</div>
        {card.contrast ? (
          <div className="mt-3">
            <p className="mb-2 text-xs text-muted">
              This mark has no sound of its own — hear what it does:
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[card.contrast.a, card.contrast.b].map((w) => (
                <button
                  key={w.word}
                  onClick={() => speak(w.word)}
                  className="rounded-2xl border-2 border-gray-200 p-3 transition hover:border-sky"
                >
                  <div className="font-jp text-2xl text-sumi">{w.word}</div>
                  <div className="mt-0.5 text-xs text-muted">
                    {w.romaji} — {w.meaning}
                  </div>
                  <div className="mt-1.5 flex justify-center">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sky text-white">
                      <Volume2 className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted">
              Tap both — hear how the mark changes the word.
            </p>
          </div>
        ) : (
          <div className="mt-3 flex flex-col items-center gap-1">
            <button
              onClick={() => speak(card.char)}
              className="flex items-center gap-1.5 rounded-full bg-sky px-4 py-2 font-bold text-white shadow-[0_2px_0_#244a40]"
            >
              <Volume2 className="h-4 w-4" /> Hear it
            </button>
            <p className="mt-1 text-xs text-muted">Tap to hear it, then say it aloud.</p>
          </div>
        )}
      </section>

      {/* 2) Mnemonic */}
      <section className="rounded-2xl bg-washi p-4 text-center">
        <div className="text-3xl">{card.mnemonicEmoji ?? "💡"}</div>
        <p className="mt-1 text-sm text-sumi">{card.mnemonic}</p>
      </section>

      {/* 3) Stroke order (only for kana with their own stroke data) */}
      {hasStrokes && (
        <section className="flex flex-col items-center">
          <h3 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-muted">
            Stroke order
          </h3>
          <StrokeOrder char={card.char} />
        </section>
      )}

      {/* 4) Trace */}
      {hasStrokes && (
        <section className="flex flex-col items-center">
          <h3 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-muted">
            Your turn — trace it
          </h3>
          <TraceCanvas
            char={card.char}
            onDrawnChange={(drawn) => drawn && onTraced()}
          />
        </section>
      )}

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
          className="flex h-11 w-11 items-center justify-center rounded-full bg-sky text-white shadow-[0_2px_0_#244a40]"
          aria-label="Hear the example word"
        >
          <Volume2 className="h-5 w-5" />
        </button>
      </section>
    </div>
  );
}
