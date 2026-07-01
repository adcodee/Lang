"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Check, Lock, Star } from "lucide-react";
import type { Lesson, SkillCategory } from "@/lib/types";

export type NodeStatus = "completed" | "current" | "locked";
export type NodeVariant = "learn" | "test" | "single";

export const SKILL_BADGE: Record<SkillCategory, { icon: string; label: string }> = {
  speaking: { icon: "🗣️", label: "Speaking" },
  writing: { icon: "✍️", label: "Writing" },
  listening: { icon: "👂", label: "Listening" },
  punctuation: { icon: "。", label: "Punctuation" },
};

export default function LessonNode({
  lesson,
  status,
  offset,
  variant = "single",
}: {
  lesson: Lesson;
  status: NodeStatus;
  offset: number; // -1, 0, 1 — gives the path a gentle zig-zag
  variant?: NodeVariant;
}) {
  const locked = status === "locked";
  const href =
    variant === "single"
      ? `/lesson/${lesson.id}`
      : `/lesson/${lesson.id}?part=${variant}`;
  const nodeIcon =
    variant === "learn" ? "📖" : variant === "test" ? "📝" : lesson.icon;
  const partLabel =
    variant === "learn" ? "Learn" : variant === "test" ? "Test" : null;

  const ring =
    status === "completed"
      ? "bg-gold shadow-[0_5px_0_#a98b45]"
      : status === "current"
      ? "bg-brand shadow-[0_5px_0_#3a5a34]"
      : "bg-gray-200 shadow-[0_5px_0_#d9d2c6]";

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
        <span>{nodeIcon}</span>
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
        <Link href={href} aria-label={`${partLabel ?? ""} ${lesson.title}`.trim()}>
          {inner}
        </Link>
      )}
      <div className="text-center">
        <div className="flex items-center justify-center gap-1 text-sm font-extrabold text-ink">
          {partLabel && (
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide ${
                variant === "learn"
                  ? "bg-sky/15 text-sky"
                  : "bg-brand/15 text-brand-dark"
              }`}
            >
              {partLabel}
            </span>
          )}
          {lesson.title}
        </div>
        <div className="mt-0.5 flex items-center justify-center gap-1 text-[11px] font-bold uppercase tracking-wide text-muted">
          <span>{SKILL_BADGE[lesson.skill].icon}</span>
          {SKILL_BADGE[lesson.skill].label}
        </div>
        {variant !== "learn" && (
          <div className="flex items-center justify-center gap-1 text-xs text-muted">
            <Star className="h-3 w-3 text-gold" fill="#c9a962" /> {lesson.xp} XP
          </div>
        )}
      </div>
    </div>
  );
}
