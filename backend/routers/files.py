"""
Files router — GET /api/file/{session_id} — serve cached source file content.
"""

from __future__ import annotations
import logging

from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse

from store.sessions import sessions

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/api/file/{session_id}")
async def get_file_content(session_id: str, path: str = Query(..., description="Relative file path")):
    """Return the content of a cached source or config file."""
    session = sessions.get(session_id)
    if not session:
        return JSONResponse(status_code=404, content={"success": False, "error": "Session not found"})

    content = session.file_contents.get(path)
    if content is None:
        return JSONResponse(
            status_code=404,
            content={"success": False, "error": "File not found or not cached"},
        )

    return {"success": True, "path": path, "content": content}
