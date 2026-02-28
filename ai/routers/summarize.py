"""POST /ai/summarize — agentic loop produces architecture summary."""

from __future__ import annotations

import json
import logging

from fastapi import APIRouter
from pydantic import BaseModel

from ai.agent.loop import run_agent
from ai.agent.prompts import SUMMARIZE_SYSTEM, build_summarize_user

logger = logging.getLogger(__name__)
router = APIRouter()


class SummarizeRequest(BaseModel):
    session_id: str
    file_tree_summary: str


class SummarizeResponse(BaseModel):
    architecture_summary: str


@router.post("/ai/summarize", response_model=SummarizeResponse)
async def summarize(req: SummarizeRequest):
    """Generate a 3-sentence architecture summary via the agentic loop."""
    user_prompt = build_summarize_user(req.file_tree_summary)

    raw = run_agent(
        session_id=req.session_id,
        system_prompt=SUMMARIZE_SYSTEM,
        user_prompt=user_prompt,
    )

    # Parse JSON output
    try:
        # Strip markdown code fences if present
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned[3:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            cleaned = cleaned.strip()
        data = json.loads(cleaned)
        summary = data.get("architecture_summary", "")
    except (json.JSONDecodeError, AttributeError) as exc:
        logger.warning("Failed to parse summarize JSON: %s — raw: %s", exc, raw[:200])
        # Fallback: use the raw text as the summary
        summary = raw.strip() if raw else "Unable to generate architecture summary."

    return SummarizeResponse(architecture_summary=summary)
