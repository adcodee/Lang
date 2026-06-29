"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Sword, Trophy, MessageCircle } from "lucide-react";

const tabs = [
  { href: "/", label: "Lessons", icon: BookOpen },
  { href: "/dojo", label: "Dojo", icon: Sword },
  { href: "/rank", label: "Rank", icon: Trophy },
  { href: "/practice", label: "Talk", icon: MessageCircle },
] as const;

// Which tab "owns" a given path (so /lesson/* and /dojo/* highlight correctly).
function isActive(tabHref: string, pathname: string): boolean {
  if (tabHref === "/") return pathname === "/" || pathname.startsWith("/lesson");
  return pathname === tabHref || pathname.startsWith(`${tabHref}/`);
}

// Full-screen exercise flows hide the nav so the feedback banner isn't covered.
function isImmersive(pathname: string): boolean {
  if (pathname.startsWith("/lesson/")) return true;
  if (pathname.startsWith("/dojo/")) return true; // a specific drill / review
  return false;
}

export default function BottomNav() {
  const pathname = usePathname();

  if (isImmersive(pathname)) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t-2 border-gray-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-2xl items-stretch justify-around">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = isActive(href, pathname);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-bold transition ${
                active ? "text-brand-dark" : "text-muted hover:text-ink"
              }`}
            >
              <Icon
                className="h-6 w-6"
                strokeWidth={active ? 2.5 : 2}
                fill={active ? "currentColor" : "none"}
                fillOpacity={active ? 0.15 : 0}
              />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
