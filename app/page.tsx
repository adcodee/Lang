import SkillTree from "@/components/SkillTree";

export default function HomePage() {
  return (
    <div>
      <div className="card mb-6 p-6 text-center">
        <h1 className="text-2xl font-extrabold text-ink">こんにちは! 👋</h1>
        <p className="mt-1 text-muted">
          Learn Japanese one bite-sized lesson at a time. Tap the glowing node to
          start.
        </p>
      </div>
      <SkillTree />
    </div>
  );
}
