import { NextRequest, NextResponse } from "next/server";
import { runTutorDebrief } from "@/lib/ai/tutor";
import {
  sanitizeMessages,
  sanitizeCompletedLessons,
  sanitizeScenario,
  sanitizeHoles,
} from "@/lib/ai/sanitize";

// End-of-session coach endpoint (Claude, always — regardless of channel).
// Called once, when the learner taps "End practice". `holes` is the
// client's own silent per-turn mistake log, so the model isn't asked to
// remember what the UI already counted.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const messages = sanitizeMessages(body?.messages);
    if (messages.length === 0) {
      return NextResponse.json({ error: "messages array is required" }, { status: 400 });
    }
    const completedLessons = sanitizeCompletedLessons(body?.completedLessons);
    const scenarioId = sanitizeScenario(body?.scenario);
    const channel: "text" | "voice" = body?.channel === "voice" ? "voice" : "text";
    const holes = sanitizeHoles(body?.holes);

    const { data, stubbed } = await runTutorDebrief({
      channel,
      messages,
      completedLessons,
      scenarioId,
      holes,
    });
    return NextResponse.json({ ...data, stubbed });
  } catch (err) {
    console.error("/api/debrief error", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
