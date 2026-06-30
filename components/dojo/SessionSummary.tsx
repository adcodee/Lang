"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import type { DrillSession } from "@/components/dojo/useDrillSession";

// Shown when the learner quits an endless drill.
export default function SessionSummary({
  session,
  onAgain,
}: {
  session: DrillSession;
  onAgain: () => void;
}) {
  const router = useRouter();
  const accuracy =
    session.count > 0 ? Math.round((session.correct / session.count) * 100) : 0;

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="card p-8 text-center"
    >
      <div className="text-6xl">🥋</div>
      <h1 className="mt-4 text-2xl font-extrabold text-brand-dark">
        Training session
      </h1>
      <p className="mt-2 text-muted">
        Cleared <span className="font-bold text-ink">{session.correct}</span> of{" "}
        {session.count} ({accuracy}%) · best streak{" "}
        <span className="font-bold text-orange-500">🔥 {session.bestStreak}</span>
      </p>
      <div className="mt-6 flex flex-col gap-3">
        <button className="btn-brand" onClick={onAgain}>
          Go again
        </button>
        <button className="btn-ghost" onClick={() => router.push("/dojo")}>
          Back to Dojo
        </button>
      </div>
    </motion.div>
  );
}
