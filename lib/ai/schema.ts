// Shared contracts for the conversational tutor (Patch 1.4). Two shapes:
// a mid-chat TURN (partner, no lecturing) and an end-of-session DEBRIEF
// (coach, why/when/redo). Both providers speak these shapes — see tutor.ts.

export const TUTOR_ISSUES = [
  "ok",
  "particle",
  "register",
  "word-choice",
  "word-order",
  "untaught",
  "off-scenario",
  "english-only",
  "unintelligible",
] as const;
export type TutorIssue = (typeof TUTOR_ISSUES)[number];

/** Mid-chat partner turn. Lecture fields are forbidden here. */
export interface TutorTurn {
  spoken_ja: string;
  romaji: string;
  ask_next_ja: string;
  did_you_mean: string; // Japanese prefer-form, or ""
  issue: TutorIssue;
  avoid: string; // silent — stored, not shown mid-chat
  holeLessonId: string; // silent — must be in catalog or ""
}

export interface TutorDebriefNote {
  avoid: string; // Japanese
  prefer: string; // Japanese
  why: string; // English
  when: string; // English
  issue: TutorIssue;
  holeLessonId: string;
}

export interface TutorDebriefRedo {
  lessonId: string;
  label: string;
  reason: string;
}

/** End-of-session coach card. */
export interface TutorDebrief {
  went_well: string; // English, one or two sentences
  notes: TutorDebriefNote[]; // max 4, most useful first
  redo: TutorDebriefRedo[]; // max 3
}

/** The client's silent per-turn mistake log, sent to /api/debrief on End. */
export interface TutorHole {
  lessonId: string;
  issue: TutorIssue;
  avoid: string;
  prefer: string;
}

const MAX_STR = 240;
const MAX_NOTES = 4;
const MAX_REDO = 3;

function cap(value: unknown, max = MAX_STR): string {
  return typeof value === "string" ? value.slice(0, max) : "";
}

function isIssue(value: unknown): value is TutorIssue {
  return typeof value === "string" && (TUTOR_ISSUES as readonly string[]).includes(value);
}

function extractJson(text: string): Record<string, unknown> | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

// First `{…}`, drop unknown keys, cap strings, issue must be in the enum,
// holeLessonId must be in this request's catalog (else silently dropped).
export function parseTutorTurn(text: string, catalogIds: Set<string>): TutorTurn | null {
  const raw = extractJson(text);
  if (!raw) return null;
  const holeLessonId = cap(raw.holeLessonId, 64);
  return {
    spoken_ja: cap(raw.spoken_ja),
    romaji: cap(raw.romaji),
    ask_next_ja: cap(raw.ask_next_ja),
    did_you_mean: cap(raw.did_you_mean),
    issue: isIssue(raw.issue) ? raw.issue : "ok",
    avoid: cap(raw.avoid),
    holeLessonId: catalogIds.has(holeLessonId) ? holeLessonId : "",
  };
}

export function parseTutorDebrief(text: string, catalogIds: Set<string>): TutorDebrief | null {
  const raw = extractJson(text);
  if (!raw) return null;
  const notesIn = Array.isArray(raw.notes) ? raw.notes : [];
  const redoIn = Array.isArray(raw.redo) ? raw.redo : [];

  const notes: TutorDebriefNote[] = notesIn.slice(0, MAX_NOTES).map((entry) => {
    const n = (entry ?? {}) as Record<string, unknown>;
    const holeLessonId = cap(n.holeLessonId, 64);
    return {
      avoid: cap(n.avoid),
      prefer: cap(n.prefer),
      why: cap(n.why),
      when: cap(n.when),
      issue: isIssue(n.issue) ? n.issue : "ok",
      holeLessonId: catalogIds.has(holeLessonId) ? holeLessonId : "",
    };
  });

  const redo: TutorDebriefRedo[] = redoIn
    .slice(0, MAX_REDO)
    .map((entry) => {
      const r = (entry ?? {}) as Record<string, unknown>;
      return {
        lessonId: cap(r.lessonId, 64),
        label: cap(r.label, 80),
        reason: cap(r.reason),
      };
    })
    .filter((r) => catalogIds.has(r.lessonId));

  return {
    went_well: cap(raw.went_well, 400),
    notes,
    redo,
  };
}

// Used only if a real API response comes back genuinely unparseable —
// transports carry their own richer offline demo stubs for the normal
// no-key case (see claude.ts / grok.ts).
export function emptyTutorTurn(): TutorTurn {
  return {
    spoken_ja: "すみません、もう一度お願いします。",
    romaji: "Sumimasen, mou ichido onegaishimasu.",
    ask_next_ja: "",
    did_you_mean: "",
    issue: "ok",
    avoid: "",
    holeLessonId: "",
  };
}

export function emptyTutorDebrief(): TutorDebrief {
  return { went_well: "Session complete.", notes: [], redo: [] };
}
