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
        # Track latest progress state per session so late-connecting clients
        # can receive events for steps that already completed.
        self._step_state: dict[str, dict[str, dict]] = {}
        self._lock = asyncio.Lock()

    async def connect(self, session_id: str, ws: WebSocket, already_accepted: bool = False):
        if not already_accepted:
            await ws.accept()
        async with self._lock:
            self._connections.setdefault(session_id, []).append(ws)
            # Replay all previously recorded step states to the new client
            states = self._step_state.get(session_id, {})
        for _step, event in states.items():
            try:
                await ws.send_text(json.dumps(event))
            except Exception:
                pass

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
            # Record the latest state for this step so late-joiners get it
            self._step_state.setdefault(session_id, {})[step] = event
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
            self._step_state.pop(session_id, None)
        for ws in conns:
            try:
                await ws.close()
            except Exception:
                pass


# Singleton instance
progress_manager = ProgressManager()
