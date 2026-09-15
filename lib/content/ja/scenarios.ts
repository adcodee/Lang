import type { ChatMessage } from "@/lib/types";

// Tutor practice scenarios, gated by progression like Dojo drills: each
// unlocks when the lesson that teaches its language is completed. Openers
// obey the content rule — only taught kana/vocab at their unlock point.
// `brief` is the server-side roleplay instruction folded into the tutor's
// system prompt (never shown to the learner).

// --- Patch 1.4.1 move/form grading (Lang-tutor-1.4.1-plan.md, Phase A) -----
// Data model only: nothing reads `map`/`sceneLinks` yet. `brief` stays the
// live instruction Grok actually follows until Phase C wires the matcher
// (Phase B) into the prompt and can retire the numbered-script wording.

/** A move is a conversational job a turn can do, not a script step. */
export type MoveId = "greet" | "give_name" | "ask_name" | "close" | "repair";

// Runtime-checkable twin of MoveId — a union type alone can't be validated
// against untrusted JSON (Claude's debrief `coverage` entries) at runtime.
export const MOVE_IDS: readonly MoveId[] = ["greet", "give_name", "ask_name", "close", "repair"];

export interface MoveSpec {
  id: MoveId;
  // "said": the learner must produce it. "heard": either side producing it
  // counts. false: optional. Not a boolean — see the plan's Phase A note on
  // why a single required flag can't carry this distinction.
  required: "said" | "heard" | false;
  // Illegal to fill until this move is already in the session's filled set
  // (e.g. no よろしく before a name exists).
  precondition?: MoveId;
  // Session-level waiver: once any move listed here is filled, this move
  // drops out of the "still open" set for the rest of the scene (e.g. a
  // bundled はじめまして-Aduleです-おなまえは？ opener waives a bare greet).
  waivedIf?: MoveId[];
  forms: string[]; // taught only; "X" is a wildcard for a Latin name token
  alts?: string[]; // same meaning, also taught — still legal
}

/** Declares a scene the learner is heading toward — never played, only named. */
export interface SceneLink {
  trigger: string; // learner meaning, English, for Grok's semantic judgment
  keywords: string[]; // cheap server-side backstop (Phase B), not authoritative
  to: string; // scene id
  unlockAfter: string; // lessonId, or a patch id for scenes that don't exist yet
}

export interface Scenario {
  id: string;
  label: string;
  starter: ChatMessage; // opening assistant line shown in the chat
  unlockAfter: string; // lessonId that must be completed
  brief: string;
  map?: MoveSpec[]; // present once a scenario has moved off the old brief-only shape
}

// meet's map (Lang-tutor-1.4.1-plan.md, Phase A, "meet map (1.4.1)" table).
export const meetMoveMap: MoveSpec[] = [
  { id: "greet", required: "said", waivedIf: ["give_name"], forms: ["こんにちは", "はじめまして"] },
  { id: "give_name", required: "said", forms: ["わたしは X です", "X です"] },
  { id: "ask_name", required: false, forms: ["おなまえは？"] },
  { id: "close", required: "said", precondition: "give_name", forms: ["よろしく"] },
  { id: "repair", required: false, forms: ["すみません"] },
];

// Declared, never played — 1.4.1 scope is meet + free only. See the plan's
// "Links (declare only)" table for why each keyword list is a backstop,
// not the actual detector (that's Grok's semantic judgment, Phase C).
export const sceneLinks: SceneLink[] = [
  {
    trigger: "food / like / order",
    keywords: ["すき", "きらい", "ごはん", "たべ"],
    to: "food",
    unlockAfter: "u4-food-objects",
  },
  {
    trigger: "family",
    keywords: ["かぞく", "おかあ", "おとう"],
    to: "family",
    unlockAfter: "u4-family",
  },
  {
    trigger: "journey / hotel / several speakers / plans-after",
    keywords: ["りょこう", "ホテル", "いく"],
    to: "cast-outing",
    unlockAfter: "1.7",
  },
];

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
    // Still the live instruction Grok follows (Phase C hasn't wired the map
    // into the prompt yet). Kept as-is on purpose — see the file-header note.
    brief:
      "Roleplay meeting for the first time. Drive this exact three-step exchange, ONE step per turn, waiting for the learner between steps: (1) exchange greetings (こんにちは), (2) ask their name and give yours (you are ゆき), (3) the intro script in order — はじめまして, then name です, then よろしく. Do not treat はじめまして and よろしく as the same line: はじめまして is first-meeting only; よろしく is 'I look forward to this'. STOP after the intro. Do not ask for goodbye — that word has not been taught. If the learner jumps ahead or stalls, gently bring them to the current step.",
    map: meetMoveMap,
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
