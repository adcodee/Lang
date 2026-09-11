import { allLessons } from "@/lib/content/ja/curriculum";

export interface LessonTag {
  id: string;
  label: string;
}

// The lesson catalog the tutor is allowed to cite by id — restricted to
// lessons the learner has actually completed, so a hallucinated or
// not-yet-taught id can never surface as a "did you mean" hole or a
// "redo this" link.
export function lessonCatalog(completedLessons: string[]): LessonTag[] {
  const completed = new Set(completedLessons);
  return allLessons()
    .filter((l) => completed.has(l.id))
    .map((l) => ({ id: l.id, label: l.title }));
}

export function catalogBlock(catalog: LessonTag[]): string {
  if (catalog.length === 0) return "LESSON CATALOG: (none completed yet)";
  return `LESSON CATALOG (only cite ids from this list — never invent one):\n${catalog
    .map((l) => `- ${l.id}: ${l.label}`)
    .join("\n")}`;
}
