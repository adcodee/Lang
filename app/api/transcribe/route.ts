import { NextRequest, NextResponse } from "next/server";
import { transcribeAudio } from "@/lib/ai/transcribe";

// Transcription endpoint for the "Say it" speaking practice. Receives a
// recorded audio clip (multipart FormData, field "audio") and returns the
// recognized text. With no STT key configured it returns `stubbed: true`, and
// the client falls back to typed-romaji entry.
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("audio");
    if (!(file instanceof Blob) || file.size === 0) {
      return NextResponse.json(
        { error: "audio is required" },
        { status: 400 }
      );
    }
    const language =
      typeof form.get("language") === "string"
        ? (form.get("language") as string)
        : "ja";

    const result = await transcribeAudio(file, language);
    return NextResponse.json(result);
  } catch (err) {
    console.error("/api/transcribe error", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
