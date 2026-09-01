import type { ChatMessage } from "@/lib/types";

// Tutor practice scenarios, gated by progression like Dojo drills: each
// unlocks when the lesson that teaches its language is completed. Openers
// obey the content rule — only taught kana/vocab at their unlock point.
// `brief` is the server-side roleplay instruction folded into the tutor's
// system prompt (never shown to the learner).
export interface Scenario {
  id: string;
  label: string;
  starter: ChatMessage; // opening assistant line shown in the chat
  unlockAfter: string; // lessonId that must be completed
  brief: string;
}

export const scenarios: Scenario[] = [
  {
    id: "free",
    label: "Free chat",
    unlockAfter: "u2-greetings-core",
    starter: {
      role: "assistant",
      content: "こんにちは！(Hello!) Let's practice — say hello back!",
    },
    brief:
      "Casual free practice. Greet, react, and ask simple questions the learner can answer with taught words. No fixed script.",
  },
  {
    id: "meet",
    label: "Meeting someone new",
    unlockAfter: "u2-self-intro",
    starter: {
      role: "assistant",
      content: "こんにちは！(Hello!) — You've just met someone new. Greet them!",
    },
    // The Phase-3 milestone exchange, driven one step per turn.
    brief:
      "Roleplay meeting for the first time. Drive this exact four-step exchange, ONE step per turn, waiting for the learner between steps: (1) exchange greetings, (2) ask their name and give yours (you are ゆき), (3) say はじめまして / よろしく, (4) say goodbye. If the learner jumps ahead or stalls, gently bring them to the current step.",
  },
  {
    id: "food",
    label: "Talking about food",
    unlockAfter: "u4-food-objects",
    starter: {
      role: "assistant",
      content: "こんにちは！ごはん？さかな？りんご？(Hello! Rice? Fish? Apple?) — which do you like?",
    },
    brief:
      "You are sharing food with the learner. Offer taught foods (ごはん, さかな, りんご, やさい), ask simple preferences, and react (おいしい!). Keep it to one offer or question per turn.",
  },
  // The station/directions scenario returns with the Phase 5 directions unit
  // (planned as the graded speech capstone) — no scenario until its language exists.
];

export function getScenario(id: string): Scenario | undefined {
  return scenarios.find((s) => s.id === id);
}

export function isScenarioUnlocked(s: Scenario, completed: string[]): boolean {
  return completed.includes(s.unlockAfter);
}
