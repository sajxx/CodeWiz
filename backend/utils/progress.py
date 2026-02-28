"""
WebSocket progress manager — broadcasts ProgressEvent to connected clients.
"""

from __future__ import annotations
import asyncio
import json
import logging
from typing import Optional
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ProgressManager:
    """Manages WebSocket connections per session and broadcasts progress events."""

    def __init__(self):
        self._connections: dict[str, list[WebSocket]] = {}
        self._lock = asyncio.Lock()

    async def connect(self, session_id: str, ws: WebSocket):
        await ws.accept()
        async with self._lock:
            self._connections.setdefault(session_id, []).append(ws)

    async def disconnect(self, session_id: str, ws: WebSocket):
        async with self._lock:
            conns = self._connections.get(session_id, [])
            if ws in conns:
                conns.remove(ws)
            if not conns:
                self._connections.pop(session_id, None)

    async def broadcast(
        self,
        session_id: str,
        step: str,
        status: str,
        message: Optional[str] = None,
    ):
        """Send a ProgressEvent JSON to all WebSocket clients for a session."""
        event = {"step": step, "status": status}
        if message:
            event["message"] = message
        payload = json.dumps(event)

        async with self._lock:
            conns = list(self._connections.get(session_id, []))

        dead: list[WebSocket] = []
        for ws in conns:
            try:
                await ws.send_text(payload)
            except Exception:
                dead.append(ws)

        if dead:
            async with self._lock:
                conns = self._connections.get(session_id, [])
                for ws in dead:
                    if ws in conns:
                        conns.remove(ws)

    async def close_all(self, session_id: str):
        """Close all WebSocket connections for a session."""
        async with self._lock:
            conns = list(self._connections.pop(session_id, []))
        for ws in conns:
            try:
                await ws.close()
            except Exception:
                pass


# Singleton instance
progress_manager = ProgressManager()
