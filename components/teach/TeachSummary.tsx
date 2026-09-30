"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import JaArt from "@/components/ui/JaArt";
import { speak } from "@/lib/speech";
import type { TeachCard as TeachCardData } from "@/lib/types";

// The recap page that closes the Learn phase, before the recall warm-up.
//
// Why it exists: the teach phase showed each item on its own card and then
// moved on, so the learner met は, then が, then か one at a time and never saw
// them next to each other. For items whose whole difficulty is telling them
// APART — particles above all — that is the wrong shape: you cannot compare
// two things you are shown sequentially.
//
// Deliberately generic rather than a particle-specific screen. It lists
// whatever the lesson taught, so every lesson gets a recap for free, and for a
// lesson whose cards ARE the contrast it becomes the differentiation page by
// construction. A lesson can add `recap` to state the one thing to carry away.
export default function TeachSummary({
  lessonId,
  cards,
  recap,
  onContinue,
}: {
  lessonId: string;
  cards: TeachCardData[];
  recap?: string;
  onContinue: () => void;
}) {
  // Full-screen view of the recap panel. Baked-in labels are small at phone
  // width, so the panel is height-fitted and pans sideways rather than being
  // shrunk to fit — the text is the point of the image.
  const [zoomed, setZoomed] = useState(false);

  const rows = cards.map((c) =>
    c.kind === "phrase"
      ? {
          key: c.term,
          main: c.term,
          reading: c.reading,
          meaning: c.meaning,
          example: undefined as { word: string; romaji: string } | undefined,
          note: c.contextual,
        }
      : {
          key: c.char,
          main: c.char,
          reading: c.romaji,
          meaning: c.example?.meaning ?? "",
          // The example word was invisible here before: a kana row read
          // "あ / a / rain" with あめ nowhere on the page, which is the one
          // thing that makes the sound concrete.
          example: c.example
            ? { word: c.example.word, romaji: c.example.romaji }
            : undefined,
          note: undefined,
        }
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-5"
    >
      <div className="text-center">
        <p className="text-xs font-extrabold uppercase tracking-wide text-muted">
          What you just learned
        </p>
        <h2 className="mt-1 text-2xl font-extrabold text-ink">
          All of it, side by side
        </h2>
      </div>

      {/* Optional illustrated panel, looked up by convention rather than
          declared in content: drop /art/ja/recap-<lessonId>.png in and it
          appears. JaArt's onError means a lesson without one renders nothing,
          so the art set can fill in lesson by lesson with no code change. */}
      <JaArt
        id={`recap-${lessonId}`}
        alt={recap ?? "Illustration of what this lesson taught"}
        onClick={() => setZoomed(true)}
        className="w-full cursor-zoom-in rounded-xl border-2 border-gold/40"
        fallback={null}
      />

      {recap && (
        <div className="rounded-xl border-2 border-gold/50 bg-gold/10 px-4 py-3">
          <p className="text-sm text-ink">{recap}</p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {rows.map((r) => {
          // A glyph column only works for a glyph. `min-w` is a floor, not a
          // ceiling, and `shrink-0` forbids shrinking, so a whole sentence in
          // that column took its full intrinsic width and shoved the meaning
          // off the right of the screen — seen on device with
          // わたしは いえが おおきいです。 Anything longer than a short word
          // stacks instead: term on its own line, wrapping, meaning beneath.
          const stacked = r.main.length > 5;

          const body = (
            <div className={stacked ? "" : "min-w-0 flex-1"}>
              <div className="font-bold text-ink">{r.meaning}</div>
              {r.example && (
                <div className="mt-0.5 text-sm text-muted">
                  <span className="font-jp text-base text-sumi">{r.example.word}</span>{" "}
                  <span className="text-xs">{r.example.romaji}</span>
                </div>
              )}
              {r.note && <p className="mt-1 text-sm text-muted">{r.note}</p>}
            </div>
          );

          return (
            <button
              key={r.key}
              type="button"
              onClick={() => speak(r.main)}
              className={`card p-4 text-left active:translate-y-[1px] ${
                stacked ? "flex flex-col gap-2" : "flex items-start gap-4"
              }`}
            >
              <div
                className={
                  stacked ? "min-w-0" : "min-w-[3.5rem] shrink-0 text-center"
                }
              >
                <div
                  className={`font-jp font-bold text-sumi ${
                    stacked
                      ? "break-words text-xl leading-snug"
                      : "text-3xl"
                  }`}
                >
                  {r.main}
                </div>
                {r.reading && (
                  <div className="mt-0.5 break-words text-xs font-bold text-muted">
                    {r.reading}
                  </div>
                )}
              </div>
              {body}
            </button>
          );
        })}
      </div>

      <p className="text-center text-xs text-muted">Tap any line to hear it.</p>

      <button onClick={onContinue} className="btn-brand w-full">
        Got it
      </button>

      {zoomed && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center overflow-x-auto overflow-y-hidden bg-black/90"
          onClick={() => setZoomed(false)}
        >
          <JaArt
            id={`recap-${lessonId}`}
            alt={recap ?? "Illustration of what this lesson taught"}
            className="h-full w-auto max-w-none"
            fallback={null}
          />
          <button
            type="button"
            aria-label="Close"
            onClick={() => setZoomed(false)}
            className="fixed right-4 top-4 rounded-full bg-black/60 p-2 text-white"
          >
            <X />
          </button>
        </div>
      )}
    </motion.div>
  );
}
