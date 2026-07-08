"""Taxonomy + guardrail routing invariants."""
from __future__ import annotations

from app.agents.intent_classifier import INTENT_CATEGORIES
from app.agents.orchestrator import _INTENT_TO_NODE, _route_decision


def test_off_topic_is_a_known_intent():
    assert "off_topic" in INTENT_CATEGORIES


def test_off_topic_routes_to_guardrail_node():
    assert _INTENT_TO_NODE.get("off_topic") == "execute_off_topic"
    assert _route_decision({"intent": "off_topic"}) == "execute_off_topic"


def test_unknown_intent_still_falls_back_to_general():
    assert _route_decision({"intent": "nonsense"}) == "execute_general"
