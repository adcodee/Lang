"use client";

import { LANGUAGES, type LanguageId } from "@/lib/languages";

const TRANSITION_IMAGE: Record<LanguageId, string> = {
  ja: "/courses/ja-transition.jpg",
  lg: "/courses/lg-transition.jpg",
};

// Full-bleed themed splash shown briefly by LanguageGate whenever
// switchLanguage() fires — covers TopBar/BottomNav too (fixed, full
// viewport), not just the <main> content area.
export default function CourseTransition({ language }: { language: LanguageId }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
      <img
        src={TRANSITION_IMAGE[language]}
        alt={LANGUAGES[language].name}
        className="h-full w-full object-cover"
      />
    </div>
  );
}
