import ExamPlayer from "@/components/ExamPlayer";
import { unitsInOrder } from "@/lib/content/ja/curriculum";
import { IS_CAPACITOR_BUILD } from "@/lib/capacitorBuild";

// Only returns real params for the Capacitor static export, which requires
// every dynamic segment pre-rendered at build time — see capacitorBuild.ts
// for why this must stay a no-op ([]) for the normal server build. Only
// covers ja units until lg has real content of its own.
export function generateStaticParams() {
  if (!IS_CAPACITOR_BUILD) return [];
  return unitsInOrder().map((u) => ({ unitId: u.id }));
}

export default function ExamPage({ params }: { params: { unitId: string } }) {
  return <ExamPlayer unitId={params.unitId} />;
}
