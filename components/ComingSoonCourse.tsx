"use client";

import { useGameStore } from "@/lib/store/gameStore";
import { LANGUAGES, DEFAULT_LANGUAGE, type LanguageId } from "@/lib/languages";

// Shown by LanguageGate for any language whose content pack isn't built
// yet. Today that's only `lg` — see Lang-Luganda-Build-Plan.md, P3+.
export default function ComingSoonCourse({ language }: { language: LanguageId }) {
  const switchLanguage = useGameStore((s) => s.switchLanguage);
  const config = LANGUAGES[language];

  return (
    <div className="card mt-6 p-8 text-center">
      <div className="text-4xl">🚧</div>
      <h1 className="mt-3 text-xl font-extrabold text-ink">
        {config.nativeName} — coming soon
      </h1>
      <p className="mt-2 text-muted">
        The {config.name} course is still in planning — no lessons yet. Your
        progress in other courses is safe and untouched.
      </p>
      <button
        type="button"
        onClick={() => switchLanguage(DEFAULT_LANGUAGE)}
        className="mt-5 rounded-full bg-brand-dark px-5 py-2 text-sm font-bold text-white"
      >
        Back to {LANGUAGES[DEFAULT_LANGUAGE].name}
      </button>
    </div>
  );
}
