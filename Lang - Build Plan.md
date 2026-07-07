---
title: "Lang — Build Plan"
project: Lang (Japanese learning app)
repo: https://github.com/adcodee/Lang
created: 2026-07-02
review-cadence: monthly
status: active
goal: "Comprehensible spoken Japanese for Japan trip, ~mid-2027"
tags: [lang, japanese, build-plan, app]
---

# Lang — Build Plan

**Operating principle:** the app is built *for* one learner first (me), sequenced just ahead of my own learning. Every feature is justified by whether it gets me comprehensible in Japan — membership productisation comes only after the app has proven itself on its first user.

**Honest milestone test for the whole project:**
- ~September 2026 — read all 46 hiragana cold, plus dakuten and combinations
- ~January 2027 — hold a daily 2-minute vocabulary-constrained conversation with the AI tutor
- If the app delivers both, the membership question answers itself.

---

## Phase 1 — Close the kana gap ✅ DONE (2026-07)

The single highest-priority fix. Unit 1 currently teaches 10 of 46 hiragana (vowels + K-row), yet Unit 2 phrases (こんにちは, ありがとう, こんばんは) use kana never taught: ん に ち ば り が と. The phrase cards patch this with per-kana readings, but the learner arrives at Unit 2 unable to genuinely read the material.

**Tasks:**
- [x] Author remaining base rows in Unit 1's existing lesson format: さ-row, た-row, な-row, は-row, ま-row, や-row, ら-row, わ/を/ん
- [x] Author dakuten/handakuten lessons (unit "Voiced & Combo Sounds" between hiragana and greetings)
- [x] Author small っ (sokuon), combination sounds (きゃ しゅ ちょ etc.), and long vowels
- [x] `strokes.ts` covers all 46 base kana (KanjiVG); voiced/combo kana reuse base shapes — trace surfaces filter on stroke data
- [x] Re-ordered so no Unit 2 phrase uses an untaught kana — content rule enforced going forward
- Bonus shipped alongside: mandatory Dojo checkpoints (mixed-review gates mid-unit), progressive Vowel Row Sort drill, taught-content SRS registry (kana + vocab)

**Content rule (permanent):** every lesson may only use characters/vocabulary introduced in earlier lessons. Test each new unit against this before shipping.

## Phase 2 — Spaced repetition ✅ DONE (2026-07)

Current review only resurfaces items answered *wrong*. A kana learned three weeks ago and never failed simply never comes back. Script retention lives or dies on scheduled resurfacing.

**Tasks:**
- [x] Add `lastSeen` timestamp per kana/vocab item in the game store
- [x] Expanding intervals on success (1 → 3 → 7 → 14 → 30 days), reset on failure
- [x] Keep the existing wrong-answer queue — merge both sources into one review session

### Phase 2b — Review depth (done 2026-07)
- [x] **Production + interleaved reviews**: spaced reviews now cycle three formats per item (recognition choice, audio/reverse choice, *typed production*) instead of recognition-only chips — retrieval practice over passive recognition
- [x] **Retention log**: scheduled-review accuracy tracked per day (`reviewLog`), surfaced as the Retention card on /rank — the honest metric behind the Sept 2026 milestone check
- Deferred: half-life-regression scheduling (Duolingo-style) — needs population-scale data; the interval ladder + reset is adequate for one learner. Speaking-format reviews also deferred (mic friction in a quick loop).

## Phase 3 — Vocabulary-constrained AI tutor (when I reach Unit 2)

Correction of my own assumption: waiting until I'm "at conversation level" is Duolingo's logic — conversation as a reward for finishing. The AI's entire advantage is that it can meet the learner at their level. Readiness starts at Unit 2, not at fluency.

**Tasks:**
- [x] Pass completed-lesson state to `/api/chat` and `/api/voice` — client sends `completedLessons`; the server derives allowed kana/vocab from the content registries (`lib/ai/constraints.ts`)
- [x] Claude system prompt constrained: only taught kana/words (+ minimal grammar glue), one short exchange per turn, gentle restating corrections, stay in scenario
- [x] Same treatment for the Grok voice prompt — plus **conversation history** (the voice tutor was single-turn and couldn't hold an exchange)
- [ ] Target after Unit 2: a real four-line exchange — greeting → name → nice to meet you → goodbye. *Structurally in place (the "Meeting someone new" scenario scripts it one step per turn); verify live with keys.*
- [x] Tutor unlock tied to lesson completion, same as Dojo drills — /practice gates on Basic Greetings; scenarios unlock individually (free chat → greetings, meet-someone → self-intro, food → Unit 5 nouns; directions returns with Phase 5)

## Phase 4 — Fix the exams (after Unit 5)

`buildExam` currently pools the exact lesson exercises, shuffles, and serves 10 — passable on question-memory alone, which is the memorisation trap the app exists to avoid. The exam is the honest test of whether the app taught me or I memorised it.

**Tasks:**
- [ ] Generate unseen combinations from learned material: new pairings in match-pairs, novel words built from taught kana, fresh sentence assemblies from taught vocabulary
- [ ] Keep skill attribution (speaking/writing/listening/punctuation) so Rank stays meaningful
- [ ] Exam question bank kept separate from lesson exercise bank

## Phase 5 — Intermediate: build for the trip, not the JLPT

Skip textbook completeness. Author what gets used in Japan, in order of encounter.

**Content order:**
- [ ] Katakana (menus, signs, and loanwords are saturated with it — arguably more immediately useful in-country than half of hiragana vocab)
- [ ] Core particles: は が を に で へ の
	- Note: pull *light* particle elaboration into greetings/intro reviews earlier than the full particle unit (the は-as-"wa" phrase-part callouts already start this) — attacks the "superficial grammar" plateau without waiting for Phase 5
- [ ] Present/past polite verb forms (ます / ました / ません)
- [ ] **Scenario units**, each ending in an AI roleplay in that setting:
	- [ ] Konbini (buying, paying, bag or no bag)
	- [ ] Restaurant (ordering, asking about the menu, paying)
	- [ ] Train station (tickets, platforms, which line)
	- [ ] Asking directions (where is / how far / left-right)
	- [ ] Hotel (check-in, requests, checkout)

## Phase 6 — Wean the romaji (throughout)

Romaji-graded type-answers run through Unit 5, training a transliteration reflex that has to be unlearned — and would follow me to Japan.

**Tasks:**
- [ ] Fade romaji hints progressively by unit (visible → tap-to-reveal → absent)
- [ ] Move type-answer input toward kana tile selection instead of romaji typing
- [ ] By end of beginner level: no romaji on screen except in explicit pronunciation-hint contexts

---

## Watch list (ongoing)

- **Gamification friction:** hearts and streaks are retention mechanics for *other* users. Solo, they're friction — don't let engagement mechanics distort my own practice. Revisit only at membership stage.
- **Audio quality:** browser TTS is serviceable for kana, weak for pitch accent. Revisit recorded native audio before the trip.
- **Persistence:** localStorage-only progress is fine solo but is the first thing that breaks a membership version. Middle path before any account system: progress **export/import** (or a tiny KV sync) — solo progress is currently per-device and one cleared cache away from gone. Full accounts still wait for the membership stage.
- **Retention metric:** the /rank Retention card (daily spaced-review accuracy) is the number to check at the Sept 2026 milestone — not streaks/XP.
- **Exam integrity:** re-check after every new unit that exams aren't drifting back to lesson-question replay.
- **Content rule compliance:** no lesson uses untaught characters. Check on every unit ship.

## What already holds up (don't break it)

- Phrase teach-cards with kana-by-kana decomposition and explicit particle explanation (は as "wa") — better per-lesson pedagogy than Duolingo
- Casual vs polite register notes (ありがとう / ありがとうございます)
- Stroke-order tracing with auto-grading
- Balanced exercise mix across all four skills; seven exercise types
- Stub-first architecture — fully demoable offline, live AI switches on with a key
- Dojo visual identity (sumi/washi/torii palette, Noto JP)

## Sequencing summary

| When | Work |
|---|---|
| Now | Phase 1 (kana coverage) + Phase 2 (spaced repetition) |
| At Unit 2 | Phase 3 (constrained AI tutor) |
| After Unit 5 | Phase 4 (exam generation) |
| Post-beginner | Phase 5 (katakana, particles, verbs, scenario units) |
| Throughout | Phase 6 (romaji fade) + watch list |
| Sept 2026 | Milestone check: all hiragana cold |
| Jan 2027 | Milestone check: daily 2-min AI conversation |
| Mid-2027 | Japan. The real exam. |
