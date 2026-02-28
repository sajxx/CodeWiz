"""POST /ai/flows — agentic loop produces execution flows."""

from __future__ import annotations

import json
import logging
from typing import Any, Optional

from fastapi import APIRouter
from pydantic import BaseModel

from ai.agent.loop import run_agent
from ai.agent.prompts import FLOWS_SYSTEM, build_flows_user

logger = logging.getLogger(__name__)
router = APIRouter()


class FlowsRequest(BaseModel):
    session_id: str
    entry_points: list[str]
    module_graph: dict[str, Any]


class FlowStep(BaseModel):
    id: str
    label: str
    type: str  # service | decision | entry | exit | database
    description: Optional[str] = None
    moduleId: Optional[str] = None


class Flow(BaseModel):
    id: str
    name: str
    steps: list[FlowStep]


class FlowsResponse(BaseModel):
    flows: list[Flow]


@router.post("/ai/flows", response_model=FlowsResponse)
async def flows(req: FlowsRequest):
    """Generate 1-3 execution flows via the agentic loop."""
    user_prompt = build_flows_user(req.entry_points, req.module_graph)

    raw = run_agent(
        session_id=req.session_id,
        system_prompt=FLOWS_SYSTEM,
        user_prompt=user_prompt,
    )

    if not raw:
        logger.warning("Agent returned empty response for flows")
        return FlowsResponse(flows=[])

    try:
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned[3:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            cleaned = cleaned.strip()

        data = json.loads(cleaned)
        flows_out: list[Flow] = []
        for f in data.get("flows", []):
            steps = [
                FlowStep(
                    id=s.get("id", ""),
                    label=s.get("label", ""),
                    type=s.get("type", "service"),
                    description=s.get("description"),
                    moduleId=s.get("moduleId"),
                )
                for s in f.get("steps", [])
            ]
            flows_out.append(Flow(id=f.get("id", ""), name=f.get("name", ""), steps=steps))
        return FlowsResponse(flows=flows_out)

    except (json.JSONDecodeError, AttributeError, TypeError) as exc:
        logger.warning("Failed to parse flows JSON: %s — raw: %s", exc, (raw or "")[:200])
        return FlowsResponse(flows=[])
