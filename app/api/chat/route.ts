import { NextRequest, NextResponse } from "next/server";
import { getTextFeedback } from "@/lib/ai/claude";
import { buildTutorContext } from "@/lib/ai/constraints";
import type { ChatMessage } from "@/lib/types";

// Text tutor endpoint (Claude). Accepts the conversation so far plus the
// learner's completed lessons (from which the allowed vocabulary is derived
// server-side) and returns the assistant reply plus any grammar correction.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const messages: ChatMessage[] = Array.isArray(body?.messages)
      ? body.messages
      : [];
    if (messages.length === 0) {
      return NextResponse.json(
        { error: "messages array is required" },
        { status: 400 }
      );
    }
    const completed: string[] = Array.isArray(body?.completedLessons)
      ? body.completedLessons.filter((id: unknown) => typeof id === "string")
      : [];
    const scenario: string | undefined =
      typeof body?.scenario === "string" ? body.scenario : undefined;

    const context = buildTutorContext(completed, scenario);
    const feedback = await getTextFeedback(messages, context);
    return NextResponse.json(feedback);
  } catch (err) {
    console.error("/api/chat error", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
