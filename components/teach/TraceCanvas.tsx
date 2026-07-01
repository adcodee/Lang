"use client";

import { useEffect, useRef, useState } from "react";
import { Eraser } from "lucide-react";
import StrokeOrder from "@/components/teach/StrokeOrder";

// A simple finger/mouse tracing surface laid over a faint character guide.
// No grading — it's deliberate practice. Reports whether anything was drawn.
export default function TraceCanvas({
  char,
  size = 220,
  onDrawnChange,
}: {
  char: string;
  size?: number;
  onDrawnChange?: (drawn: boolean) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasInk, setHasInk] = useState(false);

  // Scale the bitmap for crisp lines on high-DPI screens.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.scale(dpr, dpr);
      ctx.lineWidth = 6;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#b0524a"; // torii vermilion ink
    }
  }, [size]);

  function pos(e: React.PointerEvent) {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function start(e: React.PointerEvent) {
    e.preventDefault();
    drawing.current = true;
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    if (!hasInk) {
      setHasInk(true);
      onDrawnChange?.(true);
    }
  }

  function move(e: React.PointerEvent) {
    if (!drawing.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = pos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function end() {
    drawing.current = false;
  }

  function clear() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasInk(false);
    onDrawnChange?.(false);
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <div className="absolute inset-0">
          <StrokeOrder char={char} size={size} guideOnly />
        </div>
        <canvas
          ref={canvasRef}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
          className="absolute inset-0 touch-none rounded-2xl"
          style={{ width: size, height: size }}
        />
      </div>
      <button
        onClick={clear}
        className="flex items-center gap-1.5 text-sm font-bold text-muted hover:text-ink"
      >
        <Eraser className="h-4 w-4" /> Clear
      </button>
    </div>
  );
}
