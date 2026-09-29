"use client";

import { usePathname } from "next/navigation";

// Murecho on reading surfaces (lessons, tests, exams, checkpoints, drills).
// Everything else — home tree, titles, chrome — stays Kaisei Decol on body.
export default function FontScope({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const reading =
    path.startsWith("/lesson") ||
    path.startsWith("/exam") ||
    (path.startsWith("/dojo/") && path !== "/dojo");
  return <div className={reading ? "font-read" : undefined}>{children}</div>;
}
