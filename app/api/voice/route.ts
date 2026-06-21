import { NextRequest, NextResponse } from "next/server";
import { voiceTurn } from "@/lib/ai/grok";

// Voice tutor endpoint (Grok). Receives the transcript of what the learner said
// (produced by the browser's SpeechRecognition) and returns the assistant's
// spoken turn, which the browser speaks aloud via SpeechSynthesis.
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
    const turn = await voiceTurn(transcript);
    return NextResponse.json(turn);
  } catch (err) {
    console.error("/api/voice error", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
