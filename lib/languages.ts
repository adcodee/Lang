// Registry of courses the app offers. Adding a language means adding an
// entry here plus a `lib/content/<id>/` pack — nothing else should need to
// know the language list by name.

export type LanguageId = "ja" | "lg";

export interface LanguageConfig {
  id: LanguageId;
  name: string; // "Japanese"
  nativeName: string; // "日本語"
  locale: string; // BCP-47, used for TTS/STT (speech.ts)
  features: {
    strokes: boolean; // stroke-order tracing (kanji/kana canvas)
    kanaDojo: boolean; // kana-specific Dojo drills (vowel sort, lookalikes, trace)
    speakPhrase: boolean; // speak-phrase exercises (needs a trained recogniser)
    romaji: boolean; // romaji hints/typing
    agreementDrills: boolean; // noun-class / adjective-agreement Dojo drills
    soundLengthDrills: boolean; // length/double-consonant contrast drills
  };
}

export const LANGUAGES: Record<LanguageId, LanguageConfig> = {
  ja: {
    id: "ja",
    name: "Japanese",
    nativeName: "日本語",
    locale: "ja-JP",
    features: {
      strokes: true,
      kanaDojo: true,
      speakPhrase: true,
      romaji: true,
      agreementDrills: false,
      soundLengthDrills: false,
    },
  },
  lg: {
    id: "lg",
    name: "Luganda",
    nativeName: "Oluganda",
    locale: "lg-UG",
    features: {
      strokes: false,
      kanaDojo: false,
      // Off until a trained recogniser exists — see the Luganda build plan's
      // speech policy table. Never flip this on for a browser-STT fallback.
      speakPhrase: false,
      romaji: false,
      agreementDrills: true,
      soundLengthDrills: true,
    },
  },
};

export const DEFAULT_LANGUAGE: LanguageId = "ja";

export function languageConfig(id: LanguageId): LanguageConfig {
  return LANGUAGES[id];
}
