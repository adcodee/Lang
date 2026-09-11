import { NextRequest, NextResponse } from "next/server";
import { runTutorTurn } from "@/lib/ai/tutor";
import { sanitizeMessages, sanitizeCompletedLessons, sanitizeScenario } from "@/lib/ai/sanitize";

// Text tutor turn endpoint (Grok, per Patch 1.4's locked routing). Accepts
// the conversation so far plus the learner's completed lessons (from which
// the allowed vocabulary is derived server-side) and returns a TutorTurn.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const messages = sanitizeMessages(body?.messages);
    if (messages.length === 0) {
      return NextResponse.json({ error: "messages array is required" }, { status: 400 });
    }
    const completedLessons = sanitizeCompletedLessons(body?.completedLessons);
    const scenarioId = sanitizeScenario(body?.scenario);

    const { data, stubbed } = await runTutorTurn({
      channel: "text",
      messages,
      completedLessons,
      scenarioId,
    });
    return NextResponse.json({ ...data, stubbed });
  } catch (err) {
    console.error("/api/chat error", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
