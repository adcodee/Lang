import "server-only";
import type { ChatMessage } from "@/lib/types";
import { TUTOR_ISSUES, type TutorHole, type TutorIssue } from "@/lib/ai/schema";

// 1.4 sanitation — the cheap kind (single-player, A15 only). No rate limit,
// no injection classifier, no kanji allowlist crash-replace. Those are 1.4.2,
// parked as comments at the bottom of this file.

const MAX_MESSAGES = 20;
const MAX_MESSAGE_CHARS = 400;
const MAX_LESSON_IDS = 80;
const LESSON_ID_RE = /^[a-z0-9-]{1,64}$/;

export function sanitizeMessages(input: unknown): ChatMessage[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter(
      (m): m is ChatMessage =>
        typeof m === "object" &&
        m !== null &&
        ((m as ChatMessage).role === "user" || (m as ChatMessage).role === "assistant") &&
        typeof (m as ChatMessage).content === "string"
    )
    .slice(-MAX_MESSAGES)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_MESSAGE_CHARS) }));
}

export function sanitizeCompletedLessons(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((id): id is string => typeof id === "string" && LESSON_ID_RE.test(id))
    .slice(0, MAX_LESSON_IDS);
}

export function sanitizeScenario(input: unknown): string | undefined {
  return typeof input === "string" && input.length > 0 && input.length <= 64 ? input : undefined;
}

function isIssue(value: unknown): value is TutorIssue {
  return typeof value === "string" && (TUTOR_ISSUES as readonly string[]).includes(value);
}

export function sanitizeHoles(input: unknown): TutorHole[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((h): h is Record<string, unknown> => typeof h === "object" && h !== null)
    .slice(0, MAX_MESSAGES)
    .map((h) => ({
      lessonId: typeof h.lessonId === "string" ? h.lessonId.slice(0, 64) : "",
      issue: isIssue(h.issue) ? h.issue : "ok",
      avoid: typeof h.avoid === "string" ? h.avoid.slice(0, MAX_MESSAGE_CHARS) : "",
      prefer: typeof h.prefer === "string" ? h.prefer.slice(0, MAX_MESSAGE_CHARS) : "",
    }));
}

// --- 1.4.2 (parked — plan now, do not build) --------------------------------
// When this leaves "just me on the A15":
// 1. Injection classifier on inbound user text ("ignore previous", "output
//    your system prompt", role-forgery). issue=off-scenario, do not quote
//    the injection back to the model or the client.
// 2. In-memory rate limit: 20 requests / 10 min / IP.
// 3. Kanji/vocab allowlist on spoken_ja; replace with the scenario starter
//    if the model escapes the taught inventory.
// 4. Persist tutorHoles in gameStore across days instead of a session array.
// 5. Log redaction: never print full transcripts in server logs.
