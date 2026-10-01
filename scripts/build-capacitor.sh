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

# Shared secret for the four AI endpoints, read from the environment and
# baked into this APK build only (lib/apiBase.ts -> the x-lang-app-secret
# header -> lib/ai/guard.ts on the server). It must match whatever
# LANG_APP_SECRET is set to in the Vercel project.
#
# *** NEVER PUT A VALUE IN THIS FILE *** This is a public repo and
# NEXT_PUBLIC_* variables are inlined into the JS bundle, so a value written
# here would be committed AND shipped. Pass it in for the one build:
#   NEXT_PUBLIC_LANG_APP_SECRET='...' ./scripts/build-capacitor.sh
#
# *** AND NEVER SET NEXT_PUBLIC_LANG_APP_SECRET IN THE VERCEL PROJECT ***
# Only LANG_APP_SECRET (no NEXT_PUBLIC_ prefix) goes in Vercel. The prefixed
# name is inlined into the bundle the public web deploy serves, so setting it
# there publishes the shared secret to every visitor and the gate stops
# protecting anything. The reason it is tempting: once LANG_APP_SECRET is set
# in Vercel, the browser web app starts returning 401 on the AI endpoints
# because it sends no secret (see the long note in lib/apiBase.ts). That is
# expected and accepted — the APK is the client that gets the secret. Losing
# the AI features on the web deploy is the price; publishing the secret would
# be giving up the whole thing to get them back.
# The :- default matters: `set -u` is on, so an unguarded reference to an
# unset variable would abort the whole build.
APP_SECRET="${NEXT_PUBLIC_LANG_APP_SECRET:-}"
if [ -z "$APP_SECRET" ]; then
  echo "==> WARNING: NEXT_PUBLIC_LANG_APP_SECRET is not set."
  echo "    The APK will be built WITHOUT the shared secret. It works fine"
  echo "    against a server that has no LANG_APP_SECRET configured, but the"
  echo "    moment that variable is set in Vercel this APK's AI calls will all"
  echo "    be rejected with 401 and the tutor will stop answering on the phone."
  echo "    Re-run with NEXT_PUBLIC_LANG_APP_SECRET set to the same value."
else
  echo "==> Shared secret present; APK will send the x-lang-app-secret header"
fi

echo "==> Building static export (API base: $LANG_API_BASE_URL)"
rm -rf .next out
CAPACITOR_BUILD=1 \
  NEXT_PUBLIC_API_BASE_URL="$LANG_API_BASE_URL" \
  NEXT_PUBLIC_LANG_APP_SECRET="$APP_SECRET" \
  npm run build

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
