import "dotenv/config";
import { createInterface } from "node:readline/promises";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";
import { stdin as input, stdout as output } from "node:process";
import { GoogleAuth } from "google-auth-library";

const project = required("GOOGLE_CLOUD_PROJECT");
const location = process.env.GOOGLE_CLOUD_LOCATION ?? "us-central1";
const model = process.env.VEO_MODEL ?? "veo-3.1-generate-001";
const durationSeconds = Number(process.env.VEO_DURATION_SECONDS ?? "6");
const imagePath = resolve(process.env.VEO_INPUT_IMAGE ?? process.env.SHOT_1_IMAGE ?? "assets/shot-01-reference.png");
const lastFramePath = process.env.VEO_LAST_FRAME ? resolve(process.env.VEO_LAST_FRAME) : undefined;
const outputPath = resolve(process.env.VEO_OUTPUT ?? process.env.SHOT_1_OUTPUT ?? "outputs/shot-01.mp4");
const promptPath = resolve(process.env.VEO_PROMPT ?? "prompts/shot-01.txt");

if (![4, 6, 8].includes(durationSeconds)) throw new Error("Veo 3 duration must be 4, 6, or 8 seconds.");

const [image, prompt, lastFrame] = await Promise.all([
  readFile(imagePath),
  readFile(promptPath, "utf8"),
  lastFramePath ? readFile(lastFramePath) : Promise.resolve(undefined),
]);
const mimeType = mimeFor(imagePath);

console.log(`Model: ${model}`);
console.log(`Duration: ${durationSeconds}s`);
console.log(`Input: ${imagePath}`);
if (lastFramePath) console.log(`Last frame: ${lastFramePath}`);

if (!process.argv.includes("--yes")) {
  const rl = createInterface({ input, output });
  const answer = await rl.question("Submit this billable Veo request? [y/N] ");
  rl.close();
  if (!/^y(es)?$/i.test(answer.trim())) process.exit(0);
}

const auth = new GoogleAuth({ scopes: ["https://www.googleapis.com/auth/cloud-platform"] });
const client = await auth.getClient();
const token = await client.getAccessToken();
if (!token.token) throw new Error("No Application Default Credentials token. Run: gcloud auth application-default login");

const baseUrl = `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/${model}`;
const parameters: Record<string, unknown> = {
  durationSeconds,
  sampleCount: 1,
  aspectRatio: process.env.VEO_ASPECT_RATIO ?? "16:9",
  resolution: process.env.VEO_RESOLUTION ?? "720p",
  personGeneration: "allow_adult",
  resizeMode: "pad",
};
if (process.env.VEO_OUTPUT_GCS_URI) parameters.storageUri = process.env.VEO_OUTPUT_GCS_URI;

const instance: Record<string, unknown> = {
  prompt,
  image: { bytesBase64Encoded: image.toString("base64"), mimeType },
};
if (lastFrame && lastFramePath) {
  instance.lastFrame = { bytesBase64Encoded: lastFrame.toString("base64"), mimeType: mimeFor(lastFramePath) };
}

const operation = await post(`${baseUrl}:predictLongRunning`, token.token, {
  instances: [instance],
  parameters,
});
const operationName = getString(operation, "name");
console.log(`Operation: ${operationName}`);

let result: unknown;
for (;;) {
  await new Promise((resolvePromise) => setTimeout(resolvePromise, 10_000));
  result = await post(`${baseUrl}:fetchPredictOperation`, token.token, { operationName });
  const record = asRecord(result);
  if (record.error) throw new Error(JSON.stringify(record.error, null, 2));
  if (record.done === true) break;
  console.log("Still generating…");
}

const videoBase64 = findStringByKey(result, "bytesBase64Encoded");
const gcsUri = findStringByKey(result, "gcsUri");
if (videoBase64) {
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, Buffer.from(videoBase64, "base64"));
  console.log(`Saved: ${outputPath}`);
} else if (gcsUri) {
  console.log(`Generated video: ${gcsUri}`);
  console.log("Download it with gcloud storage cp, or remove VEO_OUTPUT_GCS_URI to receive local bytes.");
} else {
  await mkdir(resolve("outputs"), { recursive: true });
  await writeFile(resolve("outputs/last-operation.json"), JSON.stringify(result, null, 2));
  throw new Error("Generation completed but no video payload was found. Saved outputs/last-operation.json.");
}

function required(name: string): string {
  const value = process.env[name];
  if (!value || value === "your-project-id") throw new Error(`Set ${name} in .env.`);
  return value;
}

function mimeFor(path: string): string {
  const ext = extname(path).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  throw new Error("Shot 1 image must be PNG, JPEG, or WebP.");
}

async function post(url: string, accessToken: string, body: unknown): Promise<unknown> {
  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const value = await response.json();
  if (!response.ok) throw new Error(`Vertex AI ${response.status}: ${JSON.stringify(value, null, 2)}`);
  return value;
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
}

function getString(value: unknown, key: string): string {
  const found = asRecord(value)[key];
  if (typeof found !== "string") throw new Error(`Response did not contain ${key}: ${JSON.stringify(value)}`);
  return found;
}

function findStringByKey(value: unknown, key: string): string | undefined {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findStringByKey(item, key);
      if (found) return found;
    }
    return undefined;
  }
  const record = asRecord(value);
  if (typeof record[key] === "string") return record[key] as string;
  for (const child of Object.values(record)) {
    const found = findStringByKey(child, key);
    if (found) return found;
  }
  return undefined;
}
