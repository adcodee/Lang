/** @type {import('next').NextConfig} */
const isCapacitorBuild = process.env.CAPACITOR_BUILD === "1";

const nextConfig = {
  reactStrictMode: true,
  // Static export only for the Capacitor packaged-app build (see
  // scripts/build-capacitor.sh) — never for the normal Vercel/dev build,
  // which keeps its Next server (needed for /api/chat, /api/voice,
  // /api/transcribe; a static export can't contain server route handlers
  // that hold secret API keys at all).
  ...(isCapacitorBuild ? { output: "export" } : {}),
  webpack: (config, { isServer }) => {
    // @capacitor-community/text-to-speech has an unguarded top-level
    // `window` reference (see lib/speech.ts's comment) that crashes Next's
    // server-side render pass the moment anything imports it. Excluding it
    // from the *server* bundle only (client bundle is untouched) fixes
    // that at the build level, which lets lib/speech.ts use a normal
    // static top-level import instead of a dynamic import() — the dynamic
    // import was a real suspect for a separate on-device bug (a real
    // Capacitor+Next.js pattern: forcing a plugin into its own webpack
    // chunk can give it a disconnected copy of @capacitor/core's internal
    // registry, breaking the native bridge with "X.method() is not
    // implemented" even though the plugin registers fine at the native
    // Android level).
    if (isServer) {
      config.resolve.alias["@capacitor-community/text-to-speech"] = false;
    }
    return config;
  },
};

module.exports = nextConfig;
