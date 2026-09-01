import { Suspense } from "react";
import LessonFlow from "@/components/LessonFlow";
import { allLessons } from "@/lib/content/ja/curriculum";
import { IS_CAPACITOR_BUILD } from "@/lib/capacitorBuild";

// See app/exam/[unitId]/page.tsx and capacitorBuild.ts.
export function generateStaticParams() {
  if (!IS_CAPACITOR_BUILD) return [];
  return allLessons().map((l) => ({ id: l.id }));
}

export default function LessonPage({ params }: { params: { id: string } }) {
  // LessonFlow calls useSearchParams(), which requires a Suspense boundary
  // to be statically prerenderable at all (Next.js bails out with a build
  // error otherwise) — latent until generateStaticParams above started
  // actually prerendering this route for the Capacitor build. No fallback
  // content needed: the boundary only matters at build/first-load time,
  // this page has always been effectively instant client-side.
  return (
    <Suspense>
      <LessonFlow id={params.id} />
    </Suspense>
  );
}
