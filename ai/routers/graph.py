"""POST /ai/graph — agentic loop refines the dependency graph with AI metadata."""

from __future__ import annotations

import json
import logging
from typing import Any, Optional

from fastapi import APIRouter
from pydantic import BaseModel

from ai.agent.loop import run_agent
from ai.agent.prompts import GRAPH_SYSTEM, build_graph_user

logger = logging.getLogger(__name__)
router = APIRouter()


class GraphRefineRequest(BaseModel):
    session_id: str
    graph_data: dict[str, Any]
    tech_stack: list[str] = []
    architecture_summary: str = ""
    component_roles: dict[str, str] = {}


class RefinedNode(BaseModel):
    id: str
    label: str
    type: str
    description: str = ""
    group: str = ""
    importance: int = 3


class RefinedEdge(BaseModel):
    id: str
    label: str = ""


class GraphRefineResponse(BaseModel):
    nodes: list[RefinedNode]
    edges: list[RefinedEdge]


@router.post("/ai/graph", response_model=GraphRefineResponse)
async def refine_graph(req: GraphRefineRequest):
    """Refine the dependency graph via the agentic loop."""
    user_prompt = build_graph_user(
        req.graph_data,
        tech_stack=req.tech_stack,
        architecture_summary=req.architecture_summary,
        component_roles=req.component_roles,
    )

    raw = run_agent(
        session_id=req.session_id,
        system_prompt=GRAPH_SYSTEM,
        user_prompt=user_prompt,
    )

    if not raw:
        logger.warning("Agent returned empty response for graph refinement")
        return GraphRefineResponse(nodes=[], edges=[])

    try:
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned[3:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            cleaned = cleaned.strip()

        data = json.loads(cleaned)

        nodes_out = [
            RefinedNode(
                id=n.get("id", ""),
                label=n.get("label", ""),
                type=n.get("type", "core"),
                description=n.get("description", ""),
                group=n.get("group", ""),
                importance=max(1, min(5, int(n.get("importance", 3)))),
            )
            for n in data.get("nodes", [])
        ]

        edges_out = [
            RefinedEdge(
                id=e.get("id", ""),
                label=e.get("label", ""),
            )
            for e in data.get("edges", [])
        ]

        return GraphRefineResponse(nodes=nodes_out, edges=edges_out)

    except (json.JSONDecodeError, AttributeError, TypeError) as exc:
        logger.warning("Failed to parse graph refinement JSON: %s — raw: %s", exc, (raw or "")[:200])
        return GraphRefineResponse(nodes=[], edges=[])
