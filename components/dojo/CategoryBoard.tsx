"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";

export interface BoardItem {
  label: string;
  sub?: string;
  category: string;
  srs?: string; // spaced-repetition item id, e.g. `kana:さ`
}

// A single "fill the boxes" round: tap an item, tap a category to park it.
// On Check it colours each placement and reports per-item correctness.
export default function CategoryBoard({
  items,
  categories,
  onResult,
}: {
  items: BoardItem[];
  categories: string[];
  onResult: (results: boolean[]) => void;
}) {
  const ordered = useMemo(() => items, [items]);
  const [placement, setPlacement] = useState<Record<string, string | undefined>>(
    {}
  );
  const [selected, setSelected] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  const unplaced = ordered.filter((it) => !placement[it.label]);
  const allPlaced = unplaced.length === 0;

  function placeInto(category: string) {
    if (checked || !selected) return;
    setPlacement((p) => ({ ...p, [selected]: category }));
    setSelected(null);
  }
  function returnToTray(label: string) {
    if (checked) return;
    setPlacement((p) => ({ ...p, [label]: undefined }));
  }

  function check() {
    if (!allPlaced || checked) return;
    setChecked(true);
    onResult(ordered.map((it) => placement[it.label] === it.category));
  }

  function tileClass(it: BoardItem, inBucket: boolean): string {
    const base =
      "rounded-xl border-2 px-3 py-2 text-center font-semibold shadow-[0_2px_0_#e6e0d6]";
    if (!checked)
      return `${base} ${
        selected === it.label && !inBucket
          ? "border-sky bg-sky/10"
          : "border-gray-200 bg-white"
      }`;
    if (!inBucket) return `${base} border-gray-200 bg-white`;
    return placement[it.label] === it.category
      ? `${base} border-brand bg-brand/10 text-brand-dark`
      : `${base} border-heart bg-heart/10 text-heart`;
  }

  return (
    <div className="card p-5">
      <h2 className="mb-4 text-center text-lg font-extrabold text-ink">
        Sort each into its group
      </h2>

      {/* Tray */}
      <div className="mb-5 flex min-h-[3.5rem] flex-wrap items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-200 p-3">
        {unplaced.length === 0 ? (
          <span className="text-sm text-muted">All placed — tap Check</span>
        ) : (
          unplaced.map((it) => (
            <button
              key={it.label}
              disabled={checked}
              onClick={() => setSelected(it.label)}
              className={tileClass(it, false)}
            >
              <div>{it.label}</div>
              {it.sub && (
                <div className="text-xs font-normal text-muted">{it.sub}</div>
              )}
            </button>
          ))
        )}
      </div>

      {/* Buckets */}
      <div className="grid grid-cols-2 gap-3">
        {categories.map((cat) => {
          const parked = ordered.filter((it) => placement[it.label] === cat);
          return (
            <button
              key={cat}
              type="button"
              disabled={checked || !selected}
              onClick={() => placeInto(cat)}
              className={`flex min-h-[5rem] flex-col gap-2 rounded-2xl border-2 p-3 text-left transition ${
                selected && !checked
                  ? "border-sky bg-sky/5"
                  : "border-gray-200 bg-gray-50"
              }`}
            >
              <span className="text-xs font-extrabold uppercase tracking-wide text-muted">
                {cat}
              </span>
              <div className="flex flex-wrap gap-2">
                {parked.map((it) => (
                  <motion.span
                    key={it.label}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      returnToTray(it.label);
                    }}
                    className={tileClass(it, true)}
                  >
                    {it.label}
                  </motion.span>
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {!checked && (
        <button
          disabled={!allPlaced}
          onClick={check}
          className="btn-brand mt-5 w-full"
        >
          Check
        </button>
      )}
    </div>
  );
}
