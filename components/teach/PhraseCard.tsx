"use client";

import { useMemo, useState } from "react";
import { Volume2, Pencil } from "lucide-react";
import { speak, matchesSpoken } from "@/lib/speech";
import { useGameStore } from "@/lib/store/gameStore";
import { learnedKana } from "@/lib/content/ja/kana";
import { strokeData } from "@/lib/content/ja/strokes";
import SpeakInput from "@/components/SpeakInput";
import TraceCanvas from "@/components/teach/TraceCanvas";
import type { PhraseTeachCard, PhrasePart } from "@/lib/types";

// Interactive intro for a word/phrase: hear & say it, then break it down
// kana-by-kana (per-kana audio, "why does it sound like that" callouts, links
// to already-learned kana), a quick recall check, register/context, and an
// optional trace hook. Everything past the header is opt-in via the card data.
export default function PhraseCard({
  card,
  onSpeakAttempt,
  onTraced,
  onCheck,
}: {
  card: PhraseTeachCard;
  onSpeakAttempt: (correct: boolean) => void;
  onTraced: () => void;
  onCheck: (correct: boolean) => void;
}) {
  const completed = useGameStore((s) => s.completedLessons);
  const known = useMemo(
    () => new Set(learnedKana(completed).map((k) => k.char)),
    [completed]
  );

  const [heard, setHeard] = useState<null | boolean>(null);
  const [activePart, setActivePart] = useState<number | null>(null);
  const [answered, setAnswered] = useState<string | null>(null);
  const [showTrace, setShowTrace] = useState(false);

  // Shuffle the recall-check options so the answer isn't always in one slot.
  const checkOptions = useMemo(
    () => (card.check ? shuffle(card.check.options) : []),
    [card]
  );

  function gradeSpoken(text: string) {
    const ok = matchesSpoken(text, card.term, [card.reading]);
    setHeard(ok);
    onSpeakAttempt(ok);
  }

  function tapPart(i: number, part: PhrasePart) {
    setActivePart(i);
    speak(part.kana);
  }

  function answerCheck(opt: string) {
    if (answered) return;
    setAnswered(opt);
    onCheck(opt === card.check!.answer);
  }

  const canTrace = card.trace && strokeData[card.trace];

  return (
    <div className="teach-surface flex flex-col gap-6 rounded-2xl border-2 border-gray-100 p-6">
      {/* Header */}
      <section className="text-center">
        <div className="font-jp text-4xl font-bold text-sumi">{card.term}</div>
        <div className="mt-1 text-lg font-bold text-muted">{card.reading}</div>
        <div className="mt-2 text-xl font-extrabold text-ink">{card.meaning}</div>
      </section>

      {/* Listen & Say */}
      <section className="flex flex-col items-center gap-3">
        <button
          onClick={() => speak(card.term)}
          className="flex items-center gap-1.5 rounded-full bg-sky px-4 py-2 font-bold text-white shadow-[0_2px_0_#244a40]"
        >
          <Volume2 className="h-4 w-4" /> Hear it
        </button>
        <SpeakInput
          onTranscript={gradeSpoken}
          typedPlaceholder={`Type "${card.reading}"`}
          hint={card.term}
        />
        {heard !== null && (
          <p className={`text-sm font-bold ${heard ? "text-brand-dark" : "text-muted"}`}>
            {heard ? "Nice — that sounded right!" : "Give it another go."}
          </p>
        )}
      </section>

      {/* Break it down */}
      {card.parts && card.parts.length > 0 && (
        <section>
          <h3 className="mb-2 text-center text-sm font-extrabold uppercase tracking-wide text-muted">
            Break it down — tap each part
          </h3>
          <div className="flex flex-wrap justify-center gap-2">
            {card.parts.map((part, i) => (
              <button
                key={i}
                onClick={() => tapPart(i, part)}
                className={`relative rounded-xl border-2 px-3 py-2 text-center font-jp text-xl transition ${
                  activePart === i
                    ? "border-sky bg-sky/10 text-sky"
                    : "border-gray-200 bg-white text-sumi"
                }`}
              >
                {part.kana}
                {known.has(part.kana) && (
                  <span className="absolute -right-1 -top-2 text-xs">⭐️</span>
                )}
              </button>
            ))}
          </div>

          {activePart !== null && (
            <PartDetail part={card.parts[activePart]} term={card.term} known={known} />
          )}
        </section>
      )}

      {/* Active-recall check */}
      {card.check && (
        <section className="rounded-2xl bg-washi p-4">
          <p className="mb-2 text-center text-sm font-bold text-sumi">
            {card.check.prompt}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {checkOptions.map((opt) => {
              const isAns = opt === card.check!.answer;
              const picked = answered === opt;
              const cls = !answered
                ? "border-gray-200 bg-white text-sumi"
                : isAns
                ? "border-brand bg-brand/10 text-brand-dark"
                : picked
                ? "border-heart bg-heart/10 text-heart"
                : "border-gray-200 bg-white opacity-60";
              return (
                <button
                  key={opt}
                  disabled={!!answered}
                  onClick={() => answerCheck(opt)}
                  className={`rounded-xl border-2 px-3 py-2 font-jp text-lg ${cls}`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
          {answered && card.check.note && (
            <p className="mt-2 text-center text-xs text-muted">{card.check.note}</p>
          )}
        </section>
      )}

      {/* Situations, context, register */}
      {(card.uses?.length || card.context || card.polite) && (
        <section className="rounded-2xl border-2 border-gray-100 p-4 text-sm text-sumi">
          {card.uses && card.uses.length > 0 && (
            <ul className="flex flex-col gap-3">
              {card.uses.map((use) => (
                <li key={use.situation}>
                  <p className="text-xs font-extrabold uppercase tracking-wide text-muted">
                    {use.situation}
                  </p>
                  <p className="font-bold text-ink">{use.english}</p>
                  {use.example && (
                    <p className="mt-0.5 font-jp text-base text-sumi">{use.example}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
          {card.context && (
            <p className={card.uses?.length ? "mt-3" : undefined}>💬 {card.context}</p>
          )}
          {card.polite && (
            <div className="mt-2 flex items-center justify-between gap-2">
              <div>
                <span className="text-xs text-muted">More polite:</span>{" "}
                <span className="font-jp font-bold">{card.polite.term}</span>{" "}
                <span className="text-xs text-muted">({card.polite.reading})</span>
                {card.polite.note && (
                  <p className="mt-1 text-xs text-muted">{card.polite.note}</p>
                )}
              </div>
              <button
                onClick={() => speak(card.polite!.term)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky text-white"
                aria-label="Hear the polite form"
              >
                <Volume2 className="h-4 w-4" />
              </button>
            </div>
          )}
        </section>
      )}

      {/* Trace hook */}
      {canTrace && (
        <section className="flex flex-col items-center gap-3">
          {showTrace ? (
            <>
              <h3 className="text-sm font-extrabold uppercase tracking-wide text-muted">
                Trace {card.trace}
              </h3>
              <TraceCanvas
                char={card.trace!}
                onDrawnChange={(drawn) => drawn && onTraced()}
              />
            </>
          ) : (
            <button
              onClick={() => setShowTrace(true)}
              className="flex items-center gap-1.5 text-sm font-bold text-sky"
            >
              <Pencil className="h-4 w-4" /> Trace the tricky bit ({card.trace})
            </button>
          )}
        </section>
      )}
    </div>
  );
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function PartDetail({
  part,
  term,
  known,
}: {
  part: PhrasePart;
  term: string;
  known: Set<string>;
}) {
  return (
    <div className="mt-3 rounded-2xl bg-white p-3 text-center">
      <div className="font-jp text-2xl text-sumi">{part.kana}</div>
      <div className="text-sm font-bold text-ink">“{part.reading}”</div>
      {known.has(part.kana) && (
        <div className="text-xs text-brand-dark">
          ⭐️ You already know this from Unit 1
        </div>
      )}
      {part.note && <div className="mt-1 text-xs text-muted">{part.note}</div>}

      {/* Contextual pronunciation callout (letter sound vs how it's said here). */}
      {part.base && (
        <div className="mt-2 flex items-center justify-center gap-2">
          <button
            onClick={() => speak(part.kana)}
            className="rounded-full border-2 border-gray-200 px-3 py-1 text-xs font-bold text-muted"
          >
            🔊 Letter: {part.base}
          </button>
          <button
            onClick={() => speak(term)}
            className="rounded-full bg-brand px-3 py-1 text-xs font-bold text-white"
          >
            🔊 Here: {part.reading}
          </button>
        </div>
      )}
    </div>
  );
}
