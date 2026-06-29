"use client";

import { motion } from "framer-motion";
import { Check, X } from "lucide-react";

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
  return (
    <motion.div
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className={`fixed inset-x-0 bottom-0 z-30 border-t-2 ${
        correct ? "border-brand bg-brand/10" : "border-heart bg-heart/10"
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
