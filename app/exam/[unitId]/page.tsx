import ExamPlayer from "@/components/ExamPlayer";
import { unitsInOrder } from "@/lib/content/lookup";
import { IS_CAPACITOR_BUILD } from "@/lib/capacitorBuild";

export function generateStaticParams() {
  if (!IS_CAPACITOR_BUILD) return [];
  return [...unitsInOrder("ja"), ...unitsInOrder("lg")].map((u) => ({ unitId: u.id }));
}

export default function ExamPage({ params }: { params: { unitId: string } }) {
  return <ExamPlayer unitId={params.unitId} />;
}
