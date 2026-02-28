"""
Impact router — POST /api/impact (uses stored NetworkX graph, no AI call)
"""

from __future__ import annotations
import logging

import networkx as nx
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter()


class ImpactRequest(BaseModel):
    session_id: str
    file_path: str


def _classify_impact(path: str) -> bool:
    """Check if a file path looks like a config file."""
    lower = path.lower()
    return any(
        keyword in lower
        for keyword in ("config", "settings", "constants", ".env")
    )


@router.post("/api/impact")
async def impact(req: ImpactRequest):
    """Compute impact preview for a file using the stored file-level graph."""
    from store.sessions import sessions

    session = sessions.get(req.session_id)
    if not session:
        return JSONResponse(status_code=404, content={"success": False, "error": "Session not found"})

    if session.status != "done":
        return JSONResponse(status_code=202, content={"success": True, "data": {"status": "processing"}})

    file_graph = session.file_graph
    if file_graph is None or req.file_path not in file_graph:
        return JSONResponse(
            status_code=404,
            content={"success": False, "error": f"File '{req.file_path}' not found in the dependency graph"},
        )

    target = req.file_path

    # Direct dependents (files that import this file)
    try:
        direct = set(file_graph.predecessors(target))
    except nx.NetworkXError:
        direct = set()

    # All transitive dependents
    try:
        all_ancestors = nx.ancestors(file_graph, target)
    except nx.NetworkXError:
        all_ancestors = set()

    transitive = all_ancestors - direct

    affected = []

    for f in direct:
        level = "config" if _classify_impact(f) else "direct"
        affected.append({
            "path": f,
            "level": level,
            "reason": f"Directly imports {target}",
        })

    for f in transitive:
        level = "config" if _classify_impact(f) else "transitive"
        affected.append({
            "path": f,
            "level": level,
            "reason": f"Transitively depends on {target}",
        })

    return {
        "targetFile": target,
        "affected": affected,
    }
