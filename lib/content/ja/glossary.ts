import type { TeachCard } from "@/lib/types";
import { allLessons } from "@/lib/content/ja/curriculum";

export interface GlossaryEntry {
  lessonId: string;
  lessonTitle: string;
  card: TeachCard;
}

// Every teach card from a lesson the learner has actually completed — the
// drawer's whole data source. Same one-line guarantee lessonCatalog() (see
// lib/ai/lessonTags.ts) already uses for the tutor: nothing can surface here
// for a lesson that hasn't been finished, by construction, not by a
// per-screen check a future drawer mount could forget.
export function learnedGlossary(completedLessons: string[]): GlossaryEntry[] {
  const completed = new Set(completedLessons);
  return allLessons()
    .filter((l) => completed.has(l.id) && l.teach && l.teach.length > 0)
    .flatMap((l) =>
      l.teach!.map((card) => ({ lessonId: l.id, lessonTitle: l.title, card }))
    );
}
