import { dojoDrills } from "@/lib/content/ja/dojo";
import { IS_CAPACITOR_BUILD } from "@/lib/capacitorBuild";
import DrillPageClient from "./DrillPageClient";

// generateStaticParams can't live in a "use client" module (Next.js build
// error), hence the split from the previous single client page — see
// DrillPageClient.tsx for the actual logic, unchanged. See capacitorBuild.ts.
export function generateStaticParams() {
  if (!IS_CAPACITOR_BUILD) return [];
  return dojoDrills.map((d) => ({ id: d.id }));
}

export default function DrillPage({ params }: { params: { id: string } }) {
  return <DrillPageClient id={params.id} />;
}
