import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";
import { NextResponse, type NextRequest } from "next/server";

// Front door for the four AI endpoints (/api/chat, /api/voice, /api/debrief,
// /api/transcribe). Until now all four were wide open: no auth, no rate limit,
// `Access-Control-Allow-Origin: *` in middleware.ts, and the live URL
// (https://lang-rouge.vercel.app) sitting in scripts/build-capacitor.sh in a
// public repo. Anyone who read the repo could point curl at those routes and
// spend the owner's xAI / Anthropic / STT budget, and /api/transcribe in
// particular was a free general-purpose transcription service for strangers.
//
// What this file is honestly worth: the shared secret ships INSIDE the APK
// (see the NEXT_PUBLIC_* note below), so anyone willing to `unzip` the APK and
// grep the JS bundle can extract it. It is a speed bump, not a lock — it stops
// opportunistic abuse by someone who just found the URL in the repo. The real
// cap on a determined attacker is the per-IP rate limit here plus the spending
// limits the owner sets in the xAI and Anthropic consoles. Nothing in this file
// should be described to him as "secured".

// Request header the client sends the shared secret in. Any custom request
// header makes the request non-simple, which means the browser now sends a
// CORS preflight for calls it used to send directly — middleware.ts MUST list
// this exact name in Access-Control-Allow-Headers or the preflight fails
// silently and the POST never happens. That failure already cost this project
// one whole debugging session (see the comment at the top of middleware.ts).
export const APP_SECRET_HEADER = "x-lang-app-secret";

// The owner's own numbers, from the parked "1.4.2" plan at the bottom of
// lib/ai/sanitize.ts: 20 requests / 10 min / IP.
export const RATE_LIMIT_MAX = 20;
export const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

// Ceiling on how many distinct buckets `hits` will hold. Chosen as "absurdly
// far above any legitimate traffic for a single-user app, still small enough
// that the whole Map is trivial memory": 5000 buckets × at most 20 timestamps
// is a few hundred KB. The time-based sweep alone was not enough, because it
// runs at most once per ten-minute window and only deletes what has already
// aged out — so everything first seen inside the current window accumulated
// untouched. That turned the limiter's own bookkeeping into the attack: an
// address-rotating caller added one entry per request for ten minutes before
// any sweep fired, and the O(n) sweep then had to walk whatever had piled up.
export const MAX_TRACKED_KEYS = 5000;

// An IPv4 literal is at most 15 characters and an IPv6 literal at most 45
// ("0000:...:255.255.255.255"), so anything longer cannot be an address and
// is refused before it is ever used as a Map key. This is a defensive bound,
// not a validity check — the validity check is isIP() below. It exists
// because a forged x-forwarded-for can be arbitrarily long (an 8KB header
// value was returned verbatim as a bucket key before this), and a key that
// large is both a memory multiplier and a sign of someone poking at us.
const MAX_IP_KEY_CHARS = 45;

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds the caller should wait before retrying. 0 when allowed. */
  retryAfterSec: number;
}

/**
 * Constant-time comparison of the presented secret against the expected one.
 *
 * Both sides are SHA-256'd before comparing, for two reasons that both matter:
 * timingSafeEqual THROWS when the two buffers differ in length, and the
 * obvious fix — returning false early on a length mismatch — is itself a leak,
 * because the time-to-reject then tells an attacker the secret's exact length.
 * Hashing first makes every single comparison a 32-byte-vs-32-byte compare, so
 * a wrong guess of any length costs exactly the same as a right one.
 *
 * Exported separately from guardRequest so it can be unit-tested with plain
 * strings, without having to fabricate a NextRequest.
 */
export function secretMatches(presented: string | null | undefined, expected: string): boolean {
  const a = createHash("sha256").update(presented ?? "", "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(a, b);
}

// Hit timestamps per IP, newest last. A sliding window rather than a fixed one
// so a burst at 09:59 doesn't get a fresh allowance at 10:00; each list holds
// at most RATE_LIMIT_MAX entries, so memory per IP is tiny and bounded.
//
// Honest limits of doing this in a module-level Map on Vercel: this is
// per-instance, best-effort, NOT a global limit. Each serverless instance has
// its own Map, and because Next can bundle each route as its own function,
// /api/chat and /api/transcribe will in practice keep separate counters —
// so the effective budget is 20/10min per route per instance, and a determined
// attacker spraying requests gets spread across fresh instances. It still does
// the job it's here for: it caps a single attacker hammering one instance, which
// is what a script pointed at the URL from the repo actually looks like. A truly
// global limit needs shared storage, which this app deliberately does not have
// (no Redis, no KV, no extra dependency).
//
// Do NOT rely on the per-route split as headroom, though. Whether Next gives
// each route its own function or bundles several into one is a build detail
// that can change under us, and if /api/transcribe and /api/voice ever share
// a Map then a hands-free voice turn costs two hits on one counter and the
// twenty arrives twice as fast. The clients are written to say so out loud
// when a 429 comes back (see the status checks in VoiceChat.tsx and
// ChatPanel.tsx) rather than to assume it cannot happen.
const hits = new Map<string, number[]>();

// Dropping IPs that have fully aged out is what keeps `hits` from growing
// without bound as an attacker rotates addresses. Doing the sweep on every
// call would be wasted work, so it runs at most once per window — plus
// immediately whenever MAX_TRACKED_KEYS is reached, which is the case the
// once-per-window schedule could not cover (see enforceKeyCeiling).
let lastPruneMs = 0;

function pruneExpired(nowMs: number): void {
  const cutoff = nowMs - RATE_LIMIT_WINDOW_MS;
  for (const [ip, times] of hits) {
    const live = times.filter((t) => t > cutoff);
    if (live.length === 0) hits.delete(ip);
    else hits.set(ip, live);
  }
}

/**
 * Keep `hits` under MAX_TRACKED_KEYS before a new key is added.
 *
 * Sweep first, because under normal conditions most of the Map is stale and
 * that alone will do it. If the ceiling is still breached afterwards, every
 * bucket is genuinely live — i.e. we are being sprayed from many addresses
 * inside one window — and something has to go, so the oldest insertions are
 * dropped. A JS Map iterates in insertion order and `set` on an EXISTING key
 * keeps that key's original position, so "oldest first" here means oldest
 * *first seen*, not least recently used.
 *
 * The honest cost of that: under a spray attack the owner's own address, if
 * it was seen early, is among the first evicted. The consequence is mild —
 * he gets a fresh 20-request allowance, which is the wrong direction but not
 * a lockout — and the alternative (refusing new keys, so an attacker who
 * fills the Map first makes everyone else unlimited) is worse.
 */
function enforceKeyCeiling(nowMs: number): void {
  if (hits.size < MAX_TRACKED_KEYS) return;

  pruneExpired(nowMs);
  lastPruneMs = nowMs;

  // Leave one slot free for the caller that is about to be recorded.
  while (hits.size >= MAX_TRACKED_KEYS) {
    const oldest = hits.keys().next();
    if (oldest.done) return;
    hits.delete(oldest.value);
  }
}

/**
 * Record a hit for `ip` at `nowMs` and say whether it is allowed.
 *
 * Takes the clock as an argument rather than calling Date.now() internally so
 * a unit test can drive a whole window forward without sleeping.
 */
export function checkRateLimit(ip: string, nowMs: number): RateLimitResult {
  if (nowMs - lastPruneMs >= RATE_LIMIT_WINDOW_MS) {
    pruneExpired(nowMs);
    lastPruneMs = nowMs;
  }

  const cutoff = nowMs - RATE_LIMIT_WINDOW_MS;
  const existing = hits.get(ip);
  const times = (existing ?? []).filter((t) => t > cutoff);

  // Only a key we have never seen can grow the Map, so the ceiling is only
  // worth checking on that path.
  if (!existing) enforceKeyCeiling(nowMs);

  if (times.length >= RATE_LIMIT_MAX) {
    // The window frees up when the oldest surviving hit ages out. Round up so
    // we never tell a caller to come back a fraction of a second too early,
    // and never say 0 (which a client would read as "retry immediately").
    const oldest = times[0];
    const retryAfterSec = Math.max(1, Math.ceil((oldest + RATE_LIMIT_WINDOW_MS - nowMs) / 1000));
    hits.set(ip, times); // keep the pruned list; a blocked attempt is not a hit
    return { allowed: false, retryAfterSec };
  }

  times.push(nowMs);
  hits.set(ip, times);
  return { allowed: true, retryAfterSec: 0 };
}

// One-shot latch for the "no secret configured" production warning below.
let warnedAboutMissingSecret = false;

/** Exposed only so tests can start from a known state. */
export function resetRateLimit(): void {
  hits.clear();
  lastPruneMs = 0;
}

/**
 * How many IPs `hits` is currently holding. Exposed for the same reason as
 * resetRateLimit: tests/guard.test.ts asserts that an attacker rotating
 * through addresses cannot grow this Map without bound, and "the Map shrank
 * after the sweep" is not observable from the outside otherwise. Nothing in
 * the app calls this, and it must not become a metric — the number is
 * per-instance and per-route (see the note on `hits`), so it would mean
 * almost nothing in production.
 */
export function rateLimitMapSize(): number {
  return hits.size;
}

/** Bucket shared by every caller whose address we could not parse. */
export const UNPARSEABLE_IP_KEY = "invalid";

/** Bucket shared by callers that arrive with no proxy headers at all (dev). */
export const LOCAL_IP_KEY = "local";

function expandIpv6Hextets(addr: string): string[] | null {
  const parts = addr.split("::");
  if (parts.length > 2) return null;
  const pad = (h: string) => h.padStart(4, "0");
  const head = parts[0].length > 0 ? parts[0].split(":").map(pad) : [];
  if (parts.length === 1) return head.length === 8 ? head : null;
  const tail = parts[1].length > 0 ? parts[1].split(":").map(pad) : [];
  const fill = 8 - head.length - tail.length;
  if (fill < 0) return null;
  return [...head, ...new Array<string>(fill).fill("0000"), ...tail];
}

/**
 * Turn whatever a proxy header contained into the key the limiter buckets on.
 *
 * *** THIS IS THE FUNCTION THAT MAKES THE RATE LIMIT MEAN ANYTHING. ***
 * Before it existed the raw header value was used as the Map key, and that
 * was a complete bypass requiring no cleverness at all: a residential or
 * hosting IPv6 allocation is a routed /64 — 2^64 addresses on one
 * connection — so an attacker sent request 1 from 2001:db8:1:1::1, request
 * 21 from ...::2, and never once hit the twenty. Every one of those requests
 * still reached runTutorTurn()/transcribeAudio() and still billed xAI and
 * Anthropic. Seven different spellings of two addresses produced seven
 * separate buckets. So:
 *
 *   • IPv6 collapses to its /64 prefix (first four hextets, zero-expanded,
 *     lowercased), because that is the unit an attacker actually gets handed
 *     rather than the single address they chose to send from. /64 is the
 *     generous end; if abuse ever shows up it should go to /56 or /48.
 *   • an IPv4-mapped IPv6 address (::ffff:203.0.113.5) resolves to the IPv4
 *     inside it BEFORE the /64 rule, because truncating those to /64 would
 *     collapse every IPv4 caller on earth into one shared bucket and the
 *     first abuser would then rate-limit the owner.
 *   • IPv4 keeps its dotted quad, with any :port stripped — the port is a
 *     different connection from the same machine, not a different caller.
 *   • anything isIP() rejects, and anything implausibly long, collapses into
 *     ONE shared bucket. Letting an unparseable value become its own key is
 *     how a forged header both bypassed the limit and grew the Map.
 */
export function normalizeIpKey(raw: string): string {
  let value = raw.trim();
  if (value.length === 0 || value.length > MAX_IP_KEY_CHARS * 2) return UNPARSEABLE_IP_KEY;

  // Bracketed forms ("[2001:db8::1]", "[2001:db8::1]:443") come from
  // host-style headers; the brackets exist only to disambiguate the port.
  const bracketed = /^\[([^\]]+)\](?::\d{1,5})?$/.exec(value);
  if (bracketed) value = bracketed[1];

  // An IPv4 with a port has exactly one colon. An IPv6 has two or more, so
  // this cannot strip a hextet by accident.
  if (value.split(":").length === 2) {
    const [host] = value.split(":");
    if (isIP(host) === 4) value = host;
  }

  if (value.length > MAX_IP_KEY_CHARS) return UNPARSEABLE_IP_KEY;

  const family = isIP(value);
  if (family === 4) return value;
  if (family !== 6) return UNPARSEABLE_IP_KEY;

  const lower = value.toLowerCase();
  if (lower.startsWith("::ffff:") && lower.includes(".")) {
    const embedded = lower.slice(lower.lastIndexOf(":") + 1);
    if (isIP(embedded) === 4) return embedded;
  }

  const hextets = expandIpv6Hextets(lower);
  if (!hextets) return UNPARSEABLE_IP_KEY;
  return `${hextets.slice(0, 4).join(":")}::/64`;
}

/**
 * The key this request's rate-limit bucket lives under.
 *
 * Header order is deliberate and the leftmost-x-forwarded-for entry is NOT
 * first any more. The leftmost entry is by definition the untrusted end of
 * the chain: whatever the client itself sent. On the live deployment that
 * does not matter, because Vercel overwrites x-forwarded-for with the address
 * it observed and does not forward an external value — but package.json also
 * ships `next start`, and the moment this runs behind anything that does not
 * sanitise the header (a self-host, a container behind a plain reverse
 * proxy), a curl loop with a rotating x-forwarded-for defeats the limiter
 * outright. One was confirmed doing exactly that: 1000 forged values, 1000
 * requests allowed, zero 429s.
 *
 * So: the platform's own single-valued headers first, then x-forwarded-for
 * read from the RIGHT, since the rightmost entry is the one the nearest
 * trusted proxy appended rather than the one the client typed.
 *
 * What this still cannot do, stated plainly: with no trusted proxy in front
 * at all, every header is the client's to choose and nothing here can fix
 * that. And even on Vercel it cannot touch a genuinely distributed attacker.
 * The limiter is a cap on one source hammering one instance; the ceiling that
 * does not depend on this code at all is the owner's spend caps in the xAI
 * and Anthropic consoles, and a Vercel WAF rate-limit rule on /api/* would
 * add a real edge-side limit keyed on the platform's own trusted client IP.
 *
 * `next dev` sends none of these headers — falling back to one fixed key
 * means local requests share a counter instead of each looking like a brand
 * new caller, which is what makes the limiter testable by hand.
 */
export function clientIp(req: NextRequest): string {
  // Set by Vercel itself and single-valued, so it cannot be a chain and
  // cannot be influenced by the caller.
  const trusted =
    req.headers.get("x-vercel-forwarded-for") ?? req.headers.get("x-real-ip");
  if (trusted && trusted.trim().length > 0) return normalizeIpKey(trusted);

  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const entries = forwarded.split(",").map((e) => e.trim()).filter((e) => e.length > 0);
    const rightmost = entries[entries.length - 1];
    if (rightmost) return normalizeIpKey(rightmost);
  }

  return LOCAL_IP_KEY;
}

/**
 * Call this as the very first thing in a route's POST, BEFORE reading the
 * body — an unauthenticated request should never get its body parsed, and a
 * rate-limited one should cost us as little work as possible.
 *
 * Returns null when the request may proceed, or the response to return as-is.
 */
export function guardRequest(req: NextRequest): NextResponse | null {
  // Deliberate pass-through when LANG_APP_SECRET is unset or empty: this code
  // has to be able to deploy BEFORE the env var exists in Vercel. Vercel
  // auto-deploys on push, and the APK already installed on the owner's phone
  // was built without the secret — if the gate defaulted to "deny", his phone
  // would start failing the instant this merged, before he'd had a chance to
  // set anything up. Enforcement switches on only when he sets the variable,
  // by which point he will have rebuilt the APK with the matching value.
  const expected = (process.env.LANG_APP_SECRET ?? "").trim();

  // The pass-through above is deliberate, but it is also invisible, and an
  // invisible open door is how "we shipped the gate" turns into "the gate was
  // never on" months later. One line, once per instance, in production only:
  // enough that the state shows up in the Vercel runtime logs, not enough to
  // spam them. Gated on NODE_ENV so `next dev` and the test suite stay quiet —
  // tests/guard.test.ts deletes this variable before every single test, and a
  // warning per test would be noise nobody reads.
  if (expected.length === 0 && !warnedAboutMissingSecret && process.env.NODE_ENV === "production") {
    warnedAboutMissingSecret = true;
    console.warn(
      "[guard] LANG_APP_SECRET is not set: the AI endpoints are open to anyone " +
        "with the URL, capped only by the per-IP rate limit. Set it in the Vercel " +
        "project and rebuild the APK with a matching NEXT_PUBLIC_LANG_APP_SECRET."
    );
  }

  if (expected.length > 0 && !secretMatches(req.headers.get(APP_SECRET_HEADER), expected)) {
    // No detail in the body on purpose — "missing" vs "wrong" tells a prober
    // whether they're close.
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Rate limit applies even to requests that presented a valid secret. That is
  // the whole point: the secret is extractable from the APK, so it cannot be
  // the thing standing between a stranger and the owner's bill — the limiter is.
  const { allowed, retryAfterSec } = checkRateLimit(clientIp(req), Date.now());
  if (!allowed) {
    return NextResponse.json(
      { error: "rate limited" },
      { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
    );
  }

  return null;
}
