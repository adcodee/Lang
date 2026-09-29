"use client";

import { Capacitor } from "@capacitor/core";
import { TextToSpeech, QueueStrategy } from "@capacitor-community/text-to-speech";
import { SpeechRecognition } from "@capacitor-community/speech-recognition";

// Thin wrappers around the browser Web Speech API used by the voice tutor.
// These power the STT/TTS for the Grok voice flow when no real key is wired up,
// and remain useful for capturing the learner's speech regardless.
//
// TTS specifically needs a second path for the packaged Android app: a
// WebView's window.speechSynthesis exists and calls succeed (no error, onend
// still fires) but produces no audible output at all on-device — there's no
// system TTS voice bridged into the WebView the way a real Chrome tab gets
// one. Confirmed via real on-device testing (lang-debug.apk on a Galaxy
// A15), not just suspected. speak()/primeSpeech() below branch on
// Capacitor.isNativePlatform() to a real native TTS engine call instead;
// the web path (Vercel) is untouched.
//
// This is a plain static top-level import, deliberately — a dynamic
// import() was tried first (to dodge this package's unguarded top-level
// `window` reference, which otherwise crashes Next's SSR the instant
// anything imports it) but that introduced a real on-device bug of its
// own: forcing this plugin into its own webpack chunk gave it a
// disconnected copy of @capacitor/core's plugin registry, so calls never
// reached the real native bridge ("TextToSpeech.then() is not implemented
// on android", even though the plugin registers fine natively — confirmed
// via logcat). The SSR crash is fixed at the build-config level instead —
// see next.config.js's webpack() aliasing this package to `false` on the
// server bundle only, leaving the client bundle a single normal chunk.

// Minimal typings for the (non-standard) SpeechRecognition API.
interface SpeechRecognitionResultLike {
  0: { transcript: string };
  isFinal: boolean;
}
interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: unknown) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function speechSupported(): boolean {
  return getRecognitionCtor() !== null;
}

// Listen for a single utterance, resolving with the final transcript.
export function listenOnce(lang = "ja-JP"): {
  promise: Promise<string>;
  stop: () => void;
} {
  const Ctor = getRecognitionCtor();
  if (!Ctor) {
    return {
      promise: Promise.reject(new Error("SpeechRecognition not supported")),
      stop: () => {},
    };
  }
  const recog = new Ctor();
  recog.lang = lang;
  recog.interimResults = false;
  recog.continuous = false;

  let resolved = false;
  const promise = new Promise<string>((resolve, reject) => {
    recog.onresult = (e) => {
      const transcript = e.results[0]?.[0]?.transcript ?? "";
      resolved = true;
      resolve(transcript);
    };
    recog.onerror = (e) => reject(e);
    recog.onend = () => {
      if (!resolved) resolve("");
    };
    recog.start();
  });

  return { promise, stop: () => recog.stop() };
}

// --- native speech recognition (packaged Android app) -----------------------
//
// The Web Speech API's SpeechRecognition does not exist in an Android
// WebView at all — it is a Chrome-browser feature backed by Google's speech
// service, not a WebView one. Verified on-device rather than assumed: the app
// already holds RECORD_AUDIO (granted=true in dumpsys) and XAI_API_KEY is set
// in production, yet no request ever reached /api/transcribe. The cloud
// fallback could not fire either, because getUserMedia inside a WebView needs
// the host app to answer WebChromeClient.onPermissionRequest — a SECOND gate,
// separate from the OS permission — and nothing was answering it. So every
// speaking surface silently dropped to typing.
//
// Same shape of problem, and same fix, as the TTS note at the top of this
// file: go around the WebView to a real native engine. Static top-level
// import for the reason documented up there — a dynamic import() hands the
// plugin a disconnected copy of the Capacitor registry and its calls never
// reach the bridge.

export function nativeSpeechPlatform(): boolean {
  return Capacitor.isNativePlatform();
}

// Whether the device actually has a recognition engine AND we hold the mic
// permission. Asks for the permission if we do not — the OS grant is not
// implied by the manifest entry on Android 6+.
export async function nativeSpeechReady(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const { available } = await SpeechRecognition.available();
    if (!available) return false;
    let perm = await SpeechRecognition.checkPermissions();
    if (perm.speechRecognition !== "granted") {
      perm = await SpeechRecognition.requestPermissions();
    }
    return perm.speechRecognition === "granted";
  } catch {
    return false;
  }
}

// One utterance via the device's own recogniser. Mirrors listenOnce()'s shape
// so SpeakInput can treat the two tiers identically.
// How long to wait for an attempt to produce anything before giving up on it.
// Not a nicety: asking for EXTRA_PREFER_OFFLINE with no on-device model for
// the language makes this device's speech service drop the binding WITHOUT
// ever invoking the callback — confirmed in logcat on a Galaxy A15:
//   "Connection to speech recognition service lost, but no #startListening
//    has been invoked yet."
// and then silence. A try/catch cannot rescue that, because nothing rejects;
// the promise simply never settles and the UI hangs on "listening". Every
// call across this bridge needs a deadline, not just an error handler.
const OFFLINE_PROBE_MS = 3_000; // just long enough to bind and start
const ONLINE_LISTEN_MS = 15_000; // generous: the learner has to speak

function withDeadline<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = window.setTimeout(
      () => reject(new Error(`speech: ${label} timed out after ${ms}ms`)),
      ms
    );
    p.then(
      (v) => {
        window.clearTimeout(t);
        resolve(v);
      },
      (e) => {
        window.clearTimeout(t);
        reject(e);
      }
    );
  });
}

// Whether to try the on-device model before the network one.
//
// FINDING (Galaxy A15, Android 16, 2026-09-29): offline recognition is not
// reachable by third-party apps on this device, and no amount of client code
// changes that. Android System Intelligence (com.google.android.as) is listed
// as a RecognitionService, and the patched plugin binds it correctly via
// createOnDeviceSpeechRecognizer — but the service drops the connection
// without ever invoking the callback. Not only for recognition: even
// checkRecognitionSupport(), which records nothing and merely asks which
// languages are installed, gets the same treatment:
//   "Connection to speech recognition service lost, but no #startListening
//    has been invoked yet."
// The 日本語 pack the device lists under "offline speech recognition" belongs
// to the Google app's own voice typing, which does not go through
// RecognitionService and cannot be reached from here.
//
// So the plumbing stays (it is correct, and works wherever the on-device
// engine actually serves callers), but it activates only on a positive
// support result. On this device that never arrives, so speaking practice
// uses the network — which is confirmed working.
// Starts OFF and is only ever switched on by a POSITIVE support result.
// It was briefly defaulted to true, which is what kept the UI hanging: the
// app attempted offline on every tap, the on-device service dropped the
// binding without calling back, and the learner waited out the deadline
// before the network retry even started. Opt in on proof, never on hope.
let tryOfflineFirst = false;

// --- offline model availability --------------------------------------------
//
// Speaking exercises work over the network, but the whole point of the dojo
// is that it works on a plane. That needs the language's on-device model,
// which the LEARNER installs — the app cannot do it for them. So the app has
// to (a) know whether it is there and (b) say so, rather than silently being
// slower and network-dependent forever.
//
// A probe OPENS THE MIC, so it is never run automatically on mount — that
// would flash the system mic indicator at a learner who only opened a lesson.
// It runs at most once per session, only when the learner asks for it (or as
// a side effect of a real recognition attempt), and the result is cached.

// "claimed" is the state this device sits in: checkRecognitionSupport() says
// the language IS installed on-device, and recognition with it still fails.
// So a support result can never promote us past `claimed` — only a real,
// successful offline transcription earns "available". The notice keeps
// showing while claimed, because from the learner's side it does not work.
export type OfflineSpeechState =
  | "unknown"
  | "checking"
  | "available" // proven: a real offline transcription came back
  | "claimed" // engine says the language is installed, unproven in practice
  | "missing";

let offlineState: OfflineSpeechState = "unknown";
let offlineProbe: Promise<OfflineSpeechState> | null = null;
let lastOfflineReason = "";

// Why offline is unavailable, for the notice and for debugging.
export function offlineSpeechReason(): string {
  return lastOfflineReason;
}

export function offlineSpeechState(): OfflineSpeechState {
  return offlineState;
}

// Resolves whether on-device recognition works for `lang`. Safe to call from
// several components — they share one probe.
export function checkOfflineSpeech(lang = "ja-JP"): Promise<OfflineSpeechState> {
  if (
    offlineState === "available" ||
    offlineState === "claimed" ||
    offlineState === "missing"
  ) {
    return Promise.resolve(offlineState);
  }
  if (offlineProbe) return offlineProbe;
  if (!Capacitor.isNativePlatform()) {
    offlineState = "missing";
    return Promise.resolve(offlineState);
  }

  offlineState = "checking";
  offlineProbe = (async () => {
    try {
      // Ask the on-device engine what it can serve. This does NOT open the
      // mic — it is Android 13's checkRecognitionSupport, surfaced by our
      // patch as onDeviceSupport(). The previous version started a real
      // recognition just to see if it bound, which flashed the system mic
      // indicator and could not distinguish "no model" from "heard nothing".
      const api = SpeechRecognition as unknown as {
        onDeviceSupport?: (o: { language: string }) => Promise<{
          supported: boolean;
          installed?: string[];
          reason?: string;
        }>;
      };
      if (!api.onDeviceSupport) {
        offlineState = "missing";
      } else {
        const r = await withDeadline(
          api.onDeviceSupport({ language: lang }),
          OFFLINE_PROBE_MS,
          "offline-support"
        );
        // `supported` is true only when the language is actually INSTALLED
        // on-device — a language the engine merely knows about, but has not
        // downloaded, cannot transcribe anything.
        // Deliberately NOT "available" — see the type comment. The engine
        // reporting the language as installed is a claim, not a capability.
        offlineState = r.supported ? "claimed" : "missing";
        lastOfflineReason = r.supported
          ? "the device reports Japanese as installed but will not transcribe with it"
          : r.reason ?? "language not installed on-device";
      }
    } catch (e) {
      offlineState = "missing";
      lastOfflineReason = e instanceof Error ? e.message : "probe failed";
    }
    // Always false here, and tsc proves it: the support query can only yield
    // "claimed" or "missing", never "available". Offline is enabled in exactly
    // one place — listenOnceNative, after a real transcription comes back.
    tryOfflineFirst = false;
    return offlineState;
  })();
  return offlineProbe;
}

// Opens the system screen where on-device speech models are downloaded.
// Verified on-device (Galaxy A15): the generic VOICE_INPUT_SETTINGS intent
// lands on the digital-assistant page instead, and Gboard's settings activity
// no longer exists under its documented name, so neither is usable here.
export const OFFLINE_PACK_HINT =
  "Settings → open Speech Services by Google → download 日本語";

export function listenOnceNative(lang = "ja-JP"): {
  promise: Promise<string>;
  stop: () => void;
} {
  const run = (preferOffline: boolean) =>
    // partialResults/popup off: we want one final transcript, and the Android
    // popup would cover the exercise card the learner is answering.
    SpeechRecognition.start({
      language: lang,
      maxResults: 3,
      partialResults: false,
      popup: false,
      // Not in the plugin's published types — added by our patch. See
      // patches/@capacitor-community+speech-recognition+7.0.1.patch.
      preferOffline,
    } as Parameters<typeof SpeechRecognition.start>[0]);

  const promise = (async () => {
    if (tryOfflineFirst) {
      try {
        const offline = await withDeadline(run(true), OFFLINE_PROBE_MS, "offline");
        const hit = offline?.matches?.[0];
        if (hit) {
          // Proof, at last: offline actually produced a transcript.
          offlineState = "available";
          return hit;
        }
      } catch {
        // No on-device model, or the service dropped the binding. Make sure
        // the stalled session is torn down before starting another one —
        // leaving it open is what produced "Client has opened 2 sessions".
        try {
          await SpeechRecognition.stop();
        } catch {
          /* nothing to stop */
        }
      }
    }
    const online = await withDeadline(run(false), ONLINE_LISTEN_MS, "online");
    return online?.matches?.[0] ?? "";
  })();

  return {
    promise,
    stop: () => {
      SpeechRecognition.stop().catch(() => {
        /* already stopped */
      });
    },
  };
}

// Lenient comparison of a speech-recognition transcript against a target
// phrase. Used to grade speaking exercises locally (no API). Strips spaces and
// punctuation, lowercases, then accepts on exact match (against the target or
// any `accept` alternative) or high character overlap — recognition is noisy,
// so we err toward encouraging the learner.
export function matchesSpoken(
  transcript: string,
  target: string,
  accept: string[] = []
): boolean {
  const clean = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFKC")
      .replace(/[\s。、．，.,!！?？「」『』・ー〜~…]/g, "");

  const got = clean(transcript);
  if (!got) return false;

  const candidates = [target, ...accept].map(clean).filter(Boolean);
  if (candidates.includes(got)) return true;

  // Fall back to overlap: did we hear most of an expected phrase (or vice
  // versa)? Helps when recognition adds/drops a trailing sound.
  return candidates.some((c) => {
    const [short, long] = got.length <= c.length ? [got, c] : [c, got];
    if (short.length === 0) return false;
    let hits = 0;
    for (const ch of short) if (long.includes(ch)) hits++;
    return hits / short.length >= 0.6;
  });
}

// Voices load asynchronously; cache them and refresh on `voiceschanged` so the
// first spoken character doesn't have to wait for the list to populate (a big
// cause of the "Hear it" lag).
let voiceCache: SpeechSynthesisVoice[] = [];
function refreshVoices() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  const v = window.speechSynthesis.getVoices();
  if (v.length) voiceCache = v;
}
if (typeof window !== "undefined" && window.speechSynthesis) {
  refreshVoices();
  window.speechSynthesis.addEventListener?.("voiceschanged", refreshVoices);
}

// Warm the TTS engine + voice list within a user gesture (call on the first tap)
// so the first real utterance plays promptly instead of cold-starting.
export function primeSpeech() {
  if (Capacitor.isNativePlatform()) return; // native TTS has no equivalent cold-start to warm
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  refreshVoices();
  try {
    const warm = new SpeechSynthesisUtterance(" ");
    warm.volume = 0;
    window.speechSynthesis.speak(warm);
  } catch {
    /* ignore — warming up is best-effort */
  }
}

// Native voice list is a different shape/source (Android's TTS engine, via
// the plugin) from window.speechSynthesis's — cached separately, fetched
// once on first use rather than eagerly (unlike refreshVoices() above,
// there's no native "voiceschanged" event to hook).
let nativeVoiceIndexCache: number | null | undefined; // undefined = not looked up yet
async function pickNativeJapaneseVoiceIndex(): Promise<number | undefined> {
  if (nativeVoiceIndexCache !== undefined) return nativeVoiceIndexCache ?? undefined;
  try {
    const { voices } = await TextToSpeech.getSupportedVoices();
    const idx = voices.findIndex((v) => v.lang?.toLowerCase().startsWith("ja"));
    nativeVoiceIndexCache = idx >= 0 ? idx : null;
  } catch {
    nativeVoiceIndexCache = null;
  }
  return nativeVoiceIndexCache ?? undefined;
}

function pickJapaneseVoice(): SpeechSynthesisVoice | undefined {
  if (!voiceCache.length) refreshVoices();
  return voiceCache.find(
    (v) => v.lang?.toLowerCase().startsWith("ja") || v.lang?.includes("JP")
  );
}

// Speak text aloud. Uses a cached Japanese voice when available. `onEnd` fires
// when the utterance finishes (or errors, or if TTS is unavailable) so a
// hands-free conversation loop knows when to re-open the mic.
//
// Engines clip the first phoneme when speak() follows cancel() immediately —
// fatal for single kana, where ご/こ differ only in the opening consonant. So
// the utterance is padded with a leading pause (、) and scheduled a beat after
// the cancel; a pending-speak handle keeps rapid calls from double-speaking.
let pendingSpeak: number | null = null;

// Bumped on every native speak() call; a call whose generation has moved on
// by the time its post-stop delay elapses was superseded by a later tap and
// must not also play — see the native branch below.
let nativeSpeakGen = 0;

export function speak(text: string, lang = "ja-JP", onEnd?: () => void) {
  if (Capacitor.isNativePlatform()) {
    // Turns out this engine has the SAME clipped-first-phoneme quirk as the
    // Web Speech API above (confirmed on-device, Galaxy A15: が/ば/か coming
    // out wrong) — the plugin's own Android source calls tts.stop() then
    // tts.speak() back to back with zero gap whenever queueStrategy is Flush
    // (our default), which is exactly the "cancel immediately before speak"
    // pattern that clips the onset elsewhere. が/ば/か are all plosives
    // (/g/,/b/,/k/) — a plosive's identity is its release burst, so clipping
    // the onset is what breaks all three, not a voiced/unvoiced thing (か is
    // already unvoiced). Vowels/nasals/fricatives (あ/な/さ) survive it,
    // which is why only some sounds showed the bug. Same fix as web: stop
    // explicitly, give the engine a beat, then speak a lead-pause-padded
    // utterance with queueStrategy Add so the plugin doesn't re-issue its own
    // zero-gap stop() — and a generation guard (mirrors pendingSpeak below)
    // so two taps inside that beat don't both end up playing.
    const gen = ++nativeSpeakGen;
    (async () => {
      try {
        const voice = await pickNativeJapaneseVoiceIndex();
        try {
          await TextToSpeech.stop();
        } catch {
          /* ignore — best-effort settle before speaking */
        }
        await new Promise((resolve) => window.setTimeout(resolve, 90));
        if (gen !== nativeSpeakGen) return; // superseded by a later call
        await TextToSpeech.speak({
          text: `、${text}`,
          lang,
          voice,
          queueStrategy: QueueStrategy.Add,
        });
      } catch (err) {
        console.error("[speech] native speak() failed:", err);
      } finally {
        onEnd?.();
      }
    })();
    return;
  }

  if (typeof window === "undefined" || !window.speechSynthesis) {
    onEnd?.();
    return;
  }
  const utter = new SpeechSynthesisUtterance(`、${text}`);
  utter.lang = lang;
  const jaVoice = pickJapaneseVoice();
  if (jaVoice) utter.voice = jaVoice;
  if (onEnd) {
    utter.onend = () => onEnd();
    utter.onerror = () => onEnd();
  }
  window.speechSynthesis.cancel();
  if (pendingSpeak !== null) window.clearTimeout(pendingSpeak);
  pendingSpeak = window.setTimeout(() => {
    pendingSpeak = null;
    window.speechSynthesis.speak(utter);
  }, 90);
}
