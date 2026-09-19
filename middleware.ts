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
// These routes have no auth/session cookies and are already fully
// reachable by any direct HTTP client regardless of CORS (curl has been
// proving that all through this debugging session) — CORS only gates
// browser-JS access, so a permissive origin here doesn't create new
// exposure beyond what already exists. No credentials are used, so `*`
// is safe (browsers reject `*` combined with credentialed requests, which
// this app never sends).
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export function middleware(request: NextRequest) {
  if (request.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: corsHeaders() });
  }

  const response = NextResponse.next();
  for (const [key, value] of Object.entries(corsHeaders())) {
    response.headers.set(key, value);
  }
  return response;
}

export const config = {
  matcher: "/api/:path*",
};
