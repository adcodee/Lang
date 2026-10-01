import test, { afterEach, beforeEach, describe } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import {
  MAX_AUDIO_BYTES,
  audioTypeAllowed,
  sanitizePrompt,
  transcribeAudio,
  transcribeConfigured,
} from "@/lib/ai/transcribe";
import { POST } from "@/app/api/transcribe/route";
import { resetRateLimit } from "@/lib/ai/guard";

// Tests for the abuse limits on /api/transcribe (lib/ai/transcribe.ts plus the
// route's body validation).
//
// This was the worst of the four open endpoints: it took any audio, in any
// language, with any prompt, and billed the result to the owner's xAI key, so
// it was a free general-purpose transcription service for anyone who found the
// public URL in the repo. The clamps that closed that are easy to "tidy" into
// uselessness later — the empty / application-octet-stream allowance in
// particular looks like dead permissiveness until you know that our own
// recorder produces exactly those. So both halves are pinned here: the limits
// hold, AND a real recording from our own clients still gets through.

// Control characters, written as escapes. A literal one in this file would be
// invisible in a diff and would make the assertion below pass for the wrong
// reason.
const CONTROL_CHARS = /[\u0000-\u001f\u007f-\u009f]/;

// The guard runs first inside POST, so the suite would start 429ing itself
// once it crosses twenty route calls. Also clear the provider keys: if the
// owner's shell exports XAI_API_KEY, the "accepted" tests would make real
// billed calls to a real STT provider instead of taking the stub path.
beforeEach(() => {
  delete process.env.LANG_APP_SECRET;
  delete process.env.XAI_API_KEY;
  delete process.env.STT_API_KEY;
  delete process.env.STT_BASE_URL;
  delete process.env.STT_MODEL;
  resetRateLimit();
});

/** A plausible recording: `bytes` of payload, labelled like a real browser. */
function recording(bytes: number, type: string): Blob {
  return new Blob([new Uint8Array(bytes)], { type });
}

function upload(fields: Record<string, string | Blob>): NextRequest {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    // Both real call sites use the three-argument form, which is what makes a
    // typeless Blob arrive as application/octet-stream server-side.
    if (v instanceof Blob) form.append(k, v, "audio");
    else form.append(k, v);
  }
  return new NextRequest("https://lang-rouge.vercel.app/api/transcribe", {
    method: "POST",
    body: form,
  });
}

describe("audioTypeAllowed", () => {
  test("accepts the container types our recorders actually emit", () => {
    // Chrome/Android, Firefox, iOS Safari, and the two iOS mp4 labellings.
    for (const t of [
      "audio/webm",
      "audio/webm;codecs=opus",
      "audio/ogg;codecs=opus",
      "audio/mp4",
      "video/mp4",
      "audio/mpeg",
      "audio/wav",
    ]) {
      assert.equal(audioTypeAllowed(t), true, `${t} should be allowed`);
    }
  });

  // Load-bearing, and the thing most likely to be "cleaned up" by a later
  // pass: lib/audio.ts has two paths that produce a Blob with no type at all,
  // and multipart serialisation turns that into application/octet-stream. Both
  // have to stay allowed or real recordings break on exactly the browsers the
  // cloud transcription tier exists to serve.
  test("accepts the typeless blobs our own recorder fallback produces", () => {
    assert.equal(audioTypeAllowed(""), true);
    assert.equal(audioTypeAllowed("application/octet-stream"), true);
    assert.equal(audioTypeAllowed("   "), true);
    assert.equal(audioTypeAllowed("APPLICATION/OCTET-STREAM"), true);
  });

  test("turns away uploads labelled as plainly non-audio", () => {
    for (const t of [
      "application/pdf",
      "text/plain",
      "image/png",
      "application/zip",
      "application/json",
    ]) {
      assert.equal(audioTypeAllowed(t), false, `${t} should be rejected`);
    }
  });

  // The point is that the check is a prefix match on the type, not a substring
  // match anywhere in the string — a substring match would let
  // "application/x-audio" through.
  test("matches on the type prefix, not a substring", () => {
    assert.equal(audioTypeAllowed("application/x-audio"), false);
    assert.equal(audioTypeAllowed("text/audio-transcript"), false);
  });
});

describe("sanitizePrompt", () => {
  test("keeps a normal recognition hint intact", () => {
    assert.equal(sanitizePrompt("おはようございます"), "おはようございます");
  });

  test("caps the hint at 200 characters", () => {
    const out = sanitizePrompt("あ".repeat(500));
    assert.equal(out?.length, 200);
  });

  // The hint is interpolated into a multipart field we hand a third party, so
  // newlines and other control characters have to go — they are how you
  // smuggle structure into a form body.
  test("strips control characters including newlines", () => {
    const out = sanitizePrompt("hello\nworld\r\n\tagain end");
    assert.ok(out);
    assert.equal(CONTROL_CHARS.test(out), false, `control char survived: ${JSON.stringify(out)}`);
    assert.ok(out.includes("hello"));
    assert.ok(out.includes("end"));
  });

  test("control characters are replaced before the length cap, not after", () => {
    // 400 newlines then real text: if the slice ran first the text would be
    // lost entirely, which would silently degrade SpeakInput's grading.
    const out = sanitizePrompt("\n".repeat(400) + "ありがとう");
    assert.equal(out, "ありがとう");
  });

  test("treats anything that is not a string as absent", () => {
    for (const v of [undefined, null, 42, {}, [], true, new Blob(["x"])]) {
      assert.equal(sanitizePrompt(v), undefined, `${String(v)} should give undefined`);
    }
  });

  test("treats an empty or whitespace-only hint as absent", () => {
    assert.equal(sanitizePrompt(""), undefined);
    assert.equal(sanitizePrompt("    "), undefined);
    assert.equal(sanitizePrompt("\n\t"), undefined);
  });
});

describe("POST /api/transcribe — body validation", () => {
  test("rejects a missing audio field with 400", async () => {
    const res = await POST(upload({ language: "ja" }));
    assert.equal(res.status, 400);
  });

  test("rejects a zero-byte recording with 400", async () => {
    const res = await POST(upload({ audio: recording(0, "audio/webm") }));
    assert.equal(res.status, 400);
  });

  test("rejects an oversized upload with 413 before any provider call", async () => {
    const res = await POST(upload({ audio: recording(MAX_AUDIO_BYTES + 1, "audio/webm") }));
    assert.equal(res.status, 413);
    const body = await res.json();
    assert.match(body.error, /too large/);
    // No transcript/stubbed keys: the clients treat that as "fall back to
    // typed romaji" rather than crashing.
    assert.equal("transcript" in body, false);
  });

  test("allows an upload right on the size limit", async () => {
    const res = await POST(upload({ audio: recording(MAX_AUDIO_BYTES, "audio/webm") }));
    assert.equal(res.status, 200);
  });

  test("rejects a non-audio upload with 415", async () => {
    for (const t of ["application/pdf", "text/plain", "image/png"]) {
      resetRateLimit();
      const res = await POST(upload({ audio: recording(2048, t) }));
      assert.equal(res.status, 415, `${t} should have been 415`);
      assert.equal((await res.json()).error, "unsupported audio type");
    }
  });

  // Size is checked before type on purpose: size is the only check that bounds
  // what a request costs us to handle.
  test("a huge non-audio upload is refused on size, not type", async () => {
    const res = await POST(upload({ audio: recording(MAX_AUDIO_BYTES + 1, "application/pdf") }));
    assert.equal(res.status, 413);
  });

  test("accepts a realistic audio/webm recording", async () => {
    // ~80KB is about what a few seconds of opus speech weighs.
    const res = await POST(
      upload({ audio: recording(80 * 1024, "audio/webm;codecs=opus"), language: "ja" })
    );
    assert.equal(res.status, 200);
    const body = await res.json();
    // No STT key in this environment, so the honest answer is the stub — what
    // matters is that the request was accepted rather than refused.
    assert.equal(body.stubbed, true);
    assert.equal(body.reason, "no-key");
  });

  test("accepts a realistic audio/mp4 recording (iOS Safari)", async () => {
    const res = await POST(upload({ audio: recording(60 * 1024, "audio/mp4"), language: "ja" }));
    assert.equal(res.status, 200);
    assert.equal((await res.json()).reason, "no-key");
  });

  test("accepts the typeless recording our stop-failed fallback produces", async () => {
    const res = await POST(upload({ audio: recording(40 * 1024, "") }));
    assert.equal(res.status, 200);
    assert.equal((await res.json()).reason, "no-key");
  });

  // The language field is still sent by both clients and must now be ignored
  // rather than honoured — and, just as importantly, never echoed back, so a
  // caller gets no feedback telling them the knob exists.
  test("ignores a caller-supplied language instead of honouring it", async () => {
    const res = await POST(upload({ audio: recording(20 * 1024, "audio/webm"), language: "ru" }));
    assert.equal(res.status, 200);
    // Asserting the exact shape rather than "the string 'ru' is absent" — the
    // substring version passed for the wrong reason at first, because
    // `"stubbed":true` contains "ru".
    assert.deepEqual(await res.json(), { transcript: "", stubbed: true, reason: "no-key" });
  });
});

describe("transcribeAudio — what actually reaches the provider", () => {
  const realFetch = globalThis.fetch;
  let calls: Array<{ url: string; form: FormData; auth: string | null }> = [];

  beforeEach(() => {
    calls = [];
    globalThis.fetch = (async (input: unknown, init: RequestInit | undefined) => {
      calls.push({
        url: String(input),
        form: init?.body as FormData,
        auth: new Headers(init?.headers ?? {}).get("authorization"),
      });
      return new Response(JSON.stringify({ text: "こんにちは" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }) as unknown as typeof fetch;
  });

  // Restoring the real fetch matters even on failure: a leaked stub would make
  // every later test in the process silently fake its network.
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  test("makes no call at all when no provider key is configured", async () => {
    assert.equal(transcribeConfigured(), false);
    const out = await transcribeAudio(recording(1024, "audio/webm"));
    assert.equal(calls.length, 0);
    assert.deepEqual(out, { transcript: "", stubbed: true, reason: "no-key" });
  });

  // The headline fix: the language on the wire is "ja" no matter what, because
  // it is a module constant with no parameter left to override it.
  test("pins language=ja on the xAI path", async () => {
    process.env.XAI_API_KEY = "xai-test-not-a-real-key";
    const out = await transcribeAudio(recording(1024, "audio/webm"));
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "https://api.x.ai/v1/stt");
    assert.equal(calls[0].form.get("language"), "ja");
    assert.equal(out.transcript, "こんにちは");
    assert.equal(out.stubbed, false);
  });

  test("pins language=ja on the OpenAI-compatible path", async () => {
    process.env.STT_API_KEY = "sk-test-not-a-real-key";
    process.env.STT_BASE_URL = "https://example.invalid/v1";
    await transcribeAudio(recording(1024, "audio/webm"));
    assert.equal(calls[0].url, "https://example.invalid/v1/audio/transcriptions");
    assert.equal(calls[0].form.get("language"), "ja");
    assert.equal(calls[0].form.get("model"), "whisper-1");
  });

  // transcribeAudio re-clamps rather than trusting its caller, so the limit
  // lives next to the wire and a future second call site cannot bypass it by
  // skipping the route's sanitizePrompt.
  test("re-clamps an over-long prompt even when handed one directly", async () => {
    process.env.XAI_API_KEY = "xai-test-not-a-real-key";
    await transcribeAudio(recording(1024, "audio/webm"), "x".repeat(5000));
    assert.equal(String(calls[0].form.get("prompt")).length, 200);
  });

  test("re-strips control characters from a prompt handed in directly", async () => {
    process.env.XAI_API_KEY = "xai-test-not-a-real-key";
    await transcribeAudio(recording(1024, "audio/webm"), "line one\nline two");
    const sent = String(calls[0].form.get("prompt"));
    assert.equal(CONTROL_CHARS.test(sent), false);
  });

  test("sends no prompt field at all when the hint is empty", async () => {
    process.env.XAI_API_KEY = "xai-test-not-a-real-key";
    await transcribeAudio(recording(1024, "audio/webm"), "   ");
    assert.equal(calls[0].form.get("prompt"), null);
  });

  test("names the upload by its container so the provider accepts it", async () => {
    process.env.XAI_API_KEY = "xai-test-not-a-real-key";
    await transcribeAudio(recording(1024, "audio/mp4"));
    const file = calls[0].form.get("file") as File;
    assert.equal(file.name, "audio.mp4");
  });
});

describe("transcribeAudio — error logging never prints a credential", () => {
  const realFetch = globalThis.fetch;
  const realError = console.error;
  let logged: string[] = [];

  beforeEach(() => {
    logged = [];
    console.error = (...args: unknown[]) => {
      logged.push(args.map((a) => String(a)).join(" "));
    };
  });

  afterEach(() => {
    globalThis.fetch = realFetch;
    console.error = realError;
  });

  // This used to dump 500 characters of the upstream body verbatim. Provider
  // error bodies sometimes echo the request back, Authorization header
  // included, and a server log is the one place a leaked key sits in plaintext
  // forever. The status is what diagnoses these failures; the snippet is a
  // hint, not evidence.
  test("scrubs a key echoed back inside an upstream error body", async () => {
    const leak =
      '{"error":"bad request","request":{"headers":{"Authorization":"Bearer xai-FAKEKEYFORTESTSONLY0123456789"}}}';
    globalThis.fetch = (async () => new Response(leak, { status: 400 })) as unknown as typeof fetch;
    process.env.XAI_API_KEY = "xai-FAKEKEYFORTESTSONLY0123456789";

    const out = await transcribeAudio(recording(1024, "audio/webm"));
    assert.equal(out.reason, "error");
    assert.equal(out.status, 400);

    const all = logged.join("\n");
    assert.ok(all.length > 0, "expected the failure to be logged at all");
    assert.equal(all.includes("FAKEKEYFORTESTSONLY"), false, `credential reached the log: ${all}`);
    assert.ok(all.includes("[redacted]"), `nothing was redacted: ${all}`);
    assert.ok(all.includes("400"), "the status, which is the actually useful part, was dropped");
  });

  test("keeps the logged snippet short", async () => {
    // A 5000-char error body must not become a 5000-char log line. The old
    // code took 500 chars; the cap is now 100.
    globalThis.fetch = (async () =>
      new Response("E".repeat(5000), { status: 500 })) as unknown as typeof fetch;
    process.env.XAI_API_KEY = "xai-test-not-a-real-key";
    await transcribeAudio(recording(1024, "audio/webm"));
    assert.ok(logged.length > 0);
    assert.ok(
      logged[0].length < 300,
      `log line was ${logged[0].length} chars: ${logged[0].slice(0, 120)}`
    );
  });

  // A thrown undici error carries a `cause` chain that can reference the
  // request we just built — and that request holds the Authorization header.
  // So the catch block logs err.message only, never the object.
  test("logs only the message when the request throws", async () => {
    globalThis.fetch = (async () => {
      throw new Error("connect ECONNREFUSED using Bearer xai-FAKEKEYFORTESTSONLY0123456789");
    }) as unknown as typeof fetch;
    process.env.XAI_API_KEY = "xai-FAKEKEYFORTESTSONLY0123456789";

    const out = await transcribeAudio(recording(1024, "audio/webm"));
    assert.equal(out.reason, "exception");
    assert.equal(out.stubbed, true);
    const all = logged.join("\n");
    assert.equal(all.includes("FAKEKEYFORTESTSONLY"), false, `credential reached the log: ${all}`);
  });

  // The owner's parked 1.4.2 item 5 is "never print full transcripts in server
  // logs". For this module that is already true, and this test is what keeps
  // it true the next time somebody adds a debug line.
  test("never logs the transcript itself", async () => {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ text: "ひみつのぶんしょう" }), {
        status: 200,
      })) as unknown as typeof fetch;
    process.env.XAI_API_KEY = "xai-test-not-a-real-key";
    const out = await transcribeAudio(recording(1024, "audio/webm"));
    assert.equal(out.transcript, "ひみつのぶんしょう");
    assert.equal(logged.join("\n").includes("ひみつ"), false);
  });
});
