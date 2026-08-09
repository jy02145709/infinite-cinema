# Infinite Cinema

Infinite Cinema is a canon-aware alternate-timeline cinema demo. It asks a small counterfactual question about a familiar public-domain story, preserves the original scene's visual DNA, and turns the answer into a short, render-ready timeline.

Current demo question:

> What if Juliet woke up 5 seconds earlier?

The original branch ends in tragedy. The alternate branch makes one precise causal change: Juliet wakes before Romeo drinks and stops him.

## Current state

- The comparison experience is deployed as a public judging demo; paid Veo rendering remains owner-only.
- Three short Veo clips provide the shared setup, original ending, and alternate ending.
- The interactive path uses Gemini 2.5 Flash on Vertex AI and returns Scene DNA, three timeline beats, continuity guidance, and an AI Audience verdict in one request.
- A Google ADK agent is separately deployed and verified on Vertex AI Agent Engine.
- The deployed agent uses Parallel once for public-domain canon research and produces an owner-approved render manifest without starting Veo.
- Veo rendering remains a separate, explicit, owner-only action with a daily limit and displayed maximum cost.

Demo: <https://infinite-cinema-demo.jy02145709.chatgpt.site/?v=16>

Demo video: <https://youtu.be/7quv4-HezwY>

License: [MIT](LICENSE)

## Architecture

```text
Interactive demo
  Login + daily limits
    -> Gemini 2.5 Flash on Vertex AI
      -> Scene DNA
      -> What-if timeline (exactly 3 beats)
      -> Continuity rules
      -> AI Audience verdict
    -> Original / alternate comparison UI

Verified agent workflow
  ADK Director on Vertex AI Agent Engine
    -> Parallel public-domain canon search (exactly once)
    -> Render manifest approval tool (exactly once)
    -> Owner-approved manifest
    -> Veo remains off
```

The two paths are intentional. The interactive route is optimized for the hosted UI's response-time limit. The full ADK + Parallel workflow demonstrates the deeper agent architecture independently and has been remotely verified on Agent Engine.

## Repository map

```text
assets/        source images and generated references
config/        demo and shot configuration
docs/          prompts and runtime notes
output/        generated video files and metadata
scripts/       Vertex AI and Veo utilities
agent/         ADK agent and deployment utilities
web/           deployed comparison experience
DEMO.md        90-second judging script and fallback plan
SUBMISSION.md  submission-ready project description
```

## Cost and safety controls

- Authentication is required.
- Timeline generation is limited per user and globally per day.
- AI Audience is included in the existing Gemini request, so it does not add another model invocation.
- Agent Engine scales to zero and is capped at one instance.
- Veo never starts during analysis. Rendering requires an explicit owner confirmation and is limited to one run per day.
- The UI shows a maximum estimated render cost before approval.

## Local setup

Copy the environment template and fill only the services you intend to run:

```bash
cp .env.example .env
npm install
```

Google Cloud prerequisites:

```bash
gcloud auth application-default login
gcloud auth application-default set-quota-project YOUR_PROJECT_ID
gcloud services enable aiplatform.googleapis.com
```

Run the web app from `web/` or follow [agent/README.md](agent/README.md) to inspect the verified ADK workflow.

## Submission

- Use the completed public demo video and the copy-ready fields in `SUBMISSION.md`.
- Keep Veo approval disabled during judging unless a paid render is deliberately required.
