import { NextRequest, NextResponse } from "next/server";
import { runTutorTurn } from "@/lib/ai/tutor";
import { sanitizeMessages, sanitizeCompletedLessons, sanitizeScenario } from "@/lib/ai/sanitize";

// Voice tutor turn endpoint — same TutorTurn contract as /api/chat (both
// channels go through Grok per Patch 1.4's locked routing). Receives the
// transcript of what the learner said plus the conversation so far.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const transcript: string =
      typeof body?.transcript === "string" ? body.transcript.slice(0, 400) : "";
    if (!transcript.trim()) {
      return NextResponse.json({ error: "transcript is required" }, { status: 400 });
    }
    const history = sanitizeMessages(body?.history);
    const messages = [...history, { role: "user" as const, content: transcript }];
    const completedLessons = sanitizeCompletedLessons(body?.completedLessons);
    const scenarioId = sanitizeScenario(body?.scenario);

    const { data, stubbed } = await runTutorTurn({
      channel: "voice",
      messages,
      completedLessons,
      scenarioId,
    });
    return NextResponse.json({ ...data, stubbed });
  } catch (err) {
    console.error("/api/voice error", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
