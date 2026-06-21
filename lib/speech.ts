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

// Speak text aloud. Tries to use a Japanese voice when available.
export function speak(text: string, lang = "ja-JP") {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = lang;
  const jaVoice = window.speechSynthesis
    .getVoices()
    .find((v) => v.lang.startsWith("ja"));
  if (jaVoice) utter.voice = jaVoice;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utter);
}
