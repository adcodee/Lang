"use client";

import { useGameStore } from "@/lib/store/gameStore";

export default function CourseHero() {
  const active = useGameStore((s) => s.active);
  const lg = active === "lg";

  return (
    <div className="card mb-6 p-6 text-center">
      <h1 className="text-2xl font-extrabold text-ink">
        {lg ? "Oli otya! \u{1F1FA}\u{1F1EC}" : "\u3053\u3093\u306b\u3061\u306f! \u{1F44B}"}
      </h1>
      <p className="mt-1 text-muted">
        {lg
          ? "Unit 0 \u2014 train the ear. Long vs short changes the word."
          : "Learn Japanese one bite-sized lesson at a time. Tap the glowing node to start."}
      </p>
    </div>
  );
}
