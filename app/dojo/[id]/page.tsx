import LessonPlayer from "@/components/LessonPlayer";

export default function DrillPage({ params }: { params: { id: string } }) {
  return <LessonPlayer lessonId={params.id} mode="drill" />;
}
