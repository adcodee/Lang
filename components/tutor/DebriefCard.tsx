"use client";

import { CheckCircle2, RotateCcw } from "lucide-react";
import type { TutorDebrief } from "@/lib/ai/schema";

// The end-of-session coach card (Patch 1.4). Renders once, after the
// learner taps "End practice" — this is the only place the tutor is
// allowed to explain why/when, as opposed to the quiet mid-chat
// "Did you mean" line.
export default function DebriefCard({
  debrief,
  onPracticeAgain,
}: {
  debrief: TutorDebrief;
  onPracticeAgain: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
      <div className="flex items-start gap-2 rounded-2xl border-2 border-gray-100 bg-white px-4 py-3">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
        <p className="text-sm text-ink">{debrief.went_well}</p>
      </div>

      {debrief.notes.map((n, i) => (
        <div key={i} className="rounded-2xl border-2 border-gray-100 bg-white px-4 py-3">
          <div className="flex items-start gap-1.5 text-sm">
            <span aria-hidden>✏️</span>
            <div>
              <div>
                <span className="text-muted line-through">{n.avoid}</span>
                {" → "}
                <span className="font-bold text-ink">{n.prefer}</span>
              </div>
              {n.why && <p className="mt-1 text-xs text-muted">{n.why}</p>}
              {n.when && <p className="mt-0.5 text-xs text-muted">{n.when}</p>}
            </div>
          </div>
        </div>
      ))}

      {debrief.redo.length > 0 && (
        <div className="rounded-2xl bg-gray-50 px-4 py-3">
          <div className="mb-1 text-xs font-bold uppercase tracking-wide text-muted">
            Worth redoing
          </div>
          <ul className="space-y-1 text-sm">
            {debrief.redo.map((r) => (
              <li key={r.lessonId}>
                <a href={`/lesson/${r.lessonId}`} className="font-bold text-sky underline">
                  {r.label}
                </a>{" "}
                <span className="text-muted">— {r.reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        onClick={onPracticeAgain}
        className="mt-auto flex items-center justify-center gap-1.5 rounded-2xl bg-brand px-4 py-2 font-bold text-white shadow-[0_3px_0_#3a5a34]"
      >
        <RotateCcw className="h-4 w-4" /> Practise again
      </button>
    </div>
  );
}
