import test, { describe } from "node:test";
import assert from "node:assert/strict";
import { apiErrorMessage } from "@/lib/apiBase";

// Tests for the client-side reading of a guarded /api/* response
// (lib/apiBase.ts).
//
// These exist because of a failure the security patch introduced and nearly
// shipped: not one of the six fetch call sites in this app looked at
// res.status. They all went straight to res.json(), which succeeds on an
// error body just as happily as on a tutor turn — so the rate limiter's 429
// was parsed as a turn, `spoken_ja` came out undefined, and the panel
// rendered a bare "…". No message, no cause, nothing in the UI naming the
// limit. And because the limiter runs even with LANG_APP_SECRET unset, that
// was reachable on the APK already installed on the owner's phone the moment
// a brisk text session crossed twenty messages in ten minutes.
//
// So what is pinned here is not the exact wording — it is that a non-OK
// response produces a message AT ALL, and that the message distinguishes
// "you are going too fast" from "this build is out of date".

function res(status: number, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify({ error: "nope" }), { status, headers });
}

describe("apiErrorMessage", () => {
  test("returns null for an OK response so the body is parsed as normal", () => {
    assert.equal(apiErrorMessage(new Response("{}", { status: 200 })), null);
  });

  test("names the rate limit on 429", () => {
    const msg = apiErrorMessage(res(429, { "Retry-After": "600" }));
    assert.ok(msg, "a 429 produced no message at all — this is the exact bug");
    assert.match(msg, /too many requests/i);
  });

  // Retry-After arrives in seconds; a user reading "wait 600" would have no
  // idea whether that is a long time.
  test("turns Retry-After seconds into minutes when it is a long wait", () => {
    assert.match(apiErrorMessage(res(429, { "Retry-After": "600" }))!, /10 minutes/);
    assert.match(apiErrorMessage(res(429, { "Retry-After": "60" }))!, /1 minute\b/);
    assert.match(apiErrorMessage(res(429, { "Retry-After": "90" }))!, /2 minutes/);
  });

  test("keeps a short wait in seconds", () => {
    assert.match(apiErrorMessage(res(429, { "Retry-After": "30" }))!, /30 seconds/);
  });

  // The header is not exposed to cross-origin JS unless middleware.ts says so
  // (it does), but an older deployment may not have that line yet and the APK
  // talks to whatever is live. "wait NaN and try again" must be impossible.
  test("degrades gracefully when Retry-After is missing or junk", () => {
    const cases: Array<Record<string, string>> = [
      {},
      { "Retry-After": "" },
      { "Retry-After": "soon" },
      { "Retry-After": "-5" },
    ];
    for (const headers of cases) {
      const msg = apiErrorMessage(res(429, headers))!;
      assert.ok(msg, "no message");
      assert.equal(/nan|undefined|null/i.test(msg), false, `unusable message: ${msg}`);
    }
  });

  // A 401 means the server has a LANG_APP_SECRET this build does not carry —
  // i.e. the APK needs rebuilding. That is actionable, and must not read as
  // the same problem as a rate limit.
  test("a 401 says the build is unauthorised, not that we are too fast", () => {
    const msg = apiErrorMessage(res(401))!;
    assert.ok(msg);
    assert.match(msg, /authoris|authoriz/i);
    assert.notEqual(msg, apiErrorMessage(res(429, { "Retry-After": "600" })));
  });

  test("any other failure still produces something rather than a silent '…'", () => {
    for (const status of [400, 413, 415, 500, 502]) {
      assert.ok(apiErrorMessage(res(status)), `status ${status} produced no message`);
    }
  });
});
