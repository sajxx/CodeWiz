"""POST /ai/checklist — template-based checklist with Gemini placeholder filling."""

from __future__ import annotations

import json
import logging
from typing import Any, Optional

from fastapi import APIRouter
from pydantic import BaseModel

from ai.agent.prompts import CHECKLIST_SYSTEM, build_checklist_user
from ai.templates.checklist_templates import TEMPLATES

logger = logging.getLogger(__name__)
router = APIRouter()


class ChecklistRequest(BaseModel):
    session_id: str
    project_type: str
    detected_files: list[str]


class ChecklistItem(BaseModel):
    id: str
    label: str
    filePath: Optional[str] = None
    isRequired: bool


class ChecklistPhase(BaseModel):
    phase: str  # read | setup | start
    title: str
    items: list[ChecklistItem]


class ChecklistResponse(BaseModel):
    checklist: list[ChecklistPhase]


@router.post("/ai/checklist", response_model=ChecklistResponse)
async def checklist(req: ChecklistRequest):
    """Select template by project_type, call Gemini to fill placeholders."""
    template = TEMPLATES.get(req.project_type, TEMPLATES["generic"])
    user_prompt = build_checklist_user(template, req.detected_files, req.project_type)

    try:
        from ai.main import client, GEMINI_MODEL
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=user_prompt,
            config={"system_instruction": CHECKLIST_SYSTEM},
        )
        raw = response.text

        cleaned = raw.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned[3:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            cleaned = cleaned.strip()

        data = json.loads(cleaned)
        phases: list[ChecklistPhase] = []
        for p in data.get("checklist", []):
            items = [
                ChecklistItem(
                    id=item.get("id", ""),
                    label=item.get("label", ""),
                    filePath=item.get("filePath"),
                    isRequired=item.get("isRequired", True),
                )
                for item in p.get("items", [])
            ]
            phases.append(
                ChecklistPhase(
                    phase=p.get("phase", "read"),
                    title=p.get("title", ""),
                    items=items,
                )
            )
        return ChecklistResponse(checklist=phases)

    except Exception as exc:
        logger.error("Checklist generation failed: %s", exc)
        return ChecklistResponse(checklist=[])
