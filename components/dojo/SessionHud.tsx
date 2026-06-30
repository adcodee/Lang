"use client";

import { useRouter } from "next/navigation";
import { X, Flame } from "lucide-react";
import type { DrillSession } from "@/components/dojo/useDrillSession";

// Top bar for an endless drill: quit, current streak, and cleared count.
export default function SessionHud({
  session,
  onQuit,
}: {
  session: DrillSession;
  onQuit: () => void;
}) {
  const router = useRouter();
  return (
    <div className="mb-6 flex items-center justify-between">
      <button
        onClick={onQuit ?? (() => router.push("/dojo"))}
        aria-label="Quit drill"
        className="text-muted hover:text-ink"
      >
        <X />
      </button>
      <div className="flex items-center gap-1.5 font-extrabold text-ink">
        <Flame
          className={session.streak > 0 ? "h-5 w-5 text-orange-500" : "h-5 w-5 text-gray-300"}
          fill={session.streak > 0 ? "#f97316" : "#d1d5db"}
        />
        <span className="tabular-nums">{session.streak}</span>
      </div>
      <span className="text-sm font-bold text-muted tabular-nums">
        {session.correct}/{session.count}
      </span>
    </div>
  );
}
