import { NextRequest, NextResponse } from "next/server";

// The packaged Capacitor app (scripts/build-capacitor.sh) calls /api/chat,
// /api/voice, /api/debrief, /api/transcribe on this SAME deployment from a
// different origin (the Android WebView's own origin, not
// lang-rouge.vercel.app) — every one of those calls is cross-origin, and a
// JSON POST is not a CORS "simple request", so the browser sends an
// OPTIONS preflight first. Next's default behavior for a route with no
// OPTIONS export is a bare 204 + `Allow` header — that's NOT a real CORS
// response (no Access-Control-Allow-Origin/Methods/Headers), so the
// preflight fails silently and the real POST is never sent at all. This
// is why those calls never showed up in xAI's own request logs even
// though curl (which doesn't enforce CORS) worked the entire time.
//
// *** READ THIS BEFORE TOUCHING corsHeaders() ***
// The security patch added a custom request header, x-lang-app-secret (see
// lib/ai/guard.ts). A custom request header is exactly what makes a request
// non-simple, so it triggers the same preflight described above — and if
// Access-Control-Allow-Headers does not name that header, the preflight is
// rejected by the browser and the POST silently never happens. Same failure
// mode, same invisible symptom, one debugging session already lost to it.
// Both `Content-Type` and `x-lang-app-secret` must stay in the list: dropping
// Content-Type to "simplify" would break every JSON POST instead.
//
// On the origin: this used to be `*`. It is now an allowlist, but a
// deliberately generous one, because breaking the APK's calls is a strictly
// worse outcome than a permissive origin — these routes carry no cookies or
// session, so CORS was never what protected them (curl proved that all
// through the original debugging session); the real protection is the shared
// secret + rate limit in lib/ai/guard.ts. What is allowed, and why:
//
//   • any origin whose host is `localhost` or `127.0.0.1`, on ANY scheme and
//     ANY port. Capacitor 8 defaults to androidScheme "https" with hostname
//     "localhost", so the Android WebView's origin is `https://localhost` —
//     but older/alternate Capacitor configurations use `http://localhost`,
//     `capacitor://localhost` or `ionic://localhost`, and `next dev` serves
//     `http://localhost:3000`. Rather than guess which one a given APK build
//     reports, all of them are accepted. The cost of being wrong here is the
//     owner's phone silently losing every AI feature, so this stays broad.
//   • one extra origin from LANG_ALLOWED_ORIGIN, as an escape hatch so a new
//     origin can be allowed by setting an env var instead of shipping code.
//   • anything else gets this deployment's own origin echoed instead, which
//     is simply a value no third-party browser page can match — i.e. a
//     refusal, expressed the way CORS expresses refusals.
//
// The web app itself is same-origin, so it needs none of this; it is only
// here for the packaged APK.
function corsHeaders(request: NextRequest) {
  return {
    "Access-Control-Allow-Origin": resolveAllowedOrigin(request),
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-lang-app-secret",
    // Retry-After is NOT one of the handful of response headers CORS exposes
    // to cross-origin JS by default (that list is Cache-Control,
    // Content-Language, Content-Type, Expires, Last-Modified, Pragma — and
    // nothing else). Without this line the rate limiter's 429 still arrives
    // in the APK, but `res.headers.get("Retry-After")` reads null there, so
    // the client cannot tell the owner how long to wait and falls back to a
    // vague "wait a minute". Exposing it is harmless: it is a number of
    // seconds we just chose ourselves.
    "Access-Control-Expose-Headers": "Retry-After",
    // Required now that the allowed origin varies per request: without this,
    // a CDN or browser cache could serve one caller's allow-origin value to
    // a different caller and we'd be back to debugging phantom CORS failures.
    Vary: "Origin",
  };
}

function isLocalhostOrigin(origin: string): boolean {
  try {
    // new URL throws on a malformed Origin header, and a stranger can send
    // anything at all here — a throw inside middleware would 500 every API
    // call, so this must never be left unguarded.
    const { hostname } = new URL(origin);
    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

function resolveAllowedOrigin(request: NextRequest): string {
  const origin = request.headers.get("origin");

  if (origin) {
    if (isLocalhostOrigin(origin)) return origin;
    const extra = (process.env.LANG_ALLOWED_ORIGIN ?? "").trim();
    if (extra.length > 0 && origin === extra) return origin;
  }

  // Fallback: this deployment's own origin. Built from x-forwarded-proto +
  // host rather than request.nextUrl.origin because behind Vercel's proxy
  // nextUrl can report the internal origin rather than the public one, and
  // getting it wrong here would hand out a value that matches nothing.
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
  return host ? `${proto}://${host}` : "null";
}

export function middleware(request: NextRequest) {
  if (request.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: corsHeaders(request) });
  }

  const response = NextResponse.next();
  for (const [key, value] of Object.entries(corsHeaders(request))) {
    response.headers.set(key, value);
  }
  return response;
}

export const config = {
  matcher: "/api/:path*",
};
