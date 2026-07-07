import { NextRequest, NextResponse } from "next/server";
import { voiceTurn, type VoiceHistoryLine } from "@/lib/ai/grok";
import { buildTutorContext } from "@/lib/ai/constraints";

// Voice tutor endpoint (Grok). Receives the transcript of what the learner
// said, the conversation so far, and the learner's completed lessons (from
// which the allowed vocabulary is derived server-side); returns the
// assistant's spoken turn, which the browser speaks via SpeechSynthesis.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const transcript: string =
      typeof body?.transcript === "string" ? body.transcript : "";
    if (!transcript.trim()) {
      return NextResponse.json(
        { error: "transcript is required" },
        { status: 400 }
      );
    }
    const history: VoiceHistoryLine[] = Array.isArray(body?.history)
      ? body.history.filter(
          (l: unknown): l is VoiceHistoryLine =>
            typeof l === "object" &&
            l !== null &&
            ((l as VoiceHistoryLine).role === "user" ||
              (l as VoiceHistoryLine).role === "assistant") &&
            typeof (l as VoiceHistoryLine).content === "string"
        )
      : [];
    const completed: string[] = Array.isArray(body?.completedLessons)
      ? body.completedLessons.filter((id: unknown) => typeof id === "string")
      : [];
    const scenario: string | undefined =
      typeof body?.scenario === "string" ? body.scenario : undefined;

    const context = buildTutorContext(completed, scenario);
    const turn = await voiceTurn(transcript, history, context);
    return NextResponse.json(turn);
  } catch (err) {
    console.error("/api/voice error", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
