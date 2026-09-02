"use client";

import { Capacitor } from "@capacitor/core";
import { TextToSpeech, QueueStrategy } from "@capacitor-community/text-to-speech";

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
