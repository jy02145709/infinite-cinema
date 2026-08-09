"""Deterministic tools used by the Infinite Cinema agents."""

from __future__ import annotations

import os
from typing import Any

from google.adk.tools import ToolContext


def search_public_domain_canon(story: str, changed_event: str) -> dict[str, Any]:
    """Search the live web for traceable sources about a public-domain story.

    Use this before writing an alternative timeline. The result supplies source
    URLs and excerpts that the canon researcher must cite. This tool intentionally
    performs one bounded Parallel Search request to control latency and cost.

    Args:
        story: Public-domain work and scene to research.
        changed_event: The exact event the user's What-if proposes to change.

    Returns:
        A compact dictionary containing source titles, URLs, and excerpts.
    """
    api_key = os.environ.get("PARALLEL_API_KEY")
    if not api_key:
        return {
            "status": "configuration_required",
            "message": "Set PARALLEL_API_KEY before running canon research.",
            "results": [],
        }

    from parallel import Parallel

    client = Parallel(api_key=api_key)
    response = client.search(
        objective=(
            f"Verify the original plot event in the public-domain work {story}. "
            f"Focus on primary text or reputable literary sources relevant to: {changed_event}."
        ),
        search_queries=[
            f"{story} full text {changed_event}",
            f"{story} plot original ending public domain",
        ],
        mode="turbo",
        max_chars_total=6_000,
    )
    results = []
    for item in response.results[:5]:
        results.append(
            {
                "title": item.title,
                "url": item.url,
                "excerpts": list(item.excerpts[:2]),
            }
        )
    return {
        "status": "ok",
        "search_id": getattr(response, "search_id", None),
        "results": results,
    }


def create_render_manifest(
    changed_event: str,
    generation_prompt: str,
    negative_prompt: str,
    tool_context: ToolContext,
) -> dict[str, Any]:
    """Create a non-billable Veo render manifest for human approval.

    This tool never invokes Veo. A separate owner-only UI action must confirm the
    estimated cost before the existing render endpoint may submit the request.
    """
    manifest = {
        "changed_event": changed_event,
        "generation_prompt": generation_prompt,
        "negative_prompt": negative_prompt,
        "model": "veo-3.1-generate-001",
        "duration_seconds": 6,
        "resolution": "720p",
        "aspect_ratio": "16:9",
        "estimated_cost_usd": 2.40,
        "requires_owner_approval": True,
        "veo_started": False,
    }
    tool_context.state["render_manifest"] = manifest
    return manifest
