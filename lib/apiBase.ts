// Empty string in the normal (Vercel/dev) build — fetches stay relative,
// hitting this same Next server's own /api/* routes, unchanged behaviour.
// The Capacitor static-export build sets NEXT_PUBLIC_API_BASE_URL at build
// time (see scripts/build-capacitor.sh) to the live deployed backend, since
// a packaged app has no server of its own to answer /api/chat locally —
// and never could, since those routes hold secret API keys that must never
// ship inside a client APK.
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

// Shared secret for the four AI endpoints, matching lib/ai/guard.ts's
// APP_SECRET_HEADER on the server side. Set ONLY by
// scripts/build-capacitor.sh at APK build time, so it is empty in dev and
// empty in the Vercel web build.
//
// *** WHAT THAT COSTS THE WEB APP — SAY IT PLAINLY ***
// An earlier version of this comment claimed the Vercel web build was
// "same-origin and doesn't need it". That was wrong and dangerously so.
// guardRequest() in lib/ai/guard.ts has NO same-origin exemption: it compares
// the x-lang-app-secret header and nothing else. So the moment
// LANG_APP_SECRET is set in the Vercel project, the browser web app at
// lang-rouge.vercel.app starts getting 401 on /api/chat, /api/voice,
// /api/debrief and /api/transcribe, and loses its AI features. The APK keeps
// working, because that is the build that carries the secret. That trade is
// the accepted one: the APK is how the owner actually uses this app, and the
// web deploy's lesson/dojo/rank UI is all local anyway.
//
// *** AND THE FIX IS NOT TO SET NEXT_PUBLIC_LANG_APP_SECRET IN VERCEL ***
// That is the obvious-looking next step and it would quietly destroy the
// whole gate. NEXT_PUBLIC_* values are inlined into the JS bundle, and the
// Vercel bundle is served publicly, so the secret would be readable with
// view-source by anyone who opens the site — including the people the gate
// exists to keep out. It belongs in exactly one place: the environment of a
// one-off `scripts/build-capacitor.sh` run on the owner's own machine.
// A same-origin exemption keyed on Origin / Referer / sec-fetch-site is not
// the answer either: curl sets those headers to whatever it likes, so such an
// exemption would hand every stranger a bypass.
//
// *** NEVER WRITE A VALUE HERE ***
// NEXT_PUBLIC_* variables are inlined into the JS bundle by the compiler, so
// anything written into this file as a default or fallback would be committed
// to a public repo AND shipped to every browser. Only the variable NAME
// belongs in the source. It also has to be referenced as this exact literal
// expression — Next only inlines a static `process.env.NEXT_PUBLIC_FOO`
// lookup, so destructuring it or building the key dynamically would quietly
// compile to `undefined` and the APK would be rejected the moment the server
// starts enforcing, with nothing in the code looking wrong.
const APP_SECRET = process.env.NEXT_PUBLIC_LANG_APP_SECRET ?? "";

/**
 * Headers for a call to one of the /api/* AI endpoints.
 *
 * Pass whatever the specific call needs (e.g. Content-Type for a JSON POST)
 * and the shared secret is added on top when the build has one.
 *
 * Multipart FormData callers (/api/transcribe) MUST call this with no
 * arguments: the browser has to set Content-Type itself so it can include the
 * multipart boundary, and naming the header at all — even as undefined —
 * breaks the upload. That's why this returns a plain object with only the keys
 * that genuinely apply, rather than always including a Content-Type slot.
 */
export function apiHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { ...extra };
  if (APP_SECRET) headers["x-lang-app-secret"] = APP_SECRET;
  return headers;
}

/** Convenience for the JSON POSTs, which all want the same Content-Type. */
export function jsonApiHeaders(): Record<string, string> {
  return apiHeaders({ "Content-Type": "application/json" });
}

/**
 * A line to show the user when an /api/* call came back non-OK, or null when
 * the response is fine and should be parsed as normal.
 *
 * *** WHY EVERY CALL SITE NEEDS THIS ***
 * Not one of the six fetches in this app used to look at res.status. They all
 * went straight to res.json(), which succeeds on an error body too — so the
 * guard's 429 was parsed as if it were a tutor turn, `spoken_ja` came out
 * undefined, and the app rendered a bare "…" with no explanation. The voice
 * debrief rendered an empty coach card and the hands-free loop kept going,
 * speaking nothing. The rate limiter runs even with LANG_APP_SECRET unset, so
 * this was reachable on the phone already in his pocket as soon as a brisk
 * text session crossed twenty messages in ten minutes — reading, from his
 * side, exactly like the app silently breaking right after an auto-deploy.
 *
 * Messages are deliberately plain and actionable; the user is the owner, so
 * "401" means "this build is older than the server's secret", which is a
 * thing he can actually go and fix.
 */
export function apiErrorMessage(res: Response): string | null {
  if (res.ok) return null;

  if (res.status === 429) {
    // Retry-After is in seconds. It reads null cross-origin unless
    // middleware.ts exposes it (it does — see the Expose-Headers note there),
    // and an older deployment may not, so this has to degrade gracefully
    // rather than print "wait NaN".
    const secs = Number(res.headers.get("Retry-After"));
    const wait =
      Number.isFinite(secs) && secs > 0
        ? secs >= 60
          ? `${Math.ceil(secs / 60)} minute${Math.ceil(secs / 60) === 1 ? "" : "s"}`
          : `${Math.ceil(secs)} seconds`
        : "a minute";
    return `Too many requests — wait ${wait} and try again.`;
  }

  if (res.status === 401) {
    return "This app build isn't authorised for this server. Rebuild the APK with the current shared secret.";
  }

  return "The tutor is unavailable right now — please try again.";
}
