import "server-only";
import { claudeConfigured } from "@/lib/ai/claude";
import { grokConfigured } from "@/lib/ai/grok";

export { runTutorTurn, runTutorDebrief } from "@/lib/ai/tutor";

// Surfaced to the UI so we can show a "Demo mode" badge when a provider is stubbed.
export function providerStatus() {
  return {
    claude: claudeConfigured(),
    grok: grokConfigured(),
  };
}
