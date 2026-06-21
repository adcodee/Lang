"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Flame, Heart, Star, MessageCircle } from "lucide-react";
import { useGameStore } from "@/lib/store/gameStore";

export default function TopBar() {
  const xp = useGameStore((s) => s.xp);
  const streak = useGameStore((s) => s.streak);
  const hearts = useGameStore((s) => s.hearts);
  const maxHearts = useGameStore((s) => s.maxHearts);

  // Avoid hydration mismatch: store values come from localStorage on the client.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <header className="sticky top-0 z-20 border-b-2 border-gray-100 bg-white/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-2xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-extrabold text-brand-dark">
          <span className="text-2xl">🇯🇵</span>
          <span className="text-lg tracking-tight">Lang</span>
        </Link>

        <div className="flex items-center gap-4 text-sm font-bold">
          <Stat icon={<Star className="h-5 w-5 text-gold" fill="#ffc800" />} value={mounted ? xp : 0} label="XP" />
          <Stat icon={<Flame className="h-5 w-5 text-orange-500" fill="#f97316" />} value={mounted ? streak : 0} label="day streak" />
          <Stat
            icon={<Heart className="h-5 w-5 text-heart" fill="#ff4b4b" />}
            value={mounted ? `${hearts}/${maxHearts}` : `${maxHearts}/${maxHearts}`}
            label="hearts"
          />
          <Link
            href="/practice"
            className="flex items-center gap-1 rounded-full bg-sky px-3 py-1.5 text-white shadow-[0_2px_0_#1a8fc7]"
            title="AI conversation practice"
          >
            <MessageCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Practice</span>
          </Link>
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
