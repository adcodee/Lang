// Empty stand-in for the `server-only` package, used ONLY by the test runner.
//
// Several modules under lib/ai start with `import "server-only"`, which is a
// real safety boundary (it makes the Next build fail loudly if server code is
// ever pulled into a client bundle) and must not be removed to make tests
// easier. But the published package is designed to EXPLODE when imported
// outside React Server Components: its default export condition throws. So a
// plain `tsx` process cannot import guard.ts / transcribe.ts / sanitize.ts at
// all without something standing in for it.
//
// That is this file. tests/server-only-shim.mjs points the specifier here.
// Note this stub is needed even once `server-only` is present in node_modules
// (it is declared by next but currently not installed locally) — the problem
// is the package throwing by design, not the package being absent. Do not
// delete the shim after an `npm install` appears to "fix" the resolution.
module.exports = {};
