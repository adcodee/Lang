import SkillTree from "@/components/SkillTree";
import NextLessonFAB from "@/components/NextLessonFAB";
import CourseHero from "@/components/CourseHero";

export default function HomePage() {
  return (
    <div>
      <CourseHero />
      <SkillTree />
      <NextLessonFAB />
    </div>
  );
}
