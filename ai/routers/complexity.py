"""POST /ai/complexity — risk commentary for critical/high modules only."""

from __future__ import annotations

import json
import logging
from typing import Any, Optional

from fastapi import APIRouter
from pydantic import BaseModel

from ai.agent.prompts import COMPLEXITY_SYSTEM, build_complexity_user

logger = logging.getLogger(__name__)
router = APIRouter()


class ComplexityScoreInput(BaseModel):
    moduleId: str
    name: str
    fileCount: int
    dependencyCount: int
    couplingScore: float
    couplingLevel: str
    avgLines: float
    riskLevel: str
    aiCommentary: Optional[str] = None


class ComplexityRequest(BaseModel):
    session_id: str
    scores: list[ComplexityScoreInput]


class CommentaryItem(BaseModel):
    moduleId: str
    aiCommentary: str


class ComplexityResponse(BaseModel):
    commentary: list[CommentaryItem]


@router.post("/ai/complexity", response_model=ComplexityResponse)
async def complexity(req: ComplexityRequest):
    """Generate AI commentary ONLY for 'critical' and 'high' risk modules."""
    # Filter to only critical and high risk
    high_risk = [s for s in req.scores if s.riskLevel in ("critical", "high")]

    if not high_risk:
        return ComplexityResponse(commentary=[])

    scores_data = [s.model_dump() for s in high_risk]
    user_prompt = build_complexity_user(scores_data)

    try:
        from ai.main import client, GEMINI_MODEL
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=user_prompt,
            config={"system_instruction": COMPLEXITY_SYSTEM},
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
        items = [
            CommentaryItem(
                moduleId=c["moduleId"],
                aiCommentary=c.get("aiCommentary", ""),
            )
            for c in data.get("commentary", [])
        ]
        return ComplexityResponse(commentary=items)

    except Exception as exc:
        logger.error("Complexity commentary failed: %s", exc)
        return ComplexityResponse(commentary=[])
