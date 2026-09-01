"use client";

import { strokeData } from "@/lib/content/ja/strokes";

// Lightweight, ML-free kana handwriting *verification*. The drill knows the
// target kana, so we don't recognise open input — we compare the learner's
// drawn strokes to that kana's reference strokes (from KanjiVG, sampled in the
// 0..109 viewBox), stroke-by-stroke and in order. This rewards correct stroke
// order/shape, which is exactly what a writing drill should train.

export interface Point {
  x: number;
  y: number;
}

const SAMPLES = 16; // points each stroke is resampled to before comparing
const VIEW = 109; // KanjiVG viewBox size

const refCache = new Map<string, Point[][]>();

// Reference strokes for a kana as resampled point polylines (0..109 space).
export function referenceStrokes(char: string): Point[][] {
  const cached = refCache.get(char);
  if (cached) return cached;
  if (typeof document === "undefined") return [];

  const paths = strokeData[char] ?? [];
  const svgNS = "http://www.w3.org/2000/svg";

  // The path must be attached to the document for getTotalLength/
  // getPointAtLength to be reliable — detached measuring throws/returns 0 on
  // WebKit (iOS). Use a hidden offscreen <svg>.
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", "0 0 109 109");
  svg.style.position = "absolute";
  svg.style.width = "0";
  svg.style.height = "0";
  svg.style.left = "-9999px";
  document.body.appendChild(svg);

  let strokes: Point[][] = [];
  try {
    strokes = paths.map((d) => {
      const el = document.createElementNS(svgNS, "path");
      el.setAttribute("d", d);
      svg.appendChild(el);
      const len = el.getTotalLength();
      const pts: Point[] = [];
      for (let i = 0; i < SAMPLES; i++) {
        const p = el.getPointAtLength((len * i) / (SAMPLES - 1));
        pts.push({ x: p.x, y: p.y });
      }
      return pts;
    });
  } finally {
    document.body.removeChild(svg);
  }

  refCache.set(char, strokes);
  return strokes;
}

// Resample an arbitrary polyline to a fixed number of evenly-spaced points.
function resample(points: Point[], n = SAMPLES): Point[] {
  if (points.length === 0) return [];
  if (points.length === 1) return Array(n).fill(points[0]);

  const dists: number[] = [0];
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += dist(points[i - 1], points[i]);
    dists.push(total);
  }
  if (total === 0) return Array(n).fill(points[0]);

  const out: Point[] = [];
  for (let i = 0; i < n; i++) {
    const target = (total * i) / (n - 1);
    let j = 1;
    while (j < dists.length && dists[j] < target) j++;
    const t0 = dists[j - 1];
    const t1 = dists[j] ?? t0;
    const span = t1 - t0 || 1;
    const f = (target - t0) / span;
    out.push({
      x: lerp(points[j - 1].x, points[j]?.x ?? points[j - 1].x, f),
      y: lerp(points[j - 1].y, points[j]?.y ?? points[j - 1].y, f),
    });
  }
  return out;
}

// Normalise drawn strokes from canvas pixels into the 0..109 reference space.
function normalize(strokes: Point[][], size: number): Point[][] {
  const s = VIEW / size;
  return strokes.map((st) => st.map((p) => ({ x: p.x * s, y: p.y * s })));
}

// Mean point-to-point distance between two resampled strokes.
function strokeDistance(a: Point[], b: Point[]): number {
  const ra = resample(a);
  const rb = resample(b);
  let sum = 0;
  for (let i = 0; i < SAMPLES; i++) sum += dist(ra[i], rb[i]);
  return sum / SAMPLES;
}

export interface DrawScore {
  correct: boolean;
  score: number; // 0..1, higher = closer
}

// Compare drawn strokes (canvas px) to the target kana's references.
// Forgiving by design — tune THRESHOLD on device.
export function scoreDrawing(
  drawn: Point[][],
  char: string,
  size: number
): DrawScore {
  const ref = referenceStrokes(char);
  if (ref.length === 0 || drawn.length === 0) {
    return { correct: false, score: 0 };
  }

  const norm = normalize(drawn, size);

  // Align by index up to the shorter count; penalise the stroke-count gap.
  const pairs = Math.min(ref.length, norm.length);
  let distSum = 0;
  for (let i = 0; i < pairs; i++) {
    distSum += strokeDistance(norm[i], ref[i]);
  }
  const avgDist = distSum / pairs; // in 0..109 units

  // Map average distance to a 0..1 closeness score. ~22 units avg ≈ 0.
  const proximity = Math.max(0, 1 - avgDist / 22);
  // Penalty for missing/extra strokes.
  const countPenalty = Math.abs(ref.length - norm.length) / ref.length;
  const score = Math.max(0, proximity - countPenalty * 0.5);

  return { correct: score >= 0.55, score };
}

function dist(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
