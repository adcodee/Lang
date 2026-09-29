import type { BeltAward } from "@/lib/belts";
import { UNRANKED } from "@/lib/belts";

export function beltArtId(
  belt: Pick<BeltAward, "color" | "bars"> | typeof UNRANKED
): string {
  if (belt.color === "black") return "belt-black";
  if (belt.color === "brown") return "belt-brown-0";
  const bars = Math.min(Math.max(belt.bars, 0), 5);
  return `belt-white-${bars}`;
}

export function rankArtId(opts: {
  color: BeltAward["color"] | typeof UNRANKED["color"];
  bars: number;
  dan?: number;
}): string {
  if (opts.color === "black") return (opts.dan ?? 1) >= 2 ? "rank-legend" : "belt-black";
  if (opts.color === "brown") return "belt-brown-0";
  if (opts.bars <= 0) return "rank-rookie";
  return beltArtId(opts);
}

const MN_ART: Record<string, string> = {
  あ: "mn-a",
  い: "mn-i",
  う: "mn-u",
  え: "mn-e",
  お: "mn-o",
  か: "mn-ka",
  き: "mn-ki",
  く: "mn-ku",
  け: "mn-ke",
  こ: "mn-ko",
};

export function mnemonicArtId(char: string): string | undefined {
  return MN_ART[char];
}

export function displayArtId(display?: string): string | undefined {
  if (display === "❓") return "ex-unknown";
  if (display === "🌙") return "ex-evening";
  return undefined;
}
