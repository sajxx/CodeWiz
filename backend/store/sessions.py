"""
In-memory session store.
"""

from models.session import SessionData

sessions: dict[str, SessionData] = {}
