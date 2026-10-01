import test, { beforeEach, describe } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";

// Tests for the CORS layer (middleware.ts).
//
// CORS is not what protects these routes — curl ignores it entirely, as the
// original debugging session proved, and the shared secret plus the rate limit
// in lib/ai/guard.ts are the real gate. What middleware.ts actually controls is
// whether the owner's APK can talk to his own deployment at all, and the way it
// fails is genuinely nasty: a browser rejects the preflight, the real POST is
// never sent, nothing appears in any server log or provider dashboard, and the
// app just looks broken. That failure mode has already cost this project one
// whole debugging session.
//
// So these tests exist to keep the generous parts generous. The headline one is
// that x-lang-app-secret stays in Access-Control-Allow-Headers: adding a custom
// request header is what makes a request non-simple, so forgetting to name it
// here would silently kill every AI call from the phone.

beforeEach(() => {
  delete process.env.LANG_ALLOWED_ORIGIN;
});

function request(
  method: string,
  headers: Record<string, string> = {},
  url = "https://lang-rouge.vercel.app/api/chat"
): NextRequest {
  return new NextRequest(url, { method, headers });
}

describe("preflight", () => {
  test("answers OPTIONS with a real 204 CORS response, not Next's bare Allow", () => {
    const res = middleware(request("OPTIONS", { origin: "https://localhost" }));
    assert.equal(res.status, 204);
    // All four must be present. Next's default for a route with no OPTIONS
    // export is a 204 with only `Allow`, which is not a CORS response at all
    // and is exactly the silent-failure case this file exists to prevent.
    assert.equal(res.headers.get("Access-Control-Allow-Origin"), "https://localhost");
    assert.ok(res.headers.get("Access-Control-Allow-Methods")?.includes("POST"));
    assert.ok(res.headers.get("Access-Control-Allow-Headers"));
    assert.equal(res.headers.get("Vary"), "Origin");
  });

  // *** The single most load-bearing assertion in this file. ***
  // The secret travels in a custom request header, which triggers a preflight;
  // if the header is not named here the browser rejects that preflight and the
  // POST never happens. Content-Type has to stay too, or every JSON POST
  // breaks instead — same symptom, opposite cause.
  test("Access-Control-Allow-Headers names both the secret header and Content-Type", () => {
    const allow = middleware(request("OPTIONS", { origin: "https://localhost" })).headers.get(
      "Access-Control-Allow-Headers"
    );
    assert.ok(allow, "Access-Control-Allow-Headers is missing entirely");
    const named = allow.toLowerCase();
    assert.ok(named.includes("x-lang-app-secret"), `secret header not allowed: ${allow}`);
    assert.ok(named.includes("content-type"), `Content-Type not allowed: ${allow}`);
  });

  // Retry-After is not in the short list of response headers CORS hands to
  // cross-origin JS by default, so without this the APK receives the rate
  // limiter's 429 but reads null for the header and can only say "wait a
  // minute" when the real answer is ten.
  test("Retry-After is exposed so the APK can read it off a 429", () => {
    for (const method of ["OPTIONS", "POST"]) {
      const expose = middleware(request(method, { origin: "https://localhost" })).headers.get(
        "Access-Control-Expose-Headers"
      );
      assert.ok(expose, `Access-Control-Expose-Headers missing on ${method}`);
      assert.ok(expose.toLowerCase().includes("retry-after"), `Retry-After not exposed: ${expose}`);
    }
  });

  test("a POST gets the same CORS headers attached to the pass-through response", () => {
    const res = middleware(request("POST", { origin: "https://localhost" }));
    assert.equal(res.headers.get("Access-Control-Allow-Origin"), "https://localhost");
    assert.equal(res.headers.get("Vary"), "Origin");
  });
});

describe("allowed origins", () => {
  // Capacitor 8 defaults to androidScheme "https" + hostname "localhost", so
  // the WebView's origin is https://localhost — but other configurations use
  // http://, capacitor:// or ionic://, and `next dev` is http://localhost:3000.
  // All are accepted on purpose rather than guessing which one a given APK
  // build reports, because guessing wrong means the owner's phone silently
  // loses every AI feature.
  const localhostOrigins = [
    "https://localhost",
    "http://localhost",
    "http://localhost:3000",
    "https://localhost:8100",
    "capacitor://localhost",
    "ionic://localhost",
    "http://127.0.0.1",
    "http://127.0.0.1:3000",
  ];

  for (const origin of localhostOrigins) {
    test(`echoes back ${origin}`, () => {
      const res = middleware(request("OPTIONS", { origin }));
      assert.equal(res.headers.get("Access-Control-Allow-Origin"), origin);
    });
  }

  test("echoes back LANG_ALLOWED_ORIGIN when it is configured and matches", () => {
    process.env.LANG_ALLOWED_ORIGIN = "https://lang.example.com";
    const res = middleware(request("OPTIONS", { origin: "https://lang.example.com" }));
    assert.equal(res.headers.get("Access-Control-Allow-Origin"), "https://lang.example.com");
  });

  test("tolerates whitespace around LANG_ALLOWED_ORIGIN", () => {
    process.env.LANG_ALLOWED_ORIGIN = "  https://lang.example.com  ";
    const res = middleware(request("OPTIONS", { origin: "https://lang.example.com" }));
    assert.equal(res.headers.get("Access-Control-Allow-Origin"), "https://lang.example.com");
  });

  // An unset escape hatch must not become a wildcard. If the empty string were
  // compared without the length check, a caller sending `Origin: ` would match.
  test("an unset LANG_ALLOWED_ORIGIN does not allow an empty origin", () => {
    const res = middleware(request("OPTIONS", { origin: "" }));
    assert.notEqual(res.headers.get("Access-Control-Allow-Origin"), "");
  });
});

describe("refused origins", () => {
  // A refusal is expressed the CORS way: echo back a value the calling page
  // cannot possibly match — this deployment's own origin — rather than `*`,
  // which is what the header used to be.
  const strangers = [
    "https://evil.example.com",
    "https://lang-rouge.vercel.app.evil.com",
    "https://notlocalhost",
    "https://localhost.evil.com", // hostname is localhost.evil.com, not localhost
    "https://sub.localhost", // likewise: the check is an exact hostname match
    "http://127.0.0.1.evil.com",
  ];

  for (const origin of strangers) {
    test(`does not echo back ${origin}`, () => {
      const res = middleware(
        request("OPTIONS", { origin, host: "lang-rouge.vercel.app", "x-forwarded-proto": "https" })
      );
      const allowed = res.headers.get("Access-Control-Allow-Origin");
      assert.notEqual(allowed, origin, `stranger origin was allowed: ${origin}`);
      assert.notEqual(allowed, "*", "the wildcard is back; that is the hole this closed");
      assert.equal(allowed, "https://lang-rouge.vercel.app");
    });
  }

  test("never answers with the wildcard, even with no Origin header at all", () => {
    const res = middleware(request("POST", { host: "lang-rouge.vercel.app" }));
    assert.notEqual(res.headers.get("Access-Control-Allow-Origin"), "*");
  });
});

describe("the fallback origin is built from the forwarded headers", () => {
  // Deliberately not request.nextUrl.origin: behind Vercel's proxy that can
  // report the internal origin rather than the public one, and a value that
  // matches nothing public would be a refusal by accident rather than by
  // design.
  test("prefers x-forwarded-host over host", () => {
    const res = middleware(
      request("POST", {
        origin: "https://evil.example.com",
        host: "internal-vercel-host.local",
        "x-forwarded-host": "lang-rouge.vercel.app",
        "x-forwarded-proto": "https",
      })
    );
    assert.equal(res.headers.get("Access-Control-Allow-Origin"), "https://lang-rouge.vercel.app");
  });

  test("honours x-forwarded-proto", () => {
    const res = middleware(
      request("POST", {
        origin: "https://evil.example.com",
        host: "localhost:3000",
        "x-forwarded-proto": "http",
      })
    );
    assert.equal(res.headers.get("Access-Control-Allow-Origin"), "http://localhost:3000");
  });

  test("falls back to the literal string 'null' when there is no host at all", () => {
    // Never the empty string: an empty Access-Control-Allow-Origin is a
    // malformed header rather than a refusal.
    const res = middleware(request("POST", { origin: "https://evil.example.com" }));
    assert.equal(res.headers.get("Access-Control-Allow-Origin"), "null");
  });
});

describe("a malformed Origin header cannot take the API down", () => {
  // `new URL()` throws on junk, and a stranger can put anything in this
  // header. An unguarded throw inside middleware would 500 EVERY request to
  // /api/* — a trivial denial of service on all four AI routes, triggered by
  // one bad header. Hence the try/catch in isLocalhostOrigin().
  const junk = [
    "not a url",
    "://",
    "http://",
    "localhost",
    "https://[",
    "%%%",
    " ",
    "\\\\localhost",
    "javascript:alert(1)",
    "a".repeat(5000),
  ];

  for (const origin of junk) {
    test(`survives Origin: ${JSON.stringify(origin.slice(0, 24))}`, () => {
      assert.doesNotThrow(() => {
        const res = middleware(
          request("POST", { origin, host: "lang-rouge.vercel.app", "x-forwarded-proto": "https" })
        );
        assert.equal(res.headers.get("Access-Control-Allow-Origin"), "https://lang-rouge.vercel.app");
      });
    });
  }
});
