// Node module-resolution hook that redirects `server-only` to an empty stub.
//
// Why this exists: lib/ai/guard.ts, lib/ai/transcribe.ts and lib/ai/sanitize.ts
// all begin with `import "server-only"` — a deliberate guard that makes the
// build fail if that code is ever dragged into a client bundle. Weakening or
// deleting those imports to get the pure functions under test would trade a
// real safety property for test convenience, so instead the RUNNER lies about
// one module specifier and the source stays exactly as it ships.
//
// Written in .mjs rather than .ts on purpose: `registerHooks` arrived in Node
// 22.15 and this repo is on @types/node 20, so a TypeScript version of this
// file would fail `npx tsc --noEmit` — which is the very check the test suite
// is supposed to keep green.
//
// Wired up by the "test" script in package.json, which package.json cannot
// carry a comment explaining, so: the script is
//
//   tsx --import ./tests/server-only-shim.mjs --test tests/*.test.ts
//
// and the --import has to come BEFORE --test. Node's test runner spawns one
// child process per test file, and those children inherit the parent's
// execArgv — which is how this hook reaches the code under test at all rather
// than only the runner process. Moving the flag after --test, or dropping it,
// gives "Cannot find module 'server-only'" on every file.
import { registerHooks } from "node:module";
import { fileURLToPath } from "node:url";

const stub = fileURLToPath(new URL("./stubs/server-only.js", import.meta.url));

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") return nextResolve(stub, context);
    return nextResolve(specifier, context);
  },
});
