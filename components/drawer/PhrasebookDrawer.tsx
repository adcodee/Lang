"use client";

import { useMemo, useState } from "react";
import { BookOpen, X, Volume2 } from "lucide-react";
import { useGameStore } from "@/lib/store/gameStore";
import { learnedGlossary, type GlossaryEntry } from "@/lib/content/ja/glossary";
import { speak } from "@/lib/speech";
import type { KanaTeachCard, PhraseTeachCard } from "@/lib/types";

// A learner's own phrasebook: everything already taught, searchable and
// re-readable outside the lesson that introduced it. Deliberately opt-in per
// screen (mount it where looking something up is fair — casual tutor chat —
// never in Dojo, Tests, checkpoints, or exams, where it would be a cheat
// sheet). Reads only uses[]/context off taught cards, so it can never show a
// fake one-line English gloss the P0–P2 content passes moved away from.
export default function PhrasebookDrawer() {
  const completed = useGameStore((s) => s.completedLessons);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const entries = useMemo(() => learnedGlossary(completed), [completed]);
  const filtered = useMemo(() => filterEntries(entries, query), [entries, query]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-brand text-white shadow-[0_2px_0_#3a5a34] sm:bottom-6"
        aria-label="Open phrasebook"
      >
        <BookOpen className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            className="absolute inset-0 bg-black/30"
            aria-label="Close phrasebook"
            onClick={() => setOpen(false)}
          />
          <div className="relative flex h-full w-full max-w-sm flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b-2 border-gray-100 p-4">
              <h2 className="text-lg font-extrabold text-ink">Phrasebook</h2>
              <button
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-gray-100"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="border-b-2 border-gray-100 p-3">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search what you've learned…"
                className="w-full rounded-full border-2 border-gray-200 px-4 py-2 text-sm text-ink outline-none focus:border-brand"
              />
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {entries.length === 0 ? (
                <p className="mt-8 text-center text-sm text-muted">
                  Nothing to show yet — this fills in from a lesson&apos;s
                  Learn step, so drill-only lessons don&apos;t add anything
                  here.
                </p>
              ) : filtered.length === 0 ? (
                <p className="mt-8 text-center text-sm text-muted">
                  No match for &ldquo;{query}&rdquo;.
                </p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {filtered.map((entry, i) => (
                    <GlossaryRow key={`${entry.lessonId}-${i}`} entry={entry} />
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function filterEntries(entries: GlossaryEntry[], query: string): GlossaryEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return entries;
  return entries.filter(({ card }) => {
    if (isKanaCard(card)) {
      return (
        card.char.toLowerCase().includes(q) ||
        card.romaji.toLowerCase().includes(q) ||
        card.example.meaning.toLowerCase().includes(q)
      );
    }
    return (
      card.term.toLowerCase().includes(q) ||
      card.reading.toLowerCase().includes(q) ||
      card.meaning.toLowerCase().includes(q)
    );
  });
}

function isKanaCard(card: KanaTeachCard | PhraseTeachCard): card is KanaTeachCard {
  return card.kind !== "phrase";
}

function GlossaryRow({ entry }: { entry: GlossaryEntry }) {
  const { card } = entry;
  return isKanaCard(card) ? (
    <KanaRow card={card} />
  ) : (
    <PhraseRow card={card} />
  );
}

function KanaRow({ card }: { card: KanaTeachCard }) {
  return (
    <li className="rounded-xl border-2 border-gray-100 p-3">
      <div className="flex items-center gap-3">
        <button
          onClick={() => speak(card.char)}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-washi font-jp text-2xl font-bold text-sumi"
          aria-label={`Hear ${card.char}`}
        >
          {card.char}
        </button>
        <div className="min-w-0">
          <div className="text-sm font-extrabold text-ink">{card.romaji}</div>
          <div className="truncate text-xs text-muted">
            {card.example.word} — {card.example.meaning}
          </div>
        </div>
      </div>
    </li>
  );
}

function PhraseRow({ card }: { card: PhraseTeachCard }) {
  return (
    <li className="rounded-xl border-2 border-gray-100 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-jp text-lg font-bold text-sumi">{card.term}</div>
          <div className="text-xs font-bold text-muted">{card.reading}</div>
        </div>
        <button
          onClick={() => speak(card.term)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky text-white"
          aria-label={`Hear ${card.term}`}
        >
          <Volume2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {card.uses && card.uses.length > 0 ? (
        <ul className="mt-2 flex flex-col gap-2">
          {card.uses.map((use) => (
            <li key={use.situation}>
              <p className="text-[11px] font-extrabold uppercase tracking-wide text-muted">
                {use.situation}
              </p>
              <p className="text-sm font-bold text-ink">{use.english}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm font-bold text-ink">{card.meaning}</p>
      )}

      {card.context && (
        <p className="mt-1.5 text-xs text-muted">{card.context}</p>
      )}
    </li>
  );
}
