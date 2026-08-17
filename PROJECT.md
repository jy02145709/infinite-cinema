# Infinite Cinema — Project Brief

## One-line pitch

Infinite Cinema transforms one counterfactual question about a familiar public-domain scene into a canon-aware alternate timeline, a visual comparison, and a panel of AI audience reactions.

## Demo scenario

- Source: *Romeo and Juliet*
- Question: **What if Juliet woke up 5 seconds earlier?**
- Shared setup: Juliet appears lifeless while Romeo approaches with poison.
- Original branch: Romeo drinks before Juliet wakes.
- Alternate branch: Juliet wakes first, reaches him, and stops the fatal action.

The demo deliberately changes one causal event. Character identity, costumes, setting, lighting, camera language, and emotional tone remain continuous across both branches.

## Product experience

1. Watch a shared cinematic setup.
2. Switch between the original tragedy and alternate timeline.
3. Inspect the Scene DNA and three-beat causal explanation.
4. Generate a new timeline with Gemini or load the verified demonstration.
5. Read verdicts from three AI Audience personas:
   - **The Romantic** — emotional payoff
   - **The Critic** — story causality
   - **The Continuity Fan** — visual consistency

## Implemented architecture

### Fast interactive path

The deployed web route calls Gemini 2.5 Flash on Vertex AI once. Structured output contains:

- Scene DNA
- exactly three alternate-timeline beats
- continuity instructions
- AI Audience scores, verdicts, consensus, and overall score

This path exists to return reliably within the hosted site's response-time limit. It is authenticated and protected by per-user and global daily quotas.

### Full agent path

A single ADK `LlmAgent`, `infinite_cinema_director`, is deployed on Vertex AI Agent Engine. It coordinates the full reasoning flow:

```text
Scene analysis
  -> Parallel canon research (one tool call)
  -> What-if timeline
  -> continuity direction
  -> owner-approved render manifest (one tool call)
```

Deployment:

```text
projects/559444263891/locations/us-central1/reasoningEngines/3172303801633734656
```

The remote Agent Engine run has been verified. It generates the manifest with `veo_started: false`; video generation is intentionally outside the automatic agent loop.

## Safety and budget boundary

- The hosted judging demo is publicly accessible.
- Gemini generation: 3 requests per user per day, 20 globally per day.
- AI Audience shares the same Gemini response and does not create an extra model call.
- Agent Engine: minimum 0 instances, maximum 1 instance, 1 CPU, 1 GiB memory.
- Parallel: exactly one canon search in the full agent workflow.
- Veo: owner-only, explicit confirmation checkbox, one render per day, maximum estimate shown before approval.
- No automatic retry may trigger a second video render.

## Hackathon proof points

- Google Cloud is central: Vertex AI Gemini, Vertex AI Agent Engine, ADK, and Veo.
- Parallel adds grounded public-domain canon context before the alternate timeline is written.
- The output is inspectable: viewers see Scene DNA, causal beats, continuity rules, and audience evaluation rather than only a generated clip.
- The safety model separates inexpensive analysis from expensive video generation.

## Current milestone

The end-to-end concept is implemented and deployed: comparison video, interactive timeline generation, independently verified ADK + Parallel agent workflow, AI Audience evaluation, and a public 2:03 demo video. The remaining milestone is the Devpost form and final signed-out link verification—not additional product scope.

## Submission checklist

- [x] Original and alternate video comparison
- [x] Vertex AI Gemini structured timeline generation
- [x] ADK agent deployed to Vertex AI Agent Engine
- [x] Parallel canon research integrated and verified
- [x] Owner approval boundary before Veo
- [x] AI Audience verdict panel
- [x] Daily quotas and visible cost guardrails
- [x] Public judging visibility enabled
- [x] Record and publish the final demo video
- [x] Capture architecture and Agent Engine evidence for submission
- [x] Prepare copy-ready Devpost submission text
- [ ] Submit the Devpost project form
- [ ] Recheck public links in a signed-out browser
