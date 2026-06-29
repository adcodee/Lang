"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Check, Lock, Star } from "lucide-react";
import type { Lesson, SkillCategory } from "@/lib/types";

export type NodeStatus = "completed" | "current" | "locked";

const SKILL_BADGE: Record<SkillCategory, { icon: string; label: string }> = {
  speaking: { icon: "🗣️", label: "Speaking" },
  writing: { icon: "✍️", label: "Writing" },
  listening: { icon: "👂", label: "Listening" },
  punctuation: { icon: "。", label: "Punctuation" },
};

export default function LessonNode({
  lesson,
  status,
  offset,
}: {
  lesson: Lesson;
  status: NodeStatus;
  offset: number; // -1, 0, 1 — gives the path a gentle zig-zag
}) {
  const locked = status === "locked";

  const ring =
    status === "completed"
      ? "bg-gold shadow-[0_5px_0_#caa000]"
      : status === "current"
      ? "bg-brand shadow-[0_5px_0_#46a302]"
      : "bg-gray-200 shadow-[0_5px_0_#cfcfcf]";

  const inner = (
    <motion.div
      whileHover={locked ? undefined : { scale: 1.05 }}
      whileTap={locked ? undefined : { scale: 0.95 }}
      className={`flex h-20 w-20 items-center justify-center rounded-full text-3xl font-bold text-white ${ring} ${
        locked ? "cursor-not-allowed opacity-70" : "cursor-pointer"
      }`}
    >
      {status === "completed" ? (
        <Check className="h-8 w-8" strokeWidth={3} />
      ) : locked ? (
        <Lock className="h-7 w-7 text-gray-400" />
      ) : (
        <span>{lesson.icon}</span>
      )}
    </motion.div>
  );

  return (
    <div
      className="flex flex-col items-center gap-2"
      style={{ transform: `translateX(${offset * 64}px)` }}
    >
      {status === "current" && (
        <span className="rounded-full bg-white px-3 py-1 text-xs font-extrabold uppercase text-brand-dark shadow-card">
          Start
        </span>
      )}
      {locked ? (
        inner
      ) : (
        <Link href={`/lesson/${lesson.id}`} aria-label={lesson.title}>
          {inner}
        </Link>
      )}
      <div className="text-center">
        <div className="text-sm font-extrabold text-ink">{lesson.title}</div>
        <div className="mt-0.5 flex items-center justify-center gap-1 text-[11px] font-bold uppercase tracking-wide text-muted">
          <span>{SKILL_BADGE[lesson.skill].icon}</span>
          {SKILL_BADGE[lesson.skill].label}
        </div>
        <div className="flex items-center justify-center gap-1 text-xs text-muted">
          <Star className="h-3 w-3 text-gold" fill="#ffc800" /> {lesson.xp} XP
        </div>
      </div>
    </div>
  );
}
