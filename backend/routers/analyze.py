"""
Analyze router — POST /api/analyze, WebSocket /ws/{session_id}, GET /api/result/{session_id}
"""

from __future__ import annotations
import uuid
import logging
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, File, Form, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse

from models.session import SessionData
from store.sessions import sessions
from utils.progress import progress_manager
from pipeline.orchestrator import run_pipeline

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/api/analyze")
async def analyze(
    background_tasks: BackgroundTasks,
    github_url: Optional[str] = Form(default=None),
    file: Optional[UploadFile] = File(default=None),
):
    """Accept a GitHub URL or ZIP upload, start analysis pipeline in background."""
    if not github_url and not file:
        return JSONResponse(
            status_code=400,
            content={"success": False, "error": "Provide either github_url or a ZIP file"},
        )

    session_id = str(uuid.uuid4())
    session = SessionData(session_id=session_id)
    sessions[session_id] = session

    # Start pipeline in background
    background_tasks.add_task(run_pipeline, session_id, github_url, file)

    return {"session_id": session_id}


@router.websocket("/ws/{session_id}")
async def websocket_progress(ws: WebSocket, session_id: str):
    """Stream ProgressEvent JSON as the pipeline runs."""
    logger.info(f"WebSocket connection request for session {session_id}")

    # Always accept first — rejecting without accept causes 403.
    await ws.accept()

    # Wait up to 5 seconds for the session to be created (race with POST /api/analyze)
    import asyncio
    for _ in range(10):
        if session_id in sessions:
            break
        await asyncio.sleep(0.5)

    if session_id not in sessions:
        logger.warning(f"WebSocket: session {session_id} not found after waiting, closing")
        await ws.close(code=4004, reason="Session not found")
        return

    logger.info(f"WebSocket: session {session_id} connected")
    await progress_manager.connect(session_id, ws, already_accepted=True)
    try:
        while True:
            try:
                await ws.receive_text()
            except WebSocketDisconnect:
                break
    except Exception:
        pass
    finally:
        await progress_manager.disconnect(session_id, ws)


@router.get("/api/result/{session_id}")
async def get_result(session_id: str):
    """Return the full AnalysisResult or status code."""
    session = sessions.get(session_id)
    if not session:
        return JSONResponse(status_code=404, content={"success": False, "error": "Session not found"})

    if session.status == "processing":
        return JSONResponse(status_code=202, content={"success": True, "data": {"status": "processing"}})

    if session.status == "error":
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": session.error or "Pipeline failed"},
        )

    return {"success": True, "data": session.result}
