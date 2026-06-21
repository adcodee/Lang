import type { Metadata } from "next";
import "./globals.css";
import TopBar from "@/components/TopBar";

export const metadata: Metadata = {
  title: "Lang — Learn Japanese",
  description:
    "A gamified, Duolingo-style way to learn Japanese with an AI conversation tutor.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <TopBar />
        <main className="mx-auto w-full max-w-2xl px-4 pb-24 pt-6">
          {children}
        </main>
      </body>
    </html>
  );
}
