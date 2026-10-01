import test, { beforeEach, describe } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import {
  APP_SECRET_HEADER,
  LOCAL_IP_KEY,
  MAX_TRACKED_KEYS,
  RATE_LIMIT_MAX,
  RATE_LIMIT_WINDOW_MS,
  UNPARSEABLE_IP_KEY,
  checkRateLimit,
  clientIp,
  guardRequest,
  normalizeIpKey,
  rateLimitMapSize,
  resetRateLimit,
  secretMatches,
} from "@/lib/ai/guard";

// Tests for the front door on the four AI endpoints (lib/ai/guard.ts).
//
// These exist because the gate has two failure modes that are both silent and
// both expensive, and neither shows up in a typecheck:
//   • fail-open — a bug that lets every request through leaves the owner's xAI
//     and Anthropic keys spendable by anyone who read the public repo;
//   • fail-closed — a bug that rejects the APK already installed on his phone
//     turns the app into a wall of 401s with no obvious cause.
// So the pass-through-when-unset behaviour is pinned here as hard as the
// reject-on-wrong-secret behaviour. It is deliberate, not a loose end.

// Every env var the guard reads, cleared before each test. Done defensively
// rather than assuming a clean shell: the owner's own environment may well
// export LANG_APP_SECRET, and a leaked value would silently invert the
// meaning of the pass-through tests.
beforeEach(() => {
  delete process.env.LANG_APP_SECRET;
  resetRateLimit();
});

function post(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest("https://lang-rouge.vercel.app/api/chat", {
    method: "POST",
    headers,
  });
}

describe("secretMatches", () => {
  test("accepts the correct secret", () => {
    assert.equal(secretMatches("s3cret-value", "s3cret-value"), true);
  });

  test("rejects a wrong secret of the same length", () => {
    assert.equal(secretMatches("s3cret-valuf", "s3cret-value"), false);
  });

  // The whole reason both sides are SHA-256'd first: node's timingSafeEqual
  // THROWS on a length mismatch, so a naive implementation would turn a
  // one-character-short guess into a 500 instead of a 401 — and the pattern of
  // 500s would hand an attacker the secret's exact length.
  test("rejects a shorter secret without throwing", () => {
    assert.doesNotThrow(() => secretMatches("s3cret", "s3cret-value"));
    assert.equal(secretMatches("s3cret", "s3cret-value"), false);
  });

  test("rejects a much longer secret without throwing", () => {
    const long = "x".repeat(4096);
    assert.doesNotThrow(() => secretMatches(long, "s3cret-value"));
    assert.equal(secretMatches(long, "s3cret-value"), false);
  });

  test("rejects a missing header (null / undefined / empty) without throwing", () => {
    assert.equal(secretMatches(null, "s3cret-value"), false);
    assert.equal(secretMatches(undefined, "s3cret-value"), false);
    assert.equal(secretMatches("", "s3cret-value"), false);
  });

  // Not a security property, just proof the hashing step did not quietly make
  // everything compare equal — which is how a "constant-time" compare fails
  // open in practice.
  test("is not comparing hashes of hashes to themselves", () => {
    assert.equal(secretMatches("a", "b"), false);
    assert.equal(secretMatches("b", "b"), true);
  });
});

describe("guardRequest — the secret gate", () => {
  test("passes every request through when LANG_APP_SECRET is unset", () => {
    assert.equal(guardRequest(post()), null);
    resetRateLimit();
    assert.equal(guardRequest(post({ [APP_SECRET_HEADER]: "anything-at-all" })), null);
  });

  test("passes through when LANG_APP_SECRET is empty", () => {
    process.env.LANG_APP_SECRET = "";
    assert.equal(guardRequest(post()), null);
  });

  // The .trim() in guardRequest matters: pasting a value into the Vercel
  // dashboard is an easy way to pick up a trailing newline or a stray space,
  // and a whitespace-only value has to read as "not configured" rather than as
  // a secret nobody can ever present.
  test("passes through when LANG_APP_SECRET is whitespace only", () => {
    process.env.LANG_APP_SECRET = "   \n\t ";
    assert.equal(guardRequest(post()), null);
  });

  test("allows a request carrying the right secret", () => {
    process.env.LANG_APP_SECRET = "right-secret";
    assert.equal(guardRequest(post({ [APP_SECRET_HEADER]: "right-secret" })), null);
  });

  // Same .trim() asymmetry, from the other side: the server trims its own
  // expected value, so an owner whose env var picked up a newline still has a
  // working APK, which sends the clean value.
  test("allows a request when only the server value has stray whitespace", () => {
    process.env.LANG_APP_SECRET = "  right-secret  ";
    assert.equal(guardRequest(post({ [APP_SECRET_HEADER]: "right-secret" })), null);
  });

  test("rejects a wrong secret with 401", async () => {
    process.env.LANG_APP_SECRET = "right-secret";
    const res = guardRequest(post({ [APP_SECRET_HEADER]: "wrong-secret" }));
    assert.ok(res, "expected a response, got null (request would have proceeded)");
    assert.equal(res.status, 401);
    assert.deepEqual(await res.json(), { error: "unauthorized" });
  });

  test("rejects a missing header with 401", () => {
    process.env.LANG_APP_SECRET = "right-secret";
    assert.equal(guardRequest(post())?.status, 401);
  });

  // "missing" and "wrong" must be indistinguishable, or a prober learns
  // whether they are close.
  test("does not say whether the secret was missing or wrong", async () => {
    process.env.LANG_APP_SECRET = "right-secret";
    const missing = guardRequest(post());
    resetRateLimit();
    const wrong = guardRequest(post({ [APP_SECRET_HEADER]: "nope" }));
    assert.equal(missing?.status, wrong?.status);
    assert.deepEqual(await missing!.json(), await wrong!.json());
  });

  // A rejected request must not even be counted, let alone parsed. If 401s
  // consumed the budget, an unauthenticated attacker could lock the owner's
  // own phone out of its own rate-limit window for ten minutes.
  test("a 401 does not spend the caller's rate-limit budget", () => {
    process.env.LANG_APP_SECRET = "right-secret";
    for (let i = 0; i < RATE_LIMIT_MAX * 3; i++) {
      assert.equal(guardRequest(post({ [APP_SECRET_HEADER]: "wrong" }))?.status, 401);
    }
    assert.equal(guardRequest(post({ [APP_SECRET_HEADER]: "right-secret" })), null);
  });
});

// normalizeIpKey is the function that makes the rate limit mean anything, so
// it gets the most tests in this file. Before it existed the raw header value
// was the Map key, which meant an attacker on a routed IPv6 /64 — 2^64
// addresses on one connection — got a fresh twenty per source address and
// never hit the limit at all. No header forgery required.
describe("normalizeIpKey", () => {
  test("every spelling of one IPv6 address lands in one bucket", () => {
    const spellings = [
      "2001:db8::1",
      "2001:DB8::1",
      "2001:0db8:0000:0000:0000:0000:0000:0001",
      "[2001:db8::1]",
      "[2001:db8::1]:443",
      "  2001:db8::1  ",
    ];
    const keys = new Set(spellings.map(normalizeIpKey));
    assert.equal(keys.size, 1, `expected one bucket, got ${[...keys].join(" / ")}`);
  });

  // The actual bypass, in one assertion: different addresses, same allocation.
  test("different addresses in one /64 share a bucket", () => {
    assert.equal(normalizeIpKey("2001:db8:1:1::1"), normalizeIpKey("2001:db8:1:1::beef"));
  });

  test("different /64s do not share a bucket", () => {
    assert.notEqual(normalizeIpKey("2001:db8:1:1::1"), normalizeIpKey("2001:db8:1:2::1"));
  });

  test("an IPv4 keeps its dotted quad, with any port stripped", () => {
    assert.equal(normalizeIpKey("203.0.113.5"), "203.0.113.5");
    assert.equal(normalizeIpKey("203.0.113.5:4443"), "203.0.113.5");
  });

  // The trap in the /64 rule: ::ffff:a.b.c.d is an IPv6 literal as far as
  // isIP() is concerned, and every one of them shares the same first four
  // hextets. Truncating them would put EVERY IPv4 caller in one bucket, so
  // the first abuser would rate-limit the owner.
  test("an IPv4-mapped IPv6 address resolves to the IPv4 inside it", () => {
    assert.equal(normalizeIpKey("::ffff:203.0.113.5"), "203.0.113.5");
    assert.notEqual(normalizeIpKey("::ffff:203.0.113.5"), normalizeIpKey("::ffff:198.51.100.7"));
  });

  // A value that is not an address must not become its own key: that is how a
  // forged header both evaded the limit and grew the Map one entry per
  // request. One shared bucket for all of them instead.
  test("anything that is not an IP collapses into one shared bucket", () => {
    const junk = ["not-an-ip-at-all", "9.9.9.9-0", "9.9.9.9-1", "A".repeat(8000), "", "   "];
    const keys = new Set(junk.map(normalizeIpKey));
    assert.deepEqual([...keys], [UNPARSEABLE_IP_KEY]);
  });

  // Length-capped so one entry cannot itself be large.
  test("the key is never longer than an IP literal can be", () => {
    for (const v of ["A".repeat(8000), "2001:db8::1", "203.0.113.5", "junk"]) {
      assert.ok(normalizeIpKey(v).length <= 64, `key too long for ${v.slice(0, 20)}`);
    }
  });
});

describe("clientIp", () => {
  // Vercel sets this one itself and it cannot be a chain, so it wins over
  // anything the caller may have sent.
  test("prefers the platform's own trusted header", () => {
    assert.equal(
      clientIp(post({ "x-vercel-forwarded-for": "203.0.113.5", "x-forwarded-for": "9.9.9.9" })),
      "203.0.113.5"
    );
  });

  test("falls back to x-real-ip before x-forwarded-for", () => {
    assert.equal(
      clientIp(post({ "x-real-ip": "203.0.113.6", "x-forwarded-for": "9.9.9.9" })),
      "203.0.113.6"
    );
  });

  // Deliberately NOT the leftmost entry any more. The leftmost is whatever
  // the client itself sent — the untrusted end of the chain by definition —
  // so on any deployment that does not sanitise the header (this repo also
  // ships `next start`) reading it hands an attacker a free bypass. The
  // rightmost is the entry the nearest trusted proxy appended.
  test("reads x-forwarded-for from the right, not the left", () => {
    assert.equal(clientIp(post({ "x-forwarded-for": "9.9.9.9, 10.0.0.1, 203.0.113.7" })), "203.0.113.7");
  });

  test("trims surrounding whitespace", () => {
    assert.equal(clientIp(post({ "x-forwarded-for": "10.0.0.1 ,  203.0.113.8 " })), "203.0.113.8");
  });

  test("falls back to a single shared key when no header is present", () => {
    assert.equal(clientIp(post()), LOCAL_IP_KEY);
  });

  // An empty or comma-only header has no entries at all, so it is the same
  // situation as no header: the single dev bucket, not an empty-string key.
  test("falls back when the header is empty or comma-only", () => {
    assert.equal(clientIp(post({ "x-forwarded-for": "" })), LOCAL_IP_KEY);
    assert.equal(clientIp(post({ "x-forwarded-for": "   " })), LOCAL_IP_KEY);
    assert.equal(clientIp(post({ "x-forwarded-for": " , " })), LOCAL_IP_KEY);
  });

  // "no header" and "unparseable header" must stay distinguishable: the first
  // is dev, the second is someone sending junk, and merging them would put
  // local development into the attackers' bucket.
  test("junk in the header is not the same bucket as no header", () => {
    assert.equal(clientIp(post({ "x-forwarded-for": "not-an-ip" })), UNPARSEABLE_IP_KEY);
    assert.notEqual(UNPARSEABLE_IP_KEY, LOCAL_IP_KEY);
  });
});

describe("checkRateLimit", () => {
  // The clock is injected everywhere below. Sleeping ten real minutes to watch
  // a window expire is not a test anybody would run twice.
  const T0 = RATE_LIMIT_WINDOW_MS; // start past 0 so the pruner's first sweep can fire

  test(`allows exactly ${RATE_LIMIT_MAX} requests in a window and blocks the next`, () => {
    for (let i = 0; i < RATE_LIMIT_MAX; i++) {
      const r = checkRateLimit("198.51.100.1", T0 + i);
      assert.equal(r.allowed, true, `request ${i + 1} should have been allowed`);
      assert.equal(r.retryAfterSec, 0);
    }
    const over = checkRateLimit("198.51.100.1", T0 + RATE_LIMIT_MAX);
    assert.equal(over.allowed, false);
  });

  test("the 429 names a Retry-After of the full window when the burst was instant", () => {
    for (let i = 0; i < RATE_LIMIT_MAX; i++) checkRateLimit("198.51.100.2", T0);
    const over = checkRateLimit("198.51.100.2", T0);
    assert.equal(over.allowed, false);
    assert.equal(over.retryAfterSec, RATE_LIMIT_WINDOW_MS / 1000);
  });

  // Rounded up and floored at 1, because telling a client "retry in 0
  // seconds" invites an immediate retry that is guaranteed to fail again.
  test("Retry-After is never 0 and is rounded up", () => {
    for (let i = 0; i < RATE_LIMIT_MAX; i++) checkRateLimit("198.51.100.3", T0);
    const almost = checkRateLimit("198.51.100.3", T0 + RATE_LIMIT_WINDOW_MS - 1);
    assert.equal(almost.allowed, false);
    assert.equal(almost.retryAfterSec, 1);
  });

  test("the window sliding open lets the caller through again", () => {
    for (let i = 0; i < RATE_LIMIT_MAX; i++) checkRateLimit("198.51.100.4", T0);
    assert.equal(checkRateLimit("198.51.100.4", T0).allowed, false);
    // One millisecond past the window, the whole burst has aged out.
    assert.equal(checkRateLimit("198.51.100.4", T0 + RATE_LIMIT_WINDOW_MS + 1).allowed, true);
  });

  // Sliding, not fixed: a burst at 09:59 must not get a fresh twenty at 10:00.
  // Half the window later only half the burst has expired, so the caller is
  // still blocked.
  test("the window slides rather than resetting on a boundary", () => {
    for (let i = 0; i < RATE_LIMIT_MAX; i++) checkRateLimit("198.51.100.5", T0 + i);
    const halfway = T0 + RATE_LIMIT_WINDOW_MS / 2;
    assert.equal(checkRateLimit("198.51.100.5", halfway).allowed, false);
  });

  test("two IPs do not share a budget", () => {
    for (let i = 0; i < RATE_LIMIT_MAX; i++) {
      assert.equal(checkRateLimit("198.51.100.6", T0 + i).allowed, true);
    }
    assert.equal(checkRateLimit("198.51.100.6", T0 + RATE_LIMIT_MAX).allowed, false);
    // A different address starts with its full allowance.
    assert.equal(checkRateLimit("198.51.100.7", T0 + RATE_LIMIT_MAX).allowed, true);
  });

  // Blocked attempts must not be recorded, or an attacker sitting on a 429
  // keeps pushing their own unlock time further away forever — and, worse, the
  // list they are extending would grow without bound.
  test("a blocked attempt is not recorded as a hit", () => {
    for (let i = 0; i < RATE_LIMIT_MAX; i++) checkRateLimit("198.51.100.8", T0);
    for (let i = 0; i < 500; i++) {
      assert.equal(checkRateLimit("198.51.100.8", T0 + i).allowed, false);
    }
    // Had those 500 been recorded, the unlock point would have moved with
    // them; because they were not, the original burst still ages out on time.
    assert.equal(checkRateLimit("198.51.100.8", T0 + RATE_LIMIT_WINDOW_MS + 1).allowed, true);
  });

  test("one IP's stored hits stay bounded by the limit", () => {
    for (let i = 0; i < RATE_LIMIT_MAX * 10; i++) checkRateLimit("198.51.100.9", T0 + i);
    // Nothing to read directly, so prove it behaviourally: if more than
    // RATE_LIMIT_MAX hits had accumulated, the caller would still be blocked a
    // full window after the last accepted one.
    assert.equal(checkRateLimit("198.51.100.9", T0 + RATE_LIMIT_WINDOW_MS * 2).allowed, true);
    assert.equal(rateLimitMapSize(), 1);
  });

  // The Map is the one thing in this design that could actually hurt the
  // process: an attacker rotating source addresses adds a key each time. The
  // pruner is what stops that, and it only runs once per window, so this test
  // has to walk the clock past a window boundary to see it fire.
  test("the Map does not grow without bound as IPs rotate", () => {
    for (let i = 0; i < 500; i++) checkRateLimit(`203.0.113.${i}`, T0);
    assert.equal(rateLimitMapSize(), 500);
    // A single call once everything has aged out sweeps all 500 away, leaving
    // only the caller that triggered the sweep.
    checkRateLimit("198.51.100.10", T0 + RATE_LIMIT_WINDOW_MS + 1);
    assert.equal(rateLimitMapSize(), 1);
  });

  test("the sweep keeps IPs that are still inside the window", () => {
    checkRateLimit("203.0.113.200", T0); // will age out
    checkRateLimit("203.0.113.201", T0 + RATE_LIMIT_WINDOW_MS); // still live
    checkRateLimit("198.51.100.11", T0 + RATE_LIMIT_WINDOW_MS + 1); // triggers the sweep
    assert.equal(rateLimitMapSize(), 2);
  });

  // The time-based sweep was the ONLY bound on the Map, and it fires at most
  // once per window and only removes what has already aged out — so every
  // address first seen inside the current window stayed. 200k distinct keys
  // inside one window produced a 200k-entry Map with no eviction, which is
  // the limiter's own state becoming the denial of service (the instance OOMs,
  // Vercel recycles it, and the O(n) sweep blocks the event loop on the way).
  // The hard ceiling is what actually caps it.
  test("the Map is hard-capped even when nothing has aged out", () => {
    const flood = MAX_TRACKED_KEYS + 2000;
    for (let i = 0; i < flood; i++) checkRateLimit(`key-${i}`, T0 + 1);
    assert.ok(
      rateLimitMapSize() <= MAX_TRACKED_KEYS,
      `Map grew to ${rateLimitMapSize()}, ceiling is ${MAX_TRACKED_KEYS}`
    );
  });

  // Eviction must not take the limiter offline: a caller recorded after the
  // ceiling was hit still has a working bucket.
  test("a caller seen after the ceiling is hit is still counted", () => {
    for (let i = 0; i < MAX_TRACKED_KEYS + 10; i++) checkRateLimit(`key-${i}`, T0 + 1);
    for (let i = 0; i < RATE_LIMIT_MAX; i++) {
      assert.equal(checkRateLimit("198.51.100.42", T0 + 2).allowed, true);
    }
    assert.equal(checkRateLimit("198.51.100.42", T0 + 2).allowed, false);
  });

  test("resetRateLimit clears the Map", () => {
    for (let i = 0; i < 5; i++) checkRateLimit(`192.0.2.${i}`, T0);
    assert.equal(rateLimitMapSize(), 5);
    resetRateLimit();
    assert.equal(rateLimitMapSize(), 0);
  });
});

describe("guardRequest — the rate limit", () => {
  test("returns 429 with a Retry-After header once the budget is spent", async () => {
    const headers = { "x-forwarded-for": "198.51.100.99" };
    for (let i = 0; i < RATE_LIMIT_MAX; i++) {
      assert.equal(guardRequest(post(headers)), null, `request ${i + 1} should have been allowed`);
    }
    const res = guardRequest(post(headers));
    assert.ok(res, "expected a 429 response, got null");
    assert.equal(res.status, 429);
    // The header has to be there and has to be a positive integer of seconds;
    // a client reading NaN would retry immediately.
    const retryAfter = res.headers.get("Retry-After");
    assert.ok(retryAfter, "Retry-After header is missing");
    assert.ok(Number.isInteger(Number(retryAfter)) && Number(retryAfter) > 0, `bad Retry-After: ${retryAfter}`);
    assert.deepEqual(await res.json(), { error: "rate limited" });
  });

  // The limit applies to authenticated callers too, on purpose: the secret
  // ships inside the APK and is extractable, so it cannot be the thing
  // standing between a stranger and the bill.
  test("a valid secret does not exempt a caller from the rate limit", () => {
    process.env.LANG_APP_SECRET = "right-secret";
    const headers = { [APP_SECRET_HEADER]: "right-secret", "x-forwarded-for": "198.51.100.98" };
    for (let i = 0; i < RATE_LIMIT_MAX; i++) assert.equal(guardRequest(post(headers)), null);
    assert.equal(guardRequest(post(headers))?.status, 429);
  });

  // The headline bypass, end to end. An attacker handed a routed /64 can send
  // every single request from a different source address without forging any
  // header at all, and before the key was normalized that meant an unlimited
  // budget: twenty per address, 2^64 addresses. Now the whole allocation
  // shares one bucket.
  test("rotating addresses inside one IPv6 /64 cannot exceed the limit", () => {
    let allowed = 0;
    for (let i = 0; i < RATE_LIMIT_MAX * 5; i++) {
      const res = guardRequest(post({ "x-forwarded-for": `2001:db8:1:1::${i.toString(16)}` }));
      if (res === null) allowed++;
    }
    assert.equal(allowed, RATE_LIMIT_MAX, `${allowed} requests got through, expected ${RATE_LIMIT_MAX}`);
  });

  test("a different /64 still gets its own allowance", () => {
    for (let i = 0; i < RATE_LIMIT_MAX; i++) guardRequest(post({ "x-forwarded-for": "2001:db8:1:1::1" }));
    assert.equal(guardRequest(post({ "x-forwarded-for": "2001:db8:1:1::2" }))?.status, 429);
    assert.equal(guardRequest(post({ "x-forwarded-for": "2001:db8:2:2::1" })), null);
  });

  // The forged-header bypass: 1000 rotating junk values used to be 1000
  // allowed requests, because each became its own Map key. They all share the
  // unparseable bucket now, so the 21st is refused like any other caller.
  test("rotating unparseable header values share one bucket", () => {
    let allowed = 0;
    for (let i = 0; i < 1000; i++) {
      if (guardRequest(post({ "x-forwarded-for": `9.9.9.9-${i}` })) === null) allowed++;
    }
    assert.equal(allowed, RATE_LIMIT_MAX);
  });

  test("one IP exhausting its budget does not block another", () => {
    const a = { "x-forwarded-for": "198.51.100.97" };
    for (let i = 0; i < RATE_LIMIT_MAX; i++) guardRequest(post(a));
    assert.equal(guardRequest(post(a))?.status, 429);
    assert.equal(guardRequest(post({ "x-forwarded-for": "198.51.100.96" })), null);
  });
});
