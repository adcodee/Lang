import "server-only";
import { claudeConfigured } from "@/lib/ai/claude";
import { grokConfigured } from "@/lib/ai/grok";

export { getTextFeedback } from "@/lib/ai/claude";
export { voiceTurn } from "@/lib/ai/grok";

// Surfaced to the UI so we can show a "Demo mode" badge when a provider is stubbed.
export function providerStatus() {
  return {
    claude: claudeConfigured(),
    grok: grokConfigured(),
  };
}
