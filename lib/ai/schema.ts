// Shared contracts for the conversational tutor (Patch 1.4, extended by
// Patch 1.4.1 Phase C/D — Lang-tutor-1.4.1-plan.md). Two shapes: a mid-chat
// TURN (partner, no lecturing) and an end-of-session DEBRIEF (coach,
// why/when/redo). Both providers speak these shapes — see tutor.ts.

import { MOVE_IDS, type MoveId } from "@/lib/content/ja/scenarios";

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

/** One mismatch span — a move's form Grok flagged as wrong. */
export interface TutorSpan {
  avoid: string;
  prefer: string;
  issue: TutorIssue;
  holeLessonId: string;
}

/** Mid-chat partner turn. Lecture fields are forbidden here. */
export interface TutorTurn {
  spoken_ja: string;
  romaji: string;
  ask_next_ja: string;
  did_you_mean: string; // Japanese prefer-form, or ""
  issue: TutorIssue;
  avoid: string; // silent — stored, not shown mid-chat
  holeLessonId: string; // silent — must be in catalog or ""
  // Phase C/D additions. moves_filled/moves_open/suggestEnd are
  // SERVER-authored from lib/ai/moves.ts's matcher — Grok never sets these
  // and parseTutorTurn never reads them from Grok's raw JSON; tutor.ts
  // overwrites them unconditionally after parsing. spans/link are Grok's
  // own output (leftover mismatches / semantic scene-drift judgment),
  // parsed here and then only ever added to, never overridden, by the
  // server (see lib/ai/moves.ts's matchLinkKeyword doc comment).
  moves_filled: MoveId[];
  moves_open: MoveId[];
  spans: TutorSpan[]; // max 2
  link: { sceneId: string; gated: boolean } | "";
  suggestEnd: boolean;
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

export interface TutorCoverageEntry {
  move: MoveId;
  status: "used" | "partner_filled" | "missing" | "wrong_form";
}

export interface TutorDebriefAlt {
  say: string; // Japanese
  when: string; // English
  why: string; // English
}

/** End-of-session coach card. */
export interface TutorDebrief {
  went_well: string; // English, one or two sentences
  notes: TutorDebriefNote[]; // max 4, most useful first
  redo: TutorDebriefRedo[]; // max 3
  // Phase C/D additions — only meaningful for a scenario with a move map;
  // empty for one without (see tutor.ts's debriefMoveBlock gating).
  coverage: TutorCoverageEntry[];
  alts: TutorDebriefAlt[]; // max 3
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
const MAX_SPANS = 2;
const MAX_ALTS = 3;
const MAX_COVERAGE = 10; // defensive only — a real map has 5 moves today

const COVERAGE_STATUSES = ["used", "partner_filled", "missing", "wrong_form"] as const;

function cap(value: unknown, max = MAX_STR): string {
  return typeof value === "string" ? value.slice(0, max) : "";
}

function isIssue(value: unknown): value is TutorIssue {
  return typeof value === "string" && (TUTOR_ISSUES as readonly string[]).includes(value);
}

function isMoveId(value: unknown): value is MoveId {
  return typeof value === "string" && (MOVE_IDS as readonly string[]).includes(value);
}

function isCoverageStatus(value: unknown): value is TutorCoverageEntry["status"] {
  return typeof value === "string" && (COVERAGE_STATUSES as readonly string[]).includes(value);
}

function parseSpans(value: unknown, catalogIds: Set<string>): TutorSpan[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, MAX_SPANS).map((entry) => {
    const s = (entry ?? {}) as Record<string, unknown>;
    const holeLessonId = cap(s.holeLessonId, 64);
    return {
      avoid: cap(s.avoid),
      prefer: cap(s.prefer),
      issue: isIssue(s.issue) ? s.issue : "ok",
      holeLessonId: catalogIds.has(holeLessonId) ? holeLessonId : "",
    };
  });
}

// Best-effort parse of Grok's own link judgment. `gated` is always a
// placeholder here (true) — only tutor.ts knows completedLessons vs. the
// link's unlockAfter, so it always recomputes gated itself afterward (and
// may replace sceneId entirely via the keyword backstop). Empty
// `validLinkTargets` (scenario has no map this turn) means any link Grok
// emits anyway is dropped as noise — it was never told links existed.
function parseLink(value: unknown, validLinkTargets: Set<string>): TutorTurn["link"] {
  if (typeof value !== "object" || value === null) return "";
  const sceneId = cap((value as Record<string, unknown>).sceneId, 64);
  return sceneId && validLinkTargets.has(sceneId) ? { sceneId, gated: true } : "";
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
// moves_filled/moves_open/suggestEnd are NOT read from Grok's raw JSON at
// all (see TutorTurn's doc comment) — placeholder here, tutor.ts overwrites
// them from lib/ai/moves.ts's matcher unconditionally.
export function parseTutorTurn(
  text: string,
  catalogIds: Set<string>,
  validLinkTargets: Set<string> = new Set()
): TutorTurn | null {
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
    moves_filled: [],
    moves_open: [],
    spans: parseSpans(raw.spans, catalogIds),
    link: parseLink(raw.link, validLinkTargets),
    suggestEnd: false,
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

  const coverageIn = Array.isArray(raw.coverage) ? raw.coverage : [];
  const coverage: TutorCoverageEntry[] = coverageIn
    .slice(0, MAX_COVERAGE)
    .map((entry) => {
      const c = (entry ?? {}) as Record<string, unknown>;
      return { move: c.move, status: c.status };
    })
    .filter((c): c is TutorCoverageEntry => isMoveId(c.move) && isCoverageStatus(c.status));

  const altsIn = Array.isArray(raw.alts) ? raw.alts : [];
  const alts: TutorDebriefAlt[] = altsIn.slice(0, MAX_ALTS).map((entry) => {
    const a = (entry ?? {}) as Record<string, unknown>;
    return { say: cap(a.say), when: cap(a.when), why: cap(a.why) };
  });

  return {
    went_well: cap(raw.went_well, 400),
    notes,
    redo,
    coverage,
    alts,
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
    moves_filled: [],
    moves_open: [],
    spans: [],
    link: "",
    suggestEnd: false,
  };
}

export function emptyTutorDebrief(): TutorDebrief {
  return { went_well: "Session complete.", notes: [], redo: [], coverage: [], alts: [] };
}
