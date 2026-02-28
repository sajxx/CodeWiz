"""
Chat router — POST /api/chat (proxy to AI service)
"""

from __future__ import annotations
import os
import logging

import httpx
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter()

AI_SERVICE_URL = os.getenv("AI_SERVICE_URL", "http://localhost:8001")


class ChatRequest(BaseModel):
    session_id: str
    message: str
    history: list[dict] = []


@router.post("/api/chat")
async def chat(req: ChatRequest):
    """Proxy chat request to the AI service."""
    from store.sessions import sessions

    if req.session_id not in sessions:
        return JSONResponse(status_code=404, content={"success": False, "error": "Session not found"})

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{AI_SERVICE_URL}/ai/chat",
                json={
                    "session_id": req.session_id,
                    "message": req.message,
                    "history": req.history,
                },
                timeout=90.0,
            )
            resp.raise_for_status()
            data = resp.json()
            return {"reply": data.get("reply", "")}
    except httpx.HTTPError as e:
        logger.error(f"AI chat proxy error: {e}")
        return JSONResponse(
            status_code=502,
            content={"success": False, "error": "AI service unavailable"},
        )
