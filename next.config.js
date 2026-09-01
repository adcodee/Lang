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
};

module.exports = nextConfig;
