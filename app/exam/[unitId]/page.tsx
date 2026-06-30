import ExamPlayer from "@/components/ExamPlayer";

export default function ExamPage({ params }: { params: { unitId: string } }) {
  return <ExamPlayer unitId={params.unitId} />;
}
