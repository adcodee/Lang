"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Lock, Swords } from "lucide-react";
import type { Unit } from "@/lib/types";

export type ExamStatus = "passed" | "available" | "locked";

// The end-of-unit Dojo Examination node, shown after a unit's lessons.
export default function ExamNode({
  unit,
  status,
}: {
  unit: Unit;
  status: ExamStatus;
}) {
  const locked = status === "locked";

  const ring =
    status === "passed"
      ? "bg-torii shadow-[0_5px_0_#7a3a34]"
      : status === "available"
      ? "bg-sumi shadow-[0_5px_0_#0c0f15]"
      : "bg-gray-200 shadow-[0_5px_0_#d9d2c6]";

  const inner = (
    <motion.div
      whileHover={locked ? undefined : { scale: 1.05 }}
      whileTap={locked ? undefined : { scale: 0.95 }}
      className={`flex h-20 w-20 items-center justify-center rounded-2xl text-3xl font-bold text-white ${ring} ${
        locked ? "cursor-not-allowed opacity-70" : "cursor-pointer"
      }`}
    >
      {status === "passed" ? (
        <span>🥋</span>
      ) : locked ? (
        <Lock className="h-7 w-7 text-gray-400" />
      ) : (
        <span>⛩️</span>
      )}
    </motion.div>
  );

  return (
    <div className="flex flex-col items-center gap-2">
      {status === "available" && (
        <span className="rounded-full bg-torii px-3 py-1 text-xs font-extrabold uppercase text-white shadow-card">
          Exam
        </span>
      )}
      {locked ? (
        inner
      ) : (
        <Link href={`/exam/${unit.id}`} aria-label={`${unit.title} examination`}>
          {inner}
        </Link>
      )}
      <div className="text-center">
        <div className="flex items-center justify-center gap-1 text-sm font-extrabold text-ink">
          <Swords className="h-3.5 w-3.5 text-torii" /> Examination
        </div>
        <div className="text-xs text-muted">
          {status === "passed" ? "Belt earned" : "Earn your belt"}
        </div>
      </div>
    </div>
  );
}
