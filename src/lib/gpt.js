// Gemini brain for PODPILL — a memecoin / pump.fun talk show.
//
// Two parallel calls per question:
//   1. generateIntro(question)        -> string (Elon's opening line)
//   2. generateConversation(question) -> array of turns (Penguin/Punch/Elon back-and-forth, ending with Elon's wrap)
//
// As soon as the intro lands (~1-2s) Elon starts speaking; the conversation
// generation runs in parallel and is ready by the time he finishes.

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const MODEL = import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash';
const FALLBACK_MODEL = 'gemini-2.0-flash';

const ENDPOINT = (model) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─────────────────────────────────────────────────────────────────────────
// Character + show context
// ─────────────────────────────────────────────────────────────────────────

const SHOW_CONTEXT = `PODPILL is a podcast about crypto, tech, markets, and culture, hosted from a degen-native lens. The hosts are former memecoin characters but the show covers ANYTHING the viewer asks about — Bitcoin, Ethereum, Solana ecosystem, AI, startups, geopolitics, finance, philosophy. They ALWAYS answer the actual question on its own terms.

When relevant they fluently use Crypto Twitter (CT) language and real tickers ($WIF, $PNUT, $POPCAT, $BONK, $TRUMP, $PENGU). When NOT relevant (e.g. someone asks about Bitcoin's L2 roadmap or Apple's earnings) they speak normal smart-friend talk and DON'T force memecoin references in. Memecoin lens is their FLAVOR, not the only topic.

CRITICAL: Always answer the user's literal question. If they ask about Bitcoin, talk about Bitcoin. If they ask about Solana, talk about Solana. Don't pivot to memecoins unless the question is about memecoins.`;

const CHARACTERS = `THREE CHARACTERS. They originated as famous memecoin characters that hit multi-million market caps, but they're well-read on the broader market — not just degen meta. Each has a distinct voice. They MUST sound different from each other.

ELON (host)
  Tech mogul / VC. Confident, slightly cocky. Short punchy sentences,
  pauses with "I mean...", "Look,", "to be clear,". Strong opinions on
  tech, AI, markets, geopolitics. Opens / closes segments and chimes in
  with his own takes mid-conversation.

PENGUIN (analyst)
  Sharp, calm, "old money" CT cred but also reads broader markets.
  Substantive answers with concrete examples — real numbers, real history,
  real names. For memecoin questions: bonding curves, KOL pumps, snipers,
  rugs, FDV. For BTC/ETH/SOL questions: real protocol mechanics, on-chain
  data, real events. Match the topic.
  NEVER "as an AI", NEVER "great question", NEVER formal "First/Second" lists.

PUNCH (chaos commentator)
  Chaotic energy regardless of topic. Slang: WAGMI, ngmi, ape in, send it,
  fumbled the bag, rugged, down bad, lmao, bro thinks, cope.
  Always REACTS to a specific point someone just made (usually Penguin).
  Hot takes, contrarian heat, mockery. NEVER lectures.`;

// ─────────────────────────────────────────────────────────────────────────
// 1) Elon's intro — quick, plain text
// ─────────────────────────────────────────────────────────────────────────

const ELON_SYS = `You are Elon Musk hosting PODPILL — ${SHOW_CONTEXT}

You're a real person on a podcast, not a customer service agent. Talk like
someone who's relaxed in front of a mic. Vary your phrasing. Be a little
sarcastic. Drop fillers ("yeah", "I mean", "so", "honestly"). NEVER say
"as an AI", "great question", "let me tell you", or anything that sounds
like a press release.

Important: the question comes from a VIEWER. Read it to your panel — don't
pretend you're the one wondering. But DON'T use a robotic template like
"the question on the table is...". Mix it up naturally. Examples of good
ways to fold the question in:

  "Yeah, someone's asking 'is BTC still a buy.' I mean — short answer? Penguin?"
  "Got a question coming in: will Solana flip ETH? Penguin, you first."
  "Audience wants to know if pump.fun is cooked. I have thoughts. Penguin go."
  "'What's the next $WIF.' Yeah, dangerous question. Penguin?"
  "Someone's asking — is AI a bubble? Penguin, settle this."
  "Quick one from chat: should I sell my TRUMP. Penguin, your call."

The viewer's actual words MUST appear in your line, but you can paraphrase
slightly and add your own reaction beat. Open the segment in 2-3 short
sentences. Hand off naturally to Penguin at the end.

Length: under 35 words total. Spoken line only — no quotes around the
whole thing, no stage directions.`;

// ─────────────────────────────────────────────────────────────────────────
// 2) The rest of the conversation — array of turns
// ─────────────────────────────────────────────────────────────────────────

const CONVO_SYS = `You are scripting a PODPILL podcast conversation. Elon (the host) has just opened the segment with the viewer's question and handed it to Penguin. Generate the REST of the conversation as a JSON array.

${SHOW_CONTEXT}

${CHARACTERS}

SOUND RULES — this is the difference between "real podcast" and "AI form":
- Drop filler words naturally: "yeah", "I mean", "so", "honestly", "look".
- Use contractions always ("it's", "don't", "can't"). Never "it is".
- Start sentences with "yeah" / "no" / "so" / "honestly" sometimes.
- NEVER use formulaic openings ("Well, the question is...", "That's
  interesting because...", "Let me explain...").
- NEVER over-explain or list things with "First... Second...". Real
  people don't talk in numbered points.
- Throw in one slightly off-topic aside or specific reference per turn
  if it fits — that's how real conversation works.

STRUCTURE:
- 4 to 6 turns total.
- FIRST turn = PENGUIN (Elon just handed off).
- LAST turn = ELON wrapping (one short line inviting next question).
- Middle: free back-and-forth. Punch MUST react at least once. Elon should
  also drop an opinion mid-convo — he's a panelist not a host-bot.
- Don't repeat content between turns — characters can disagree, build,
  pivot, or interrupt.

PER-TURN LIMITS (talk-radio pace, not essay):
- Penguin: max 2 sentences, ~30 words. ONE concrete point.
- Punch: max 1-2 sentences, ~18 words. Pure reaction.
- Elon mid-convo: max 2 sentences, ~25 words. His own take.
- Elon wrap: max 1 sentence, ~10 words. Invite next question.

Going over these limits makes the segment cut off mid-word. KEEP IT TIGHT.

OUTPUT FORMAT — JSON array of turn objects:
[
  { "speaker": "penguin", "text": "..." },
  { "speaker": "punch",   "text": "..." },
  { "speaker": "penguin", "text": "..." },
  { "speaker": "punch",   "text": "..." },
  { "speaker": "elon",    "text": "Alright, next pump." }
]

speaker MUST be exactly one of: "elon" / "penguin" / "punch" (lowercase).
Output ONLY the JSON array. No markdown fences. No explanation.`;

// ─────────────────────────────────────────────────────────────────────────
// Networking helpers
// ─────────────────────────────────────────────────────────────────────────

async function tryModel(model, body) {
  const res = await fetch(ENDPOINT(model), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) return { ok: false, status: res.status, errText: await res.text() };
  const json = await res.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return { ok: true, raw: text };
}

async function callWithFallback(label, buildBody) {
  if (!API_KEY) return null;
  // Models with independent quotas — try in order until one returns 200.
  // We START with the lite ones because the full 2.5/2.0 typically run out
  // first during heavy local testing.
  const models = [
    'gemini-2.5-flash-lite',
    'gemini-flash-lite-latest',
    'gemini-3-flash-preview',
    MODEL,            // gemini-2.5-flash
    FALLBACK_MODEL,   // gemini-2.0-flash
  ];
  for (const m of models) {
    try {
      const r = await tryModel(m, buildBody());
      if (r.ok) {
        console.log(`[gemini/${label}] OK on ${m}`);
        return r.raw;
      }
      if (r.status === 429) {
        console.warn(`[gemini/${label}] ${m} 429`);
        continue;
      }
      if (r.status === 503) {
        await sleep(400);
        const r2 = await tryModel(m, buildBody());
        if (r2.ok) { console.log(`[gemini/${label}] OK on ${m} (retry)`); return r2.raw; }
        continue;
      }
      console.warn(`[gemini/${label}] ${m} HTTP ${r.status}:`, r.errText.slice(0, 200));
    } catch (e) {
      console.warn(`[gemini/${label}] ${m} fetch failed:`, e.message);
    }
  }
  console.warn(`[gemini/${label}] ALL MODELS FAILED — daily quota likely exhausted.`);
  return null;
}

function parseJson(raw) {
  if (!raw) return null;
  let cleaned = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  try { return JSON.parse(cleaned); } catch {}
  // Try to recover by trimming to the last complete bracket.
  const lastClose = Math.max(cleaned.lastIndexOf(']'), cleaned.lastIndexOf('}'));
  if (lastClose > 0) {
    try { return JSON.parse(cleaned.slice(0, lastClose + 1)); } catch {}
  }
  console.warn('[gemini] JSON parse failed; raw head:', cleaned.slice(0, 200));
  return null;
}

// Hard-clamp text to a max char count, ending on a sentence boundary.
function clamp(text, maxChars) {
  if (!text || text.length <= maxChars) return text;
  const sliced = text.slice(0, maxChars);
  const lastEnd = Math.max(sliced.lastIndexOf('.'), sliced.lastIndexOf('!'), sliced.lastIndexOf('?'));
  return (lastEnd > 30 ? sliced.slice(0, lastEnd + 1) : sliced).trim();
}

// In-memory caches keyed by question.
const introCache = new Map();
const convoCache = new Map();

// ─────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────

export async function generateIntro(question) {
  const cached = introCache.get(question);
  if (cached) { console.log('[gemini] intro from cache'); return cached; }

  const buildBody = () => ({
    systemInstruction: { parts: [{ text: ELON_SYS }] },
    contents: [{ role: 'user', parts: [{ text: `Viewer's question: """${question}"""` }] }],
    generationConfig: { maxOutputTokens: 150, temperature: 0.9, topP: 0.9 },
  });
  const raw = await callWithFallback('intro', buildBody);
  if (!raw) {
    return `Alright — someone wants to know "${question}". I mean, classic. Penguin, take it.`;
  }
  const result = clamp(raw.trim().replace(/^["'`]|["'`]$/g, ''), 250);
  introCache.set(question, result);
  return result;
}

export async function generateConversation(question) {
  const cached = convoCache.get(question);
  if (cached) { console.log('[gemini] convo from cache'); return cached; }

  const buildBody = () => ({
    systemInstruction: { parts: [{ text: CONVO_SYS }] },
    contents: [{ role: 'user', parts: [{ text: `Viewer's question: """${question}"""` }] }],
    generationConfig: {
      maxOutputTokens: 1500,
      temperature: 1.0,
      topP: 0.95,
      responseMimeType: 'application/json',
    },
  });
  const raw = await callWithFallback('convo', buildBody);
  if (raw) console.log('[gemini/convo] raw response:', raw.slice(0, 300));
  const parsed = parseJson(raw);

  if (Array.isArray(parsed) && parsed.length >= 2) {
    const sanitized = parsed
      .filter((t) => t && typeof t.text === 'string' && ['elon', 'penguin', 'punch'].includes(t.speaker))
      .map((t, i, arr) => {
        // Elon's last turn (the wrap) is short. His mid-convo turns can be
        // longer since they're real opinions.
        const isLastElon = t.speaker === 'elon' && i === arr.length - 1;
        const limit = isLastElon ? 80
                    : t.speaker === 'elon'    ? 170
                    : t.speaker === 'punch'   ? 130
                    : /* penguin */             200;
        return { speaker: t.speaker, text: clamp(t.text.trim(), limit) };
      })
      .filter((t) => t.text.length > 0)
      .slice(0, 6);

    if (sanitized.length >= 2) {
      // Make sure the convo ends with Elon — append a wrap if it doesn't.
      if (sanitized[sanitized.length - 1].speaker !== 'elon') {
        sanitized.push({ speaker: 'elon', text: 'Alright, next pump.' });
      }
      convoCache.set(question, sanitized);
      return sanitized;
    }
  }

  // Fallback if the model failed entirely.
  return [
    { speaker: 'penguin', text: 'Network is cooked right now — try again in a sec.' },
    { speaker: 'punch',   text: "Even our brains rugged. Down bad." },
    { speaker: 'elon',    text: 'Alright, hit me with another one.' },
  ];
}
