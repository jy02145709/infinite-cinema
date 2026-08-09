"""Deploy Infinite Cinema to Vertex AI Agent Engine with strict cost limits."""

from __future__ import annotations

import os
from pathlib import Path

import vertexai
from vertexai import agent_engines

from infinite_cinema_agent.agent import root_agent


def required(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def main() -> None:
    project = required("GOOGLE_CLOUD_PROJECT")
    location = os.environ.get("GOOGLE_CLOUD_LOCATION", "us-central1")
    secret_id = os.environ.get("PARALLEL_SECRET_ID", "parallel-api-key")
    staging_bucket = required("AGENT_STAGING_BUCKET")
    wheel = next(Path(".").glob("infinite_cinema_agent-*.whl"))

    client = vertexai.Client(project=project, location=location)
    app = agent_engines.AdkApp(agent=root_agent)
    config = {
            "display_name": "Infinite Cinema",
            "description": "Canon-aware What-if cinema workflow using Gemini, ADK, and Parallel.",
            "staging_bucket": staging_bucket,
            "requirements": [
                "google-adk==2.6.3",
                "google-cloud-aiplatform[agent_engines,adk]==1.163.0",
                "parallel-web==1.1.0",
                "cloudpickle==3.1.2",
                "pydantic==2.13.4",
                wheel.name,
            ],
            "extra_packages": [str(wheel)],
            "env_vars": {
                "PARALLEL_API_KEY": {"secret": secret_id, "version": "latest"},
                "GOOGLE_GENAI_USE_VERTEXAI": "true",
            },
            # The default is one warm instance and up to 100. The demo uses
            # scale-to-zero and a single smallest instance instead.
            "min_instances": 0,
            "max_instances": 1,
            "resource_limits": {"cpu": "1", "memory": "1Gi"},
            "container_concurrency": 3,
        }
    engine_id = os.environ.get("AGENT_ENGINE_ID")
    if engine_id:
        name = f"projects/{project}/locations/{location}/reasoningEngines/{engine_id}"
        remote = client.agent_engines.update(name=name, agent=app, config=config)
    else:
        remote = client.agent_engines.create(agent=app, config=config)
    print(remote.api_resource.name)


if __name__ == "__main__":
    main()
