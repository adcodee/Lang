"use client";

// Thin wrappers around the browser Web Speech API used by the voice tutor.
// These power the STT/TTS for the Grok voice flow when no real key is wired up,
// and remain useful for capturing the learner's speech regardless.

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
    return hits / short.length >= 0.7;
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

function pickJapaneseVoice(): SpeechSynthesisVoice | undefined {
  if (!voiceCache.length) refreshVoices();
  return voiceCache.find(
    (v) => v.lang?.toLowerCase().startsWith("ja") || v.lang?.includes("JP")
  );
}

// Speak text aloud. Uses a cached Japanese voice when available. `onEnd` fires
// when the utterance finishes (or errors, or if TTS is unavailable) so a
// hands-free conversation loop knows when to re-open the mic.
export function speak(text: string, lang = "ja-JP", onEnd?: () => void) {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    onEnd?.();
    return;
  }
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = lang;
  const jaVoice = pickJapaneseVoice();
  if (jaVoice) utter.voice = jaVoice;
  if (onEnd) {
    utter.onend = () => onEnd();
    utter.onerror = () => onEnd();
  }
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utter);
}
