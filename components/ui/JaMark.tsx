"use client";

import type { ReactNode } from "react";

// Set G inline marks, built from the ui-*.png templates in public/art/ja/.
// SVG so they stay crisp at 24–32px; the PNGs are 1024 cream boards, not
// drop-in icons. Palette: forest / gold / vermilion. Animate with `active`.

const FOREST = "#4A7043";
const GOLD = "#C9A962";
const TORII = "#B0524A";

export function HearMark({
  className = "h-5 w-5",
  active = false,
}: {
  className?: string;
  active?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={`${className} ja-mark ${active ? "is-active" : ""}`}
      aria-hidden
    >
      <circle cx="20" cy="16" r="3.2" fill={GOLD} />
      <path
        className="ja-hear-arc ja-hear-arc-a"
        d="M16 7.5c5.2 2.2 8.4 6.2 8.4 8.5s-3.2 6.3-8.4 8.5"
        fill="none"
        stroke={FOREST}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        className="ja-hear-arc ja-hear-arc-b"
        d="M13 10.2c3.8 1.8 6 4.6 6 5.8s-2.2 4-6 5.8"
        fill="none"
        stroke={FOREST}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function MicMark({
  className = "h-5 w-5",
  active = false,
}: {
  className?: string;
  active?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={`${className} ja-mark ja-mic ${active ? "is-active" : ""}`}
      aria-hidden
    >
      <rect x="11.2" y="4.2" width="9.6" height="14.4" rx="4.8" fill={FOREST} />
      <path
        d="M12.4 6.2h7.2c.3 0 .5.3.4.6-.8 2.2-2.4 3.6-4 3.6s-3.2-1.4-4-3.6c-.1-.3.1-.6.4-.6z"
        fill="#F8F5F0"
        opacity="0.25"
      />
      <circle cx="16" cy="4.4" r="1.5" fill={TORII} />
      <path
        d="M10.2 20.2c1.6 3.4 4.2 5.2 5.8 5.2s4.2-1.8 5.8-5.2"
        fill="none"
        stroke={GOLD}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <rect x="13.4" y="25.2" width="5.2" height="1.5" rx="0.6" fill={GOLD} />
      <rect x="12.2" y="27.2" width="7.6" height="1.8" rx="0.7" fill={GOLD} />
    </svg>
  );
}

export function StarKnownMark({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={`${className} ja-mark ja-star`} aria-hidden>
      <path
        d="M16 2.2 19.4 12.6 30 16 19.4 19.4 16 29.8 12.6 19.4 2 16 12.6 12.6Z"
        fill={GOLD}
      />
    </svg>
  );
}

export function StreakMark({
  className = "h-5 w-5",
  lit = false,
}: {
  className?: string;
  lit?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={`${className} ja-mark ja-streak ${lit ? "is-lit" : ""}`}
      aria-hidden
    >
      <path className="ja-streak-a" d="M8 24.5 18 24.5 22.5 29 10.5 29Z" fill={lit ? TORII : "#d1d5db"} />
      <path className="ja-streak-b" d="M10.2 16.2 18.4 16.2 21.6 20.6 11.8 20.6Z" fill={lit ? TORII : "#d1d5db"} />
      <path className="ja-streak-c" d="M12.4 8.4 18.2 8.4 20.4 12.4 13.6 12.4Z" fill={lit ? GOLD : "#d1d5db"} />
    </svg>
  );
}

export function PointMark({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={`${className} ja-mark ja-point`} aria-hidden>
      <path
        d="M6 11 L16 22 L26 11"
        fill="none"
        stroke={GOLD}
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CorrectionMark({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={`${className} ja-mark ja-correction`} aria-hidden>
      <path
        d="M6 26 L24 6"
        fill="none"
        stroke={FOREST}
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <path
        d="M14.5 20.5 L18 24.2 L26.5 14"
        fill="none"
        stroke={GOLD}
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ContextPill({ children }: { children: ReactNode }) {
  return (
    <div className="ja-context-pill">
      <span className="ja-context-bar" aria-hidden />
      <span className="ja-context-copy">{children}</span>
    </div>
  );
}
