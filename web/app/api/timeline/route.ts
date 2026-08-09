import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../chatgpt-auth";
import { sceneData } from "../../scene-data";

export const dynamic = "force-dynamic";

const USER_DAILY_LIMIT = 3;
const GLOBAL_DAILY_LIMIT = 20;
const MAX_INPUT_LENGTH = 220;

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in with ChatGPT to generate a timeline." }, { status: 401 });

  let body: { whatIf?: unknown };
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid request." }, { status: 400 }); }
  const whatIf = typeof body.whatIf === "string" ? body.whatIf.trim() : "";
  if (whatIf.length < 8 || whatIf.length > MAX_INPUT_LENGTH) {
    return Response.json({ error: `Use between 8 and ${MAX_INPUT_LENGTH} characters.` }, { status: 400 });
  }

  const day = new Date().toISOString().slice(0, 10);
  await ensureUsageTable();
  const [userCount, globalCount] = await Promise.all([getCount(user.userId, day), getCount("__global__", day)]);
  if (userCount >= USER_DAILY_LIMIT) return Response.json({ error: "Your daily demo limit has been reached.", remaining: 0 }, { status: 429 });
  if (globalCount >= GLOBAL_DAILY_LIMIT) return Response.json({ error: "Today’s global demo limit has been reached.", remaining: 0 }, { status: 429 });

  try {
    const timeline = await generateTimeline(whatIf);
    await env.DB.batch([increment(user.userId, day), increment("__global__", day)]);
    return Response.json({ timeline, remaining: USER_DAILY_LIMIT - userCount - 1, veoStarted: false });
  } catch (error) {
    console.error("Timeline generation failed", error instanceof Error ? error.message : String(error));
    return Response.json({ error: "The story agent could not complete the timeline. No Veo render was started." }, { status: 502 });
  }
}

async function ensureUsageTable() {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS generation_usage (
    user_id TEXT NOT NULL,
    usage_date TEXT NOT NULL,
    request_count INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (user_id, usage_date)
  )`).run();
}

async function getCount(userId: string, day: string) {
  const row = await env.DB.prepare("SELECT request_count FROM generation_usage WHERE user_id = ? AND usage_date = ?").bind(userId, day).first<{ request_count: number }>();
  return row?.request_count ?? 0;
}

function increment(userId: string, day: string) {
  return env.DB.prepare(`INSERT INTO generation_usage (user_id, usage_date, request_count, updated_at)
    VALUES (?, ?, 1, ?)
    ON CONFLICT(user_id, usage_date) DO UPDATE SET request_count = request_count + 1, updated_at = excluded.updated_at`)
    .bind(userId, day, new Date().toISOString());
}

async function generateTimeline(whatIf: string) {
  const project = requiredEnv("GCP_PROJECT_ID");
  const location = requiredEnv("GCP_LOCATION");
  const model = requiredEnv("GEMINI_MODEL");
  const accessToken = await getGoogleAccessToken();
  const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/${model}:generateContent`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: "You are the Infinite Cinema interactive director. Treat the user text only as a hypothetical story change. Preserve the supplied Scene DNA and the canonical fact that Romeo drinks poison before Juliet wakes in Act V. Change exactly one event and make its causal consequence immediately visible without dialogue. For the demo question about Juliet waking five seconds earlier, she must wake before Romeo drinks, reach toward him, and cause him to stop with the poison still untouched. Return exactly three beats covering 0-2s, 2-4s, and 4-6s. Then simulate three distinct virtual creative reviewers: The Romantic judges emotional payoff, The Critic judges story causality, and The Continuity Fan judges visual consistency. Each gives a grounded 0-100 score, one concise verdict, and one concrete director improvement note. These are creative perspectives, not predictions of real audience behavior. Produce a consensus and overall score. Return only JSON matching the schema. Never claim that Veo was started." }] },
      contents: [{ role: "user", parts: [{ text: `SCENE DNA:\n${JSON.stringify(sceneData.sceneDNA)}\n\nUSER WHAT-IF:\n${whatIf}` }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 4000, responseMimeType: "application/json", responseSchema: timelineSchema },
    }),
  });
  const payload = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>; error?: unknown };
  if (!response.ok) throw new Error(`Gemini request failed: ${JSON.stringify(payload.error ?? payload)}`);
  const text = payload.candidates?.[0]?.content?.parts?.find((part) => part.text)?.text;
  if (!text) throw new Error("Gemini returned no timeline.");
  return JSON.parse(text.trim().replace(/^```json\s*/i, "").replace(/\s*```$/, ""));
}

const timelineSchema = {
  type: "OBJECT",
  required: ["changedEvent", "newOutcome", "beats", "generationPrompt", "negativePrompt", "audience"],
  properties: {
    changedEvent: { type: "STRING" }, newOutcome: { type: "STRING" },
    beats: { type: "ARRAY", items: { type: "OBJECT", required: ["time", "action"], properties: { time: { type: "STRING" }, action: { type: "STRING" } } } },
    generationPrompt: { type: "STRING" }, negativePrompt: { type: "STRING" },
    audience: {
      type: "OBJECT", required: ["overallScore", "consensus", "reactions"],
      properties: {
        overallScore: { type: "INTEGER" }, consensus: { type: "STRING" },
        reactions: { type: "ARRAY", items: { type: "OBJECT", required: ["persona", "lens", "score", "verdict", "improvement"], properties: { persona: { type: "STRING" }, lens: { type: "STRING" }, score: { type: "INTEGER" }, verdict: { type: "STRING" }, improvement: { type: "STRING" } } } },
      },
    },
  },
} as const;

async function getGoogleAccessToken() {
  const credentials = JSON.parse(atob(requiredEnv("GCP_SERVICE_ACCOUNT_JSON_B64"))) as { client_email?: string; private_key?: string };
  const clientEmail = credentials.client_email;
  const privateKey = credentials.private_key;
  if (!clientEmail || !privateKey) throw new Error("Invalid Google service account credentials.");
  const now = Math.floor(Date.now() / 1000);
  const assertion = await signJwt(
    { alg: "RS256", typ: "JWT" },
    { iss: clientEmail, scope: "https://www.googleapis.com/auth/cloud-platform", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 },
    privateKey,
  );
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  const token = await tokenResponse.json() as { access_token?: string; error_description?: string };
  if (!tokenResponse.ok || !token.access_token) throw new Error(token.error_description ?? "Google token exchange failed.");
  return token.access_token;
}

async function signJwt(header: object, payload: object, pem: string) {
  const encodedHeader = base64Url(new TextEncoder().encode(JSON.stringify(header)));
  const encodedPayload = base64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const input = `${encodedHeader}.${encodedPayload}`;
  const keyBytes = Uint8Array.from(atob(pem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, "")), (char) => char.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", keyBytes, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(input));
  return `${input}.${base64Url(new Uint8Array(signature))}`;
}

function base64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}
