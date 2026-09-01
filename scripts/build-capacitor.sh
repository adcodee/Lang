#!/usr/bin/env bash
# Builds the Capacitor-packaged Android debug APK.
#
# The web app itself keeps running on Vercel unchanged (full Next server,
# /api/chat + /api/voice + /api/transcribe live there, hold the real API
# keys). This script produces a separate, static "shell" build for the
# packaged app: same lesson/dojo/exam/rank UI, but the three AI-tutor
# endpoints are called against the live Vercel deployment over the network
# instead of a local server, since a static export can't and shouldn't
# contain routes holding secret keys. See lib/apiBase.ts,
# lib/capacitorBuild.ts, and next.config.js for how that's gated.
#
# Everything else (skill tree, lessons, dojo, rank, spaced repetition) is
# fully local/offline via localStorage, same as the web app today.
set -euo pipefail
cd "$(dirname "$0")/.."

: "${ANDROID_HOME:=$HOME/Android/Sdk}"
export ANDROID_HOME
export ANDROID_SDK_ROOT="$ANDROID_HOME"

# Capacitor 8's Android Gradle Plugin requires JDK 21 to compile — the
# system default is JDK 17 (used everywhere else on this machine, left
# untouched). Point Gradle at a JDK 21 installed via mise just for this
# build, without changing global JAVA_HOME/mise config.
: "${CAPACITOR_JAVA_HOME:=$HOME/.local/share/mise/installs/java/21.0.2}"
export JAVA_HOME="$CAPACITOR_JAVA_HOME"
export PATH="$JAVA_HOME/bin:$PATH"

: "${LANG_API_BASE_URL:=https://lang-rouge.vercel.app}"

echo "==> Building static export (API base: $LANG_API_BASE_URL)"
rm -rf .next out
CAPACITOR_BUILD=1 NEXT_PUBLIC_API_BASE_URL="$LANG_API_BASE_URL" npm run build

echo "==> Syncing into the Android project"
npx cap sync android

echo "==> Building debug APK"
(cd android && ./gradlew assembleDebug)

APK="android/app/build/outputs/apk/debug/app-debug.apk"
if [ -f "$APK" ]; then
  echo "==> Done: $APK"
else
  echo "==> Gradle reported success but the expected APK wasn't found at $APK" >&2
  exit 1
fi
