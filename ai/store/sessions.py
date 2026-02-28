"""In-memory session store for the AI service."""

from __future__ import annotations

from typing import Any


class AISessionData:
    """Holds runtime data for a single analysis session."""

    def __init__(self, session_id: str) -> None:
        self.session_id = session_id
        # Module metadata provided by the backend for tool lookups
        self.modules: list[dict[str, Any]] = []
        # Flat file content cache: path -> content
        self.files: dict[str, str] = {}
        # Detected project type (react-frontend, node-express-api, etc.)
        self.project_type: str = "generic"


# Global session registry – keyed by session_id
ai_sessions: dict[str, AISessionData] = {}


def get_or_create_session(session_id: str) -> AISessionData:
    """Return existing session or create a new one."""
    if session_id not in ai_sessions:
        ai_sessions[session_id] = AISessionData(session_id)
    return ai_sessions[session_id]
