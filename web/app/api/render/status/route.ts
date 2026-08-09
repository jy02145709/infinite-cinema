import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { getGoogleAccessToken, requiredEnv } from "../../google-auth";

export const dynamic = "force-dynamic";
const MODEL = "veo-3.1-generate-001";

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in with ChatGPT." }, { status: 401 });
  if (user.email.toLowerCase() !== requiredEnv("VEO_OWNER_EMAIL").toLowerCase()) return Response.json({ error: "Owner access required." }, { status: 403 });
  let body: { renderId?: unknown };
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid request." }, { status: 400 }); }
  const renderId = typeof body.renderId === "string" ? body.renderId : "";
  const row = await env.DB.prepare("SELECT operation_name FROM veo_renders WHERE id = ? AND user_id = ?").bind(renderId, user.userId).first<{ operation_name: string }>();
  if (!row?.operation_name) return Response.json({ error: "Render not found." }, { status: 404 });
  const accessToken = await getGoogleAccessToken();
  const response = await fetch(`${modelBaseUrl()}:fetchPredictOperation`, { method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ operationName: row.operation_name }) });
  const payload = await response.json() as Record<string, unknown>;
  if (!response.ok || payload.error) {
    await env.DB.prepare("UPDATE veo_renders SET status = 'failed', updated_at = ? WHERE id = ?").bind(new Date().toISOString(), renderId).run();
    return Response.json({ error: `Veo render failed: ${JSON.stringify(payload.error ?? payload)}` }, { status: 502 });
  }
  if (payload.done !== true) return Response.json({ status: "running" });
  const videoBase64 = findStringByKey(payload, "bytesBase64Encoded");
  if (!videoBase64) return Response.json({ error: "Veo completed without a video payload." }, { status: 502 });
  await env.DB.prepare("UPDATE veo_renders SET status = 'completed', updated_at = ? WHERE id = ?").bind(new Date().toISOString(), renderId).run();
  return Response.json({ status: "completed", videoBase64, mimeType: "video/mp4" });
}

function modelBaseUrl() {
  const location = requiredEnv("GCP_LOCATION");
  return `https://${location}-aiplatform.googleapis.com/v1/projects/${requiredEnv("GCP_PROJECT_ID")}/locations/${location}/publishers/google/models/${MODEL}`;
}

function findStringByKey(value: unknown, key: string): string | undefined {
  if (Array.isArray(value)) { for (const item of value) { const found = findStringByKey(item, key); if (found) return found; } return undefined; }
  if (typeof value !== "object" || value === null) return undefined;
  const record = value as Record<string, unknown>;
  if (typeof record[key] === "string") return record[key] as string;
  for (const child of Object.values(record)) { const found = findStringByKey(child, key); if (found) return found; }
  return undefined;
}
