import "dotenv/config";
import { GoogleAuth } from "google-auth-library";

const project = process.env.GOOGLE_CLOUD_PROJECT;
const location = process.env.GOOGLE_CLOUD_LOCATION ?? "us-central1";

if (!project || project === "your-project-id") {
  throw new Error("Set GOOGLE_CLOUD_PROJECT in .env first.");
}

const auth = new GoogleAuth({ scopes: ["https://www.googleapis.com/auth/cloud-platform"] });
const client = await auth.getClient();
const token = await client.getAccessToken();

if (!token.token) throw new Error("Application Default Credentials did not return an access token.");

const serviceUrl = `https://serviceusage.googleapis.com/v1/projects/${project}/services/aiplatform.googleapis.com`;
const response = await fetch(serviceUrl, { headers: { Authorization: `Bearer ${token.token}` } });
const body = await response.json() as { state?: string; error?: { message?: string } };

if (!response.ok) throw new Error(body.error?.message ?? `Service Usage check failed (${response.status}).`);

console.log(`ADC: ready`);
console.log(`Project: ${project}`);
console.log(`Location: ${location}`);
console.log(`Vertex AI API: ${body.state ?? "unknown"}`);
console.log("Veo model access is confirmed only by a generation request; Google does not expose a separate preflight endpoint.");
