#!/usr/bin/env bash
# Install the debug APK on the Samsung A15.
#
# Prefers wireless adb over Tailscale (adules-a15, 100.92.130.111:5555).
# Falls back to USB if the phone is plugged into this machine.
# TCP mode is enabled with `adb tcpip 5555` while USB is connected; it
# lasts until the phone reboots. After a reboot, plug in USB once and
# run this script — it will re-enable TCP if it sees the cable.
set -euo pipefail
cd "$(dirname "$0")/.."

TS_SERIAL="${A15_TS_SERIAL:-100.92.130.111:5555}"
USB_SERIAL="${A15_USB_SERIAL:-R58X30PB3BY}"
APK="${1:-android/app/build/outputs/apk/debug/app-debug.apk}"

if [ ! -f "$APK" ]; then
  echo "No APK at $APK — build first with scripts/build-capacitor.sh" >&2
  exit 1
fi

adb start-server >/dev/null

# If USB is present, (re)arm TCP mode so later wireless installs work.
if adb devices -l | grep -q "${USB_SERIAL}.*usb:"; then
  echo "==> USB attached; enabling TCP adb on 5555"
  adb -s "$USB_SERIAL" tcpip 5555 >/dev/null
  sleep 2
fi

echo "==> Connecting wireless $TS_SERIAL"
if ! timeout 8 adb connect "$TS_SERIAL" >/dev/null; then
  echo "    wireless connect timed out"
fi

SERIAL=""
if adb devices | awk '{print $1}' | grep -qx "$TS_SERIAL"; then
  SERIAL="$TS_SERIAL"
  echo "==> Using wireless $SERIAL"
elif adb devices | awk '{print $1}' | grep -qx "$USB_SERIAL"; then
  SERIAL="$USB_SERIAL"
  echo "==> Using USB $SERIAL"
else
  echo "A15 not on adb. Plug in USB once, or keep Tailscale up after tcpip 5555." >&2
  adb devices -l >&2
  exit 1
fi

echo "==> Installing $APK"
adb -s "$SERIAL" install -r "$APK"
adb -s "$SERIAL" shell am start -n com.langapp.lang/.MainActivity >/dev/null
echo "==> Done ($SERIAL) pid=$(adb -s "$SERIAL" shell pidof com.langapp.lang | tr -d '\r')"
