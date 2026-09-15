import { Suspense } from "react";
import LessonFlow from "@/components/LessonFlow";
import { allLessons } from "@/lib/content/lookup";
import { IS_CAPACITOR_BUILD } from "@/lib/capacitorBuild";

export function generateStaticParams() {
  if (!IS_CAPACITOR_BUILD) return [];
  return allLessons().map((l) => ({ id: l.id }));
}

export default function LessonPage({ params }: { params: { id: string } }) {
  return (
    <Suspense>
      <LessonFlow id={params.id} />
    </Suspense>
  );
}
