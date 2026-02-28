"""
Explain router — POST /api/explain (proxy to AI service)
"""

from __future__ import annotations
import os
import logging
from typing import Optional

import httpx
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter()

AI_SERVICE_URL = os.getenv("AI_SERVICE_URL", "http://localhost:8001")


class ExplainRequest(BaseModel):
    session_id: str
    element_type: str
    element_name: str
    context: Optional[str] = None


@router.post("/api/explain")
async def explain(req: ExplainRequest):
    """Proxy explain request to the AI service."""
    from store.sessions import sessions

    if req.session_id not in sessions:
        return JSONResponse(status_code=404, content={"success": False, "error": "Session not found"})

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{AI_SERVICE_URL}/ai/explain",
                json={
                    "session_id": req.session_id,
                    "element_type": req.element_type,
                    "element_name": req.element_name,
                    "context": req.context,
                },
                timeout=90.0,
            )
            resp.raise_for_status()
            data = resp.json()
            return {
                "explanation": data.get("explanation", ""),
                "links": data.get("links", []),
            }
    except httpx.HTTPError as e:
        logger.error(f"AI explain proxy error: {e}")
        return JSONResponse(
            status_code=502,
            content={"success": False, "error": "AI service unavailable"},
        )
