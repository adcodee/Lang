"use client";

import { useGameStore } from "@/lib/store/gameStore";
import { LANGUAGES, type LanguageId } from "@/lib/languages";

const FLAG: Record<LanguageId, string> = { ja: "🇯🇵", lg: "🇺🇬" };

// Compact toggle, not a full "choose a course" screen — with only two
// courses (one of which has no content yet), a dedicated picker screen is
// premature. Revisit once Luganda Units 0-1 are actually playable (P3).
export default function LanguageSwitcher() {
  const active = useGameStore((s) => s.active);
  const switchLanguage = useGameStore((s) => s.switchLanguage);

  return (
    <div className="flex items-center gap-0.5 rounded-full border-2 border-gray-100 p-0.5">
      {(Object.keys(LANGUAGES) as LanguageId[]).map((id) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => switchLanguage(id)}
            aria-pressed={isActive}
            aria-label={`Switch to ${LANGUAGES[id].name}`}
            title={LANGUAGES[id].name}
            className={`flex h-7 w-7 items-center justify-center rounded-full text-base transition ${
              isActive ? "bg-brand-dark/10" : "opacity-40 hover:opacity-70"
            }`}
          >
            {FLAG[id]}
          </button>
        );
      })}
    </div>
  );
}
