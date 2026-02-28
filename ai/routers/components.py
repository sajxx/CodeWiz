"""POST /ai/components — batched module role descriptions."""

from __future__ import annotations

import json
import logging
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel

from ai.agent.prompts import COMPONENTS_SYSTEM, build_components_user
from ai.store.sessions import get_or_create_session

logger = logging.getLogger(__name__)
router = APIRouter()


class ModuleInput(BaseModel):
    id: str
    name: str
    files: list[str]


class ComponentsRequest(BaseModel):
    session_id: str
    modules: list[ModuleInput]


class ModuleRole(BaseModel):
    id: str
    role: str


class ComponentsResponse(BaseModel):
    modules: list[ModuleRole]


@router.post("/ai/components", response_model=ComponentsResponse)
async def components(req: ComponentsRequest):
    """Generate one-sentence role per module in a single batched Gemini call."""
    # Store module metadata in session for agent tool lookups
    session = get_or_create_session(req.session_id)
    session.modules = [m.model_dump() for m in req.modules]

    modules_data = [{"id": m.id, "name": m.name, "files": m.files} for m in req.modules]
    user_prompt = build_components_user(modules_data)

    try:
        from ai.main import client, GEMINI_MODEL
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=user_prompt,
            config={"system_instruction": COMPONENTS_SYSTEM},
        )
        raw = response.text

        # Parse JSON
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned[3:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            cleaned = cleaned.strip()

        data = json.loads(cleaned)
        modules_out = [
            ModuleRole(id=m["id"], role=m.get("role", "Unknown role"))
            for m in data.get("modules", [])
        ]
        return ComponentsResponse(modules=modules_out)

    except Exception as exc:
        logger.error("Components generation failed: %s", exc)
        # Graceful fallback: return empty roles
        return ComponentsResponse(
            modules=[ModuleRole(id=m.id, role="") for m in req.modules]
        )
