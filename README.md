# 🇯🇵 Lang — Learn Japanese

A gamified, **Duolingo-style** web app for learning Japanese, with an **AI
conversation tutor** for real-world practice.

- 🗺️ **Skill tree** of bite-sized lessons (hiragana → greetings → introductions)
- 🎮 **Gamification** — XP, daily streak, and hearts (lives), all persisted locally
- 🧩 **Exercise types** — multiple choice, type-the-answer, match pairs, build-a-sentence
- 💬 **AI practice screen** with a split tutor:
  - **Claude** handles the **text tutor** — grammar correction & conversational feedback
  - **Grok (xAI)** handles the **voice tutor** — speaking & listening practice

## Quick start

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

The app runs **fully without any API keys** — the AI tutors return sample
("Demo mode") responses, and voice uses the browser's built-in speech engine.

## Enabling the real AI tutors

Copy the example env file and add your keys:

```bash
cp .env.example .env.local
```

| Variable            | Powers                | Get a key                        |
| ------------------- | --------------------- | -------------------------------- |
| `ANTHROPIC_API_KEY` | Text tutor (Claude)   | <https://console.anthropic.com/> |
| `XAI_API_KEY`       | Voice tutor (Grok)    | <https://console.x.ai/>          |

With a key set, the matching tutor switches from stub to live automatically —
no code changes. The "Demo mode" badge disappears once a provider is live.

## How it works

| Layer        | Where                                         |
| ------------ | --------------------------------------------- |
| Lessons data | `lib/content/lessons.ts`                      |
| Game state   | `lib/store/gameStore.ts` (Zustand + localStorage) |
| AI adapters  | `lib/ai/claude.ts`, `lib/ai/grok.ts`          |
| API routes   | `app/api/chat/route.ts`, `app/api/voice/route.ts` |
| Voice (STT/TTS) | `lib/speech.ts` (Web Speech API)           |

The AI adapters are **stub-first**: each checks for its API key and falls back to
deterministic sample responses so every screen is demoable offline. Real Grok
voice integration plugs into `lib/ai/grok.ts` later; today the browser handles
speech-to-text and text-to-speech.

## Tech stack

Next.js (App Router) · React · TypeScript · Tailwind CSS · Zustand ·
framer-motion · lucide-react · @anthropic-ai/sdk

## Credits

Hiragana stroke-order data is from [KanjiVG](http://kanjivg.tagaini.net) by
Ulrich Apel, used under the Creative Commons Attribution-Share Alike 3.0 licence.
The extracted subset in `lib/content/strokes.ts` is distributed under the same
licence.

## Scope

This is a **core MVP**. Not yet included: user accounts, a server-side database,
leaderboards, and the full kana/kanji curriculum.
