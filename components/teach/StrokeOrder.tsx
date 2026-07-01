"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import { strokeData, STROKE_VIEWBOX } from "@/lib/content/strokes";

// Animates a kana's strokes in order by drawing each path with a growing
// dash. Strokes data is KanjiVG (CC BY-SA 3.0). When `guideOnly`, it just
// renders the faint character with no animation/controls (used as a trace bg).
export default function StrokeOrder({
  char,
  size = 220,
  guideOnly = false,
}: {
  char: string;
  size?: number;
  guideOnly?: boolean;
}) {
  const strokes = useMemo(() => strokeData[char] ?? [], [char]);
  const pathRefs = useRef<(SVGPathElement | null)[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [animKey, setAnimKey] = useState(0);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  const play = useCallback(() => {
    if (guideOnly) return;
    clearTimers();
    const PER_STROKE = 700; // ms
    const GAP = 250;
    strokes.forEach((_, i) => {
      const el = pathRefs.current[i];
      if (!el) return;
      const len = el.getTotalLength();
      // Reset to hidden.
      el.style.transition = "none";
      el.style.strokeDasharray = `${len}`;
      el.style.strokeDashoffset = `${len}`;
      el.style.opacity = "1";
      // Schedule the draw.
      const t = setTimeout(() => {
        el.style.transition = `stroke-dashoffset ${PER_STROKE}ms ease`;
        el.style.strokeDashoffset = "0";
      }, i * (PER_STROKE + GAP));
      timers.current.push(t);
    });
  }, [strokes, guideOnly]);

  useEffect(() => {
    play();
    return clearTimers;
  }, [play, animKey]);

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="rounded-2xl border-2 border-gray-200 bg-white"
        style={{ width: size, height: size }}
      >
        <svg viewBox={STROKE_VIEWBOX} width={size} height={size}>
          {/* Faint full character as a guide. */}
          <g stroke="#e6e0d6" fill="none" strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round">
            {strokes.map((d, i) => (
              <path key={`g-${i}`} d={d} />
            ))}
          </g>
          {/* Animated strokes on top (hidden until drawn). */}
          {!guideOnly && (
            <g stroke="#1f2530" fill="none" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round">
              {strokes.map((d, i) => (
                <path
                  key={`s-${animKey}-${i}`}
                  ref={(el) => {
                    pathRefs.current[i] = el;
                  }}
                  d={d}
                  style={{ opacity: 0 }}
                />
              ))}
            </g>
          )}
        </svg>
      </div>
      {!guideOnly && (
        <button
          onClick={() => setAnimKey((k) => k + 1)}
          className="flex items-center gap-1.5 text-sm font-bold text-sky"
        >
          <RotateCcw className="h-4 w-4" /> Replay strokes
        </button>
      )}
    </div>
  );
}
