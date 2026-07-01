"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { useGameStore } from "@/lib/store/gameStore";
import TeachCard from "@/components/teach/TeachCard";
import PhraseCard from "@/components/teach/PhraseCard";
import type { TeachCard as TeachCardData } from "@/lib/types";

const TRACE_XP = 2; // small writing credit per character traced
const TEACH_BONUS = 5; // flat bonus for finishing the intro

// Walks the learner through each item's intro (kana or word/phrase), then hands
// off via onReady(). Feeds Rank honestly: real speaking attempts + flat/writing
// XP (no fake accuracy).
export default function TeachPhase({
  cards,
  onReady,
}: {
  cards: TeachCardData[];
  onReady: () => void;
}) {
  const router = useRouter();
  const recordAnswer = useGameStore((s) => s.recordAnswer);
  const addXp = useGameStore((s) => s.addXp);

  const [index, setIndex] = useState(0);
  const tracedCredited = useRef<Set<number>>(new Set());
  const card = cards[index];
  const isLast = index === cards.length - 1;

  function handleTraced() {
    if (tracedCredited.current.has(index)) return;
    tracedCredited.current.add(index);
    addXp(TRACE_XP);
  }

  function handleSpeakAttempt(correct: boolean) {
    recordAnswer("speaking", correct, correct ? 2 : 0);
  }

  function next() {
    if (isLast) {
      addXp(TEACH_BONUS);
      onReady();
    } else {
      setIndex((i) => i + 1);
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={() => router.push("/")}
          aria-label="Quit"
          className="text-muted hover:text-ink"
        >
          <X />
        </button>
        {/* progress dots */}
        <div className="flex flex-1 items-center justify-center gap-1.5">
          {cards.map((_, i) => (
            <span
              key={i}
              className={`h-2 rounded-full transition-all ${
                i === index ? "w-6 bg-brand" : "w-2 bg-gray-200"
              }`}
            />
          ))}
        </div>
        <button
          onClick={onReady}
          className="text-sm font-bold text-muted hover:text-ink"
        >
          Skip
        </button>
      </div>

      {card.kind === "phrase" ? (
        <PhraseCard
          key={`p-${index}`}
          card={card}
          onSpeakAttempt={handleSpeakAttempt}
        />
      ) : (
        <TeachCard
          key={card.char}
          card={card}
          onSpeakAttempt={handleSpeakAttempt}
          onTraced={handleTraced}
        />
      )}

      <button onClick={next} className="btn-brand mt-6 w-full">
        {isLast ? "Ready to practice?" : "Next"}
      </button>
    </div>
  );
}
