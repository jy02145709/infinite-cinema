import "dotenv/config";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { GoogleAuth } from "google-auth-library";

const project = required("GOOGLE_CLOUD_PROJECT");
const location = process.env.GOOGLE_CLOUD_LOCATION ?? "us-central1";
const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
const videoPath = resolve(process.env.SCENE_VIDEO ?? "outputs/shot-01.mp4");
const outputPath = resolve(process.env.SCENE_ANALYSIS_OUTPUT ?? "outputs/scene-pipeline.json");
const whatIf = process.env.WHAT_IF ?? "What if Juliet woke up 5 seconds earlier?";

const video = await readFile(videoPath);
const auth = new GoogleAuth({ scopes: ["https://www.googleapis.com/auth/cloud-platform"] });
const client = await auth.getClient();
const accessToken = await client.getAccessToken();
if (!accessToken.token) throw new Error("Application Default Credentials did not return an access token.");

console.log(`Model: ${model}`);
console.log(`Video: ${videoPath}`);
console.log(`What-if: ${whatIf}`);

const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/${model}:generateContent`;
const response = await fetch(endpoint, {
  method: "POST",
  headers: { Authorization: `Bearer ${accessToken.token}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    systemInstruction: {
      parts: [{ text: "You are the continuity director for Infinite Cinema. Analyze only what is visibly supported by the supplied clip. Separate observations from story inference. Preserve character identity, costumes, environment, lighting, composition, and camera language. Return concise production-ready JSON matching the schema exactly." }],
    },
    contents: [{
      role: "user",
      parts: [
        { inlineData: { mimeType: "video/mp4", data: video.toString("base64") } },
        { text: `Analyze this shared setup clip, then create a short alternative timeline for: ${whatIf}\nThe output clip must be 6 seconds, silent, use one continuous shot, and finish at the moment Romeo lowers the untouched poison vial after noticing Juliet wake.` },
      ],
    }],
    generationConfig: { temperature: 0.2, maxOutputTokens: 4096, responseMimeType: "application/json", responseSchema: getSchema() },
  }),
});

const payload = await response.json() as GeminiResponse;
if (!response.ok) throw new Error(`Gemini ${response.status}: ${JSON.stringify(payload, null, 2)}`);
const text = payload.candidates?.[0]?.content?.parts?.find((part) => typeof part.text === "string")?.text;
if (!text) throw new Error(`Gemini returned no JSON text: ${JSON.stringify(payload, null, 2)}`);

const result = JSON.parse(text) as Record<string, unknown>;
const final = { generatedAt: new Date().toISOString(), project, location, model: payload.modelVersion ?? model, sourceVideo: videoPath, whatIf, usage: payload.usageMetadata ?? null, ...result };
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(final, null, 2)}\n`);
console.log(`Saved: ${outputPath}`);

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Set ${name} in .env.`);
  return value;
}

type GeminiResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  modelVersion?: string;
  usageMetadata?: Record<string, number>;
  error?: unknown;
};

function getSchema() {
  return {
  type: "OBJECT",
  required: ["sceneDNA", "alternativeTimeline"],
  properties: {
    sceneDNA: {
      type: "OBJECT",
      required: ["summary", "characters", "location", "visualStyle", "storyState", "continuityLocks", "observedObjects"],
      properties: {
        summary: { type: "STRING" },
        characters: { type: "ARRAY", items: { type: "OBJECT", required: ["id", "appearance", "emotion", "action"], properties: { id: { type: "STRING" }, appearance: { type: "STRING" }, emotion: { type: "STRING" }, action: { type: "STRING" } } } },
        location: { type: "STRING" },
        visualStyle: { type: "OBJECT", required: ["lighting", "colorTone", "camera", "pacing"], properties: { lighting: { type: "STRING" }, colorTone: { type: "STRING" }, camera: { type: "STRING" }, pacing: { type: "STRING" } } },
        storyState: { type: "OBJECT", required: ["currentSituation", "impliedOriginalOutcome", "branchPoint"], properties: { currentSituation: { type: "STRING" }, impliedOriginalOutcome: { type: "STRING" }, branchPoint: { type: "STRING" } } },
        continuityLocks: { type: "ARRAY", items: { type: "STRING" } },
        observedObjects: { type: "ARRAY", items: { type: "STRING" } },
      },
    },
    alternativeTimeline: {
      type: "OBJECT",
      required: ["changedEvent", "newOutcome", "mustPreserve", "beats", "generationPrompt", "negativePrompt"],
      properties: {
        changedEvent: { type: "STRING" }, newOutcome: { type: "STRING" }, mustPreserve: { type: "ARRAY", items: { type: "STRING" } },
        beats: { type: "ARRAY", items: { type: "OBJECT", required: ["startSecond", "endSecond", "action", "camera"], properties: { startSecond: { type: "NUMBER" }, endSecond: { type: "NUMBER" }, action: { type: "STRING" }, camera: { type: "STRING" } } } },
        generationPrompt: { type: "STRING" }, negativePrompt: { type: "STRING" },
      },
    },
  },
  } as const;
}
