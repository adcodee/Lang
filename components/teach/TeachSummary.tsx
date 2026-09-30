"use client";

import { motion } from "framer-motion";
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
  cards,
  recap,
  onContinue,
}: {
  cards: TeachCardData[];
  recap?: string;
  onContinue: () => void;
}) {
  const rows = cards.map((c) =>
    c.kind === "phrase"
      ? { key: c.term, main: c.term, reading: c.reading, meaning: c.meaning, note: c.contextual }
      : { key: c.char, main: c.char, reading: c.romaji, meaning: c.example?.meaning ?? "", note: undefined }
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

      {recap && (
        <div className="rounded-xl border-2 border-gold/50 bg-gold/10 px-4 py-3">
          <p className="text-sm text-ink">{recap}</p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {rows.map((r) => (
          <button
            key={r.key}
            type="button"
            onClick={() => speak(r.main)}
            className="card flex items-start gap-4 p-4 text-left active:translate-y-[1px]"
          >
            <div className="min-w-[3.5rem] shrink-0 text-center">
              <div className="font-jp text-3xl font-bold text-sumi">{r.main}</div>
              {r.reading && (
                <div className="mt-0.5 text-xs font-bold text-muted">{r.reading}</div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-bold text-ink">{r.meaning}</div>
              {r.note && <p className="mt-1 text-sm text-muted">{r.note}</p>}
            </div>
          </button>
        ))}
      </div>

      <p className="text-center text-xs text-muted">Tap any line to hear it.</p>

      <button onClick={onContinue} className="btn-brand w-full">
        Got it
      </button>
    </motion.div>
  );
}
