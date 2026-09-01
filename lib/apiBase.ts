// Empty string in the normal (Vercel/dev) build — fetches stay relative,
// hitting this same Next server's own /api/* routes, unchanged behaviour.
// The Capacitor static-export build sets NEXT_PUBLIC_API_BASE_URL at build
// time (see scripts/build-capacitor.sh) to the live deployed backend, since
// a packaged app has no server of its own to answer /api/chat locally —
// and never could, since those routes hold secret API keys that must never
// ship inside a client APK.
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
