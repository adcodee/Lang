"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Flame, Star } from "lucide-react";
import { useGameStore } from "@/lib/store/gameStore";
import { primeSpeech } from "@/lib/speech";

export default function TopBar() {
  const xp = useGameStore((s) => s.xp);
  const streak = useGameStore((s) => s.streak);

  // Avoid hydration mismatch: store values come from localStorage on the client.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Warm up TTS on the first user gesture so "Hear it" isn't slow first time.
  useEffect(() => {
    const warm = () => primeSpeech();
    window.addEventListener("pointerdown", warm, { once: true });
    return () => window.removeEventListener("pointerdown", warm);
  }, []);

  return (
    <header className="sticky top-0 z-20 border-b-2 border-gray-100 bg-white/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-2xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-extrabold text-brand-dark">
          <span className="text-2xl">🇯🇵</span>
          <span className="text-lg tracking-tight">Lang</span>
        </Link>

        <div className="flex items-center gap-4 text-sm font-bold">
          <Stat icon={<Star className="h-5 w-5 text-gold" fill="#c9a962" />} value={mounted ? xp : 0} label="XP" />
          <Stat icon={<Flame className="h-5 w-5 text-orange-500" fill="#c2703a" />} value={mounted ? streak : 0} label="day streak" />
        </div>
      </div>
    </header>
  );
}

function Stat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1" title={label}>
      {icon}
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
