"use client";

import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { useEffect, useRef } from "react";

export default function FeedbackBanner({
  correct,
  note,
  answer,
  onContinue,
  onRetry,
  continueLabel = "Continue",
}: {
  correct: boolean;
  note?: string;
  answer?: string; // shown when the user got it wrong (final attempt only)
  onContinue: () => void;
  onRetry?: () => void; // when set, show "Try again" instead of continuing
  continueLabel?: string;
}) {
  // The banner is fixed to the bottom, so it sits ON TOP of the card behind
  // it. app/layout.tsx used to reserve a flat pb-24 (96px) — sized for
  // BottomNav (~58px), not for this. On a phone this banner stacks
  // vertically (sm:flex-row only kicks in at 640px) and runs ~140px bare,
  // ~185px with an answer line and a teaching note — so it covered the
  // bottom 45-90px of every exercise card after you answered.
  //
  // Publish the real measured height so the page can reserve exactly that
  // much. Re-measures on resize because the note/answer lines reflow.
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const publish = () =>
      document.documentElement.style.setProperty(
        "--feedback-h",
        `${el.getBoundingClientRect().height}px`
      );
    publish();
    const ro = new ResizeObserver(publish);
    ro.observe(el);
    return () => {
      ro.disconnect();
      document.documentElement.style.setProperty("--feedback-h", "0px");
    };
  }, []);

  return (
    <motion.div
      ref={ref}
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className={`fixed inset-x-0 bottom-0 z-30 border-t-2 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] ${
        correct ? "border-brand bg-[#eaf1e6]" : "border-heart bg-[#f6eaea]"
      }`}
    >
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white ${
              correct ? "bg-brand" : "bg-heart"
            }`}
          >
            {correct ? <Check strokeWidth={3} /> : <X strokeWidth={3} />}
          </div>
          <div>
            <div
              className={`font-extrabold ${
                correct ? "text-brand-dark" : "text-heart"
              }`}
            >
              {correct ? "Nice work!" : onRetry ? "Not quite — try again" : "Not quite"}
            </div>
            {!correct && !onRetry && answer && (
              <div className="text-sm text-ink">
                Answer: <span className="font-bold">{answer}</span>
              </div>
            )}
            {note && !onRetry && <div className="text-sm text-muted">{note}</div>}
          </div>
        </div>
        {onRetry ? (
          <button onClick={onRetry} className="btn-sky">
            Try again
          </button>
        ) : (
          <button
            onClick={onContinue}
            className={correct ? "btn-brand" : "btn-sky"}
          >
            {continueLabel}
          </button>
        )}
      </div>
    </motion.div>
  );
}
