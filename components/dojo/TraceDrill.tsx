"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Eraser } from "lucide-react";
import { useGameStore } from "@/lib/store/gameStore";
import { learnedKana, type Kana } from "@/lib/content/kana";
import { strokeData } from "@/lib/content/strokes";
import { scoreDrawing, type Point, type DrawScore } from "@/lib/handwriting";
import StrokeOrder from "@/components/teach/StrokeOrder";
import { useDrillSession } from "@/components/dojo/useDrillSession";
import SessionHud from "@/components/dojo/SessionHud";
import SessionSummary from "@/components/dojo/SessionSummary";

const SIZE = 240;

// Endless writing drill: a card shows a sound, you draw the kana, it's
// auto-graded against the reference strokes (green/red), then flows on.
export default function TraceDrill() {
  const completed = useGameStore((s) => s.completedLessons);
  const recordSeen = useGameStore((s) => s.recordSeen);
  // Only kana with reference strokes are traceable (voiced/combo kana reuse
  // base shapes and carry no stroke data of their own).
  const pool = useMemo(
    () => learnedKana(completed).filter((k) => strokeData[k.char]),
    [completed]
  );
  const session = useDrillSession("writing");

  const [target, setTarget] = useState<Kana | null>(null);
  const [checked, setChecked] = useState<DrawScore | null>(null);
  const [done, setDone] = useState(false);
  const [hasInk, setHasInk] = useState(false);

  // Seed the first card once the pool is available (survives store hydration,
  // where `completedLessons` is briefly empty on first render).
  useEffect(() => {
    if (!target && pool.length > 0) setTarget(pick(pool, null));
  }, [pool, target]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokes = useRef<Point[][]>([]);
  const drawing = useRef(false);

  // (Re)configure the canvas for crisp lines whenever a new card appears.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = SIZE * dpr;
    canvas.height = SIZE * dpr;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, SIZE, SIZE);
      ctx.lineWidth = 6;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#1f2530";
    }
  }, [target]);

  if (pool.length === 0) {
    return (
      <div className="card p-8 text-center">
        <p className="font-bold">Learn some kana first, then come back to trace.</p>
      </div>
    );
  }

  if (!target) return null; // seeding the first card after hydration

  if (done) {
    return (
      <SessionSummary
        session={session}
        onAgain={() => {
          session.reset();
          setDone(false);
          next();
        }}
      />
    );
  }

  function pos(e: React.PointerEvent) {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function start(e: React.PointerEvent) {
    if (checked) return;
    e.preventDefault();
    drawing.current = true;
    const p = pos(e);
    strokes.current.push([p]);
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    if (!hasInk) setHasInk(true);
  }
  function move(e: React.PointerEvent) {
    if (!drawing.current || checked) return;
    const p = pos(e);
    strokes.current[strokes.current.length - 1].push(p);
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }
  function end() {
    drawing.current = false;
  }

  function clear() {
    strokes.current = [];
    setHasInk(false);
    const ctx = canvasRef.current?.getContext("2d");
    ctx?.clearRect(0, 0, SIZE, SIZE);
  }

  function check() {
    if (!hasInk || checked) return;
    const result = scoreDrawing(strokes.current, target!.char, SIZE);
    setChecked(result);
    session.record(result.correct);
    recordSeen(`kana:${target!.char}`, result.correct);
    if (result.correct) {
      window.setTimeout(next, 1000);
    }
  }

  function next() {
    strokes.current = [];
    setHasInk(false);
    setChecked(null);
    setTarget((t) => pick(pool, t));
  }

  const resultColor =
    checked == null
      ? "border-gray-200"
      : checked.correct
      ? "border-brand"
      : "border-heart";

  return (
    <div>
      <SessionHud session={session} onQuit={() => setDone(true)} />

      <motion.div
        key={target.char + session.count}
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="card flex flex-col items-center gap-4 p-6"
      >
        <div className="text-center">
          <div className="text-sm font-bold uppercase tracking-wide text-muted">
            Draw the kana for
          </div>
          <div className="text-4xl font-extrabold text-ink">{target.romaji}</div>
        </div>

        <div
          className={`relative rounded-2xl border-2 ${resultColor}`}
          style={{ width: SIZE, height: SIZE }}
        >
          {checked ? (
            // Reveal the correct kana + stroke order after grading.
            <div className="absolute inset-0">
              <StrokeOrder char={target.char} size={SIZE} />
            </div>
          ) : (
            <canvas
              ref={canvasRef}
              onPointerDown={start}
              onPointerMove={move}
              onPointerUp={end}
              onPointerLeave={end}
              className="absolute inset-0 touch-none rounded-2xl"
              style={{ width: SIZE, height: SIZE }}
            />
          )}
        </div>

        {checked ? (
          <div className="flex flex-col items-center gap-2">
            <div
              className={`text-lg font-extrabold ${
                checked.correct ? "text-brand-dark" : "text-heart"
              }`}
            >
              {checked.correct ? "✓ Nice stroke!" : `✗ That's ${target.char} (${target.romaji})`}
            </div>
            {!checked.correct && (
              <button className="btn-brand" onClick={next}>
                Next →
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <button
              onClick={clear}
              className="flex items-center gap-1.5 text-sm font-bold text-muted hover:text-ink"
            >
              <Eraser className="h-4 w-4" /> Clear
            </button>
            <button disabled={!hasInk} onClick={check} className="btn-brand disabled:opacity-50">
              Check
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// Pick a random kana, avoiding an immediate repeat when possible.
function pick(pool: Kana[], prev: Kana | null): Kana | null {
  if (pool.length === 0) return null;
  if (pool.length === 1) return pool[0];
  let k = pool[Math.floor(Math.random() * pool.length)];
  if (prev) {
    let guard = 0;
    while (k.char === prev.char && guard++ < 5) {
      k = pool[Math.floor(Math.random() * pool.length)];
    }
  }
  return k;
}
