import { NextRequest, NextResponse } from "next/server";
import {
  transcribeAudio,
  sanitizePrompt,
  audioTypeAllowed,
  MAX_AUDIO_BYTES,
} from "@/lib/ai/transcribe";
import { guardRequest } from "@/lib/ai/guard";

// Transcription endpoint for the "Say it" speaking practice. Receives a
// recorded audio clip (multipart FormData, field "audio") and returns the
// recognized text. With no STT key configured it returns `stubbed: true`, and
// the client falls back to typed-romaji entry.
export async function POST(req: NextRequest) {
  // Auth + rate limit before anything else, including before the body is
  // read: this route was the worst of the four open ones — a stranger could
  // use it as a free transcription service — and reading a multipart upload
  // from an unauthenticated caller is work we should never do.
  // Pass-through when LANG_APP_SECRET is unset — see lib/ai/guard.ts.
  const blocked = guardRequest(req);
  if (blocked) return blocked;

  try {
    const form = await req.formData();
    const file = form.get("audio");
    if (!(file instanceof Blob) || file.size === 0) {
      return NextResponse.json(
        { error: "audio is required" },
        { status: 400 }
      );
    }
    // Size first, because it is the only check that bounds what this costs.
    if (file.size > MAX_AUDIO_BYTES) {
      return NextResponse.json(
        {
          error: `audio too large (max ${Math.round(MAX_AUDIO_BYTES / 1024 / 1024)}MB)`,
        },
        { status: 413 }
      );
    }
    // Then the container type. See audioTypeAllowed() for why empty and
    // application/octet-stream have to stay allowed — our own recorder produces
    // them, so tightening this would break the real clients on the browsers the
    // cloud transcription tier exists to serve.
    if (!audioTypeAllowed(file.type)) {
      return NextResponse.json(
        { error: "unsupported audio type" },
        { status: 415 }
      );
    }

    // The `language` form field both clients send is no longer read and is not
    // echoed back: transcribeAudio() pins Japanese. Honouring a caller-supplied
    // language is what made this endpoint usable as a free general transcription
    // service for anyone who found the public URL.
    const prompt = sanitizePrompt(form.get("prompt"));

    const result = await transcribeAudio(file, prompt);
    return NextResponse.json(result);
  } catch (err) {
    // Message only — a thrown fetch/undici error can carry a `cause` chain
    // referencing the upstream request, and that request holds the STT
    // Authorization header. Never hand the whole object to a log line.
    console.error(
      "/api/transcribe error:",
      err instanceof Error ? err.message : String(err)
    );
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
