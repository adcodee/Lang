import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import LanguageGate from "@/components/LanguageGate";

const notoSansJp = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  variable: "--font-noto-jp",
});

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
    <html lang="en" className={notoSansJp.variable}>
      <body>
        <TopBar />
        <main className="mx-auto w-full max-w-2xl px-4 pb-24 pt-6">
          <LanguageGate>{children}</LanguageGate>
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
