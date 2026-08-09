# Infinite Cinema ADK Agent

This directory contains the full agent workflow used to prove grounded, controlled timeline generation on Google Cloud.

## Workflow

The deployed runtime is one coordinating ADK `LlmAgent` named `infinite_cinema_director`. It performs the reasoning stages in order while enforcing two tool boundaries:

1. Analyze the shared shot as Scene DNA.
2. Call Parallel exactly once to retrieve public-domain canon facts.
3. Write exactly three causal beats for the what-if timeline.
4. Define continuity rules for a future video render.
5. Call the manifest approval tool exactly once.
6. Return an owner-approved manifest with `veo_started: false`.

Veo is not called by this agent. Video rendering remains a separate owner-only action so analysis cannot unexpectedly create paid video jobs.

## Deployed runtime

```text
projects/559444263891/locations/us-central1/reasoningEngines/3172303801633734656
```

Runtime limits:

- minimum instances: 0
- maximum instances: 1
- CPU: 1
- memory: 1 GiB

## Local use

Create the environment and install the agent dependencies:

```bash
cd agent
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

From the repository root, configure `.env` with the Google Cloud project, region, model, and Parallel secret reference. Then run the local smoke test:

```bash
cd agent
source .venv/bin/activate
python test_local.py
```

Deployment and remote verification utilities are kept in this directory for reproducibility. Do not put raw API keys in committed files; use Google Secret Manager.
