import LessonFlow from "@/components/LessonFlow";

export default function LessonPage({ params }: { params: { id: string } }) {
  return <LessonFlow id={params.id} />;
}
