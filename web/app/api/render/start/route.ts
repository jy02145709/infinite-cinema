import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { getGoogleAccessToken, requiredEnv } from "../../google-auth";

export const dynamic = "force-dynamic";
const MODEL = "veo-3.1-generate-001";
const ESTIMATED_COST_USD = 3;

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ canRender: false, usedToday: 0, dailyLimit: 1, estimatedCostUsd: ESTIMATED_COST_USD });
  const canRender = user.email.toLowerCase() === requiredEnv("VEO_OWNER_EMAIL").toLowerCase();
  const usedToday = canRender ? await getUsedToday() : 0;
  return Response.json({ canRender, usedToday, dailyLimit: 1, estimatedCostUsd: ESTIMATED_COST_USD });
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in with ChatGPT." }, { status: 401 });
  if (user.email.toLowerCase() !== requiredEnv("VEO_OWNER_EMAIL").toLowerCase()) return Response.json({ error: "Veo rendering is restricted to the project owner." }, { status: 403 });
  let body: { prompt?: unknown; negativePrompt?: unknown; imageBase64?: unknown; confirmCost?: unknown };
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid request." }, { status: 400 }); }
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  const negativePrompt = typeof body.negativePrompt === "string" ? body.negativePrompt.trim() : "";
  const imageBase64 = typeof body.imageBase64 === "string" ? body.imageBase64 : "";
  if (body.confirmCost !== true) return Response.json({ error: "Confirm the estimated cost before rendering." }, { status: 400 });
  if (prompt.length < 40 || prompt.length > 5000) return Response.json({ error: "The Veo prompt must be between 40 and 5,000 characters." }, { status: 400 });
  if (imageBase64.length < 1000 || imageBase64.length > 8_000_000) return Response.json({ error: "The reference image is missing or too large." }, { status: 400 });
  await ensureRenderTable();
  const renderId = crypto.randomUUID();
  const day = new Date().toISOString().slice(0, 10);
  const timestamp = new Date().toISOString();
  try {
    await env.DB.prepare(`INSERT INTO veo_renders (id, user_id, usage_date, operation_name, status, prompt, created_at, updated_at) VALUES (?, ?, ?, '', 'reserving', ?, ?, ?)`)
      .bind(renderId, user.userId, day, prompt, timestamp, timestamp).run();
  } catch {
    return Response.json({ error: "Today’s single Veo render has already been used or reserved." }, { status: 429 });
  }
  try {
    const accessToken = await getGoogleAccessToken();
    const response = await fetch(`${modelBaseUrl()}:predictLongRunning`, {
      method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ instances: [{ prompt, image: { bytesBase64Encoded: imageBase64, mimeType: "image/png" } }], parameters: { durationSeconds: 6, sampleCount: 1, aspectRatio: "16:9", resolution: "720p", personGeneration: "allow_adult", resizeMode: "pad", ...(negativePrompt ? { negativePrompt } : {}) } }),
    });
    const payload = await response.json() as { name?: string; error?: unknown };
    if (!response.ok || !payload.name) throw new Error(`Veo request failed: ${JSON.stringify(payload.error ?? payload)}`);
    await env.DB.prepare("UPDATE veo_renders SET operation_name = ?, status = 'running', updated_at = ? WHERE id = ?").bind(payload.name, new Date().toISOString(), renderId).run();
    return Response.json({ renderId, status: "running", estimatedCostUsd: ESTIMATED_COST_USD });
  } catch (error) {
    await env.DB.prepare("DELETE FROM veo_renders WHERE id = ? AND status = 'reserving'").bind(renderId).run();
    return Response.json({ error: error instanceof Error ? error.message : "Veo render could not be started." }, { status: 502 });
  }
}

async function getUsedToday() {
  await ensureRenderTable();
  const row = await env.DB.prepare("SELECT COUNT(*) AS count FROM veo_renders WHERE usage_date = ?").bind(new Date().toISOString().slice(0, 10)).first<{ count: number }>();
  return row?.count ?? 0;
}

async function ensureRenderTable() {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS veo_renders (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, usage_date TEXT NOT NULL UNIQUE, operation_name TEXT NOT NULL, status TEXT NOT NULL, prompt TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`).run();
}

function modelBaseUrl() {
  const location = requiredEnv("GCP_LOCATION");
  return `https://${location}-aiplatform.googleapis.com/v1/projects/${requiredEnv("GCP_PROJECT_ID")}/locations/${location}/publishers/google/models/${MODEL}`;
}
