"""Unit tests for non-billable deterministic agent tools."""

import sys
from types import SimpleNamespace

from infinite_cinema_agent.tools import create_render_manifest, search_public_domain_canon


def test_render_manifest_never_starts_veo() -> None:
    tool_context = SimpleNamespace(state={})
    manifest = create_render_manifest("Juliet wakes early", "prompt", "negative", tool_context)
    assert manifest["requires_owner_approval"] is True
    assert manifest["veo_started"] is False
    assert manifest["duration_seconds"] == 6
    assert tool_context.state["render_manifest"] == manifest


def test_parallel_tool_fails_closed_without_key(monkeypatch) -> None:
    monkeypatch.delenv("PARALLEL_API_KEY", raising=False)
    result = search_public_domain_canon("Romeo and Juliet Act V", "Juliet wakes early")
    assert result["status"] == "configuration_required"
    assert result["results"] == []


def test_parallel_tool_uses_one_bounded_search(monkeypatch) -> None:
    calls = []

    class FakeParallel:
        def __init__(self, api_key: str) -> None:
            assert api_key == "test-key"

        def search(self, **kwargs):
            calls.append(kwargs)
            item = SimpleNamespace(title="Source", url="https://example.com", excerpts=["Text"])
            return SimpleNamespace(results=[item] * 7, search_id="search-1")

    monkeypatch.setenv("PARALLEL_API_KEY", "test-key")
    monkeypatch.setitem(sys.modules, "parallel", SimpleNamespace(Parallel=FakeParallel))

    result = search_public_domain_canon("Romeo and Juliet Act V", "Juliet wakes early")

    assert result["status"] == "ok"
    assert len(calls) == 1
    assert calls[0]["mode"] == "turbo"
    assert calls[0]["max_chars_total"] == 6_000
    assert len(result["results"]) == 5
