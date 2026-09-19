// Benchmarks candidate Grok models for Lang's mid-chat turn role: short,
// deterministic JSON output, called on every learner turn, latency-
// sensitive. Run locally — NEVER commits a key, reads XAI_API_KEY from
// the environment only:
//
//   XAI_API_KEY=sk-... npx tsx scripts/bench-grok-models.ts
//
// Why this exists instead of trusting xAI's docs: two separate doc fetches
// gave contradictory answers about which models reason (one said grok-4.6
// doesn't reason at all; a real captured request log proved it does, even
// at reasoning_effort=low). Docs summaries have been unreliable here —
// this measures the real API directly instead.
//
// Uses the exact production system prompt shape (SCENE MAP / OPEN MOVES /
// MATCHER HITS / LINKS / EXAMPLES, same as lib/ai/prompt.ts's real turn
// prompt for the `meet` scenario) so token counts and latency are
// comparable to what /api/chat actually sends — not a toy prompt.

const SYSTEM_PROMPT = `You are Lang's Japanese conversation partner for a beginner.

OUTPUT
Return ONLY JSON with keys:
spoken_ja, romaji, ask_next_ja, did_you_mean, issue, avoid, holeLessonId, spans, link
No markdown. No extra keys. Do NOT include moves_filled or moves_open —
those are computed server-side from OPEN MOVES/MATCHER HITS below, not
something you report.

DURING THE SCENE
- spoken_ja and ask_next_ja: Japanese only, LEARNER LEVEL inventory. Glue allowed: です ます か は も と が の を に で よ ね 。
- romaji: Hepburn of spoken_ja only.
- Keep the scenario moving. One reply, one question, stop.
- If their Japanese was off: did_you_mean = the form they should have used (Japanese). avoid = what they said. Do NOT explain why. Do NOT write English except inside JSON string values that are empty for mid-chat.
- If they were fine: did_you_mean and avoid are empty, issue=ok, holeLessonId empty.
- If they wrote only English: did_you_mean = the Japanese they should have said, issue=english-only.
- holeLessonId only from LESSON CATALOG. Never invent an id.

WHEN A SCENE MAP IS PROVIDED BELOW (move/form grading, not a numbered script)
- Grade moves, not script position. Any number of map moves may be filled
  in one learner send, in any order, unless a precondition is missing.
- Different forms/alts of the SAME move are interchangeable.
- OPEN MOVES / MATCHER HITS below are computed by the server — trust them.
- spans: at most 2, only for a move's form that was WRONG.
- link: if the learner's line points toward a scene named in LINKS below,
  set {"sceneId": "<that id>", "gated": true}. Keep speaking in the
  CURRENT scene. If nothing points there, link is "".
- Partner policy: fill at most one or two still-OPEN moves yourself. Do
  not fill "give_name" or "close" for the learner unless they've stalled.

You are not a lecturer in this mode. No particle essays.

LEARNER LEVEL — the learner has ONLY studied the following. This is a hard constraint.

Words/phrases they know: おはよう (good morning), こんにちは (hello (daytime)), こんばんは (good evening), ありがとう (thank you), はじめまして (nice to meet you (first time)), わたし (I (polite)), よろしく (I look forward to this (after an intro)), すみません (excuse me / sorry), おなまえは (what's your name?)

SCENE MAP
- greet | required=said | forms/alts: こんにちは / はじめまして
- give_name | required=said | forms/alts: わたしは X です / X です
- ask_name | required=no | forms/alts: おなまえは？
- close | required=said | precondition=give_name | forms/alts: よろしく
- repair | required=no | forms/alts: すみません

OPEN MOVES
give_name

MATCHER HITS (server-computed; do not delete these)
greet

LINKS (declare only — do not play these scenes)
- food / like / order → food
- family → family

EXAMPLES

Learner: こんにちは
{"spoken_ja":"こんにちは！","romaji":"Konnichiwa!","ask_next_ja":"おなまえは？","did_you_mean":"","issue":"ok","avoid":"","holeLessonId":"","spans":[],"link":""}

Learner: わたし Adule です。
{"spoken_ja":"はじめまして。","romaji":"Hajimemashite.","ask_next_ja":"","did_you_mean":"わたしは Adule です。","issue":"particle","avoid":"わたし Adule です。","holeLessonId":"u2-self-intro","spans":[{"avoid":"わたし Adule です。","prefer":"わたしは Adule です。","issue":"particle","holeLessonId":"u2-self-intro"}],"link":""}
`;

// Two representative learner turns: a clean one, and one with a real
// mistake — checks output quality (valid JSON, right shape), not just speed.
const TEST_TURNS = ["こんにちは", "わたし Adule です。すみません"];

// Candidate list built from what xAI's own docs (unreliably) suggested,
// plus the current production default. Add/remove freely — if a model id
// doesn't exist, xAI will 404 and this script reports that clearly rather
// than crashing the whole run.
const CANDIDATE_MODELS = [
  "grok-4.6", // current production default (reasoning confirmed present even at low effort)
  "grok-4.5",
  "grok-4.3",
  "grok-4.20-0309-non-reasoning",
  "grok-build-0.1",
];

const REASONING_EFFORT = "low";

interface RunResult {
  model: string;
  ok: boolean;
  latencyMs: number;
  httpStatus?: number;
  error?: string;
  usage?: Record<string, unknown>;
  content?: string;
  validJson?: boolean;
  usedReasoningEffort?: boolean;
}

async function callXai(model: string, learnerText: string, withReasoningEffort: boolean) {
  return fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.XAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: learnerText },
      ],
      temperature: 0.5,
      ...(withReasoningEffort ? { reasoning_effort: REASONING_EFFORT } : {}),
    }),
  });
}

async function runOne(model: string, learnerText: string): Promise<RunResult> {
  const start = Date.now();
  try {
    let usedReasoningEffort = true;
    let res = await callXai(model, learnerText, true);
    // Genuinely non-reasoning models reject the param outright rather than
    // ignoring it — retry once without it so those candidates still get a
    // real measurement instead of just failing.
    if (!res.ok && res.status === 400) {
      const probeText = await res.text();
      if (/reasoningEffort|reasoning_effort/i.test(probeText)) {
        usedReasoningEffort = false;
        res = await callXai(model, learnerText, false);
      } else {
        const latencyMs = Date.now() - start;
        return { model, ok: false, latencyMs, httpStatus: res.status, error: probeText.slice(0, 300) };
      }
    }
    const latencyMs = Date.now() - start;
    if (!res.ok) {
      const bodyText = await res.text();
      return { model, ok: false, latencyMs, httpStatus: res.status, error: bodyText.slice(0, 300) };
    }
    const data = await res.json();
    const content: string = data?.choices?.[0]?.message?.content ?? "";
    let validJson = false;
    try {
      JSON.parse(content);
      validJson = true;
    } catch {
      validJson = false;
    }
    return { model, ok: true, latencyMs, usage: data?.usage, content, validJson, usedReasoningEffort };
  } catch (err) {
    return { model, ok: false, latencyMs: Date.now() - start, error: String(err) };
  }
}

async function main() {
  if (!process.env.XAI_API_KEY) {
    console.error("Set XAI_API_KEY in the environment first (never commit it). Example:");
    console.error('  XAI_API_KEY=sk-... npx tsx scripts/bench-grok-models.ts');
    process.exit(1);
  }

  console.log(`Testing ${CANDIDATE_MODELS.length} model(s) × ${TEST_TURNS.length} turn(s), reasoning_effort=${REASONING_EFFORT}\n`);

  for (const model of CANDIDATE_MODELS) {
    console.log(`=== ${model} ===`);
    for (const turn of TEST_TURNS) {
      const r = await runOne(model, turn);
      if (!r.ok) {
        console.log(`  Learner: "${turn}" -> FAILED (http ${r.httpStatus ?? "n/a"}) in ${r.latencyMs}ms: ${r.error}`);
        continue;
      }
      console.log(`  Learner: "${turn}" -> ${r.latencyMs}ms, validJson=${r.validJson}, reasoningEffortApplied=${r.usedReasoningEffort}`);
      console.log(`    usage: ${JSON.stringify(r.usage)}`);
      console.log(`    content: ${r.content}`);
    }
    console.log();
  }
}

main();
