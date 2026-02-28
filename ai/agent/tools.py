"""Tool functions used by the agentic loop: search_codebase, get_module_files, get_file_content."""

from __future__ import annotations

import logging
from typing import Any

from ai.rag.embedder import embed_query
from ai.rag.store import query_collection
from ai.store.sessions import ai_sessions

logger = logging.getLogger(__name__)


def search_codebase(session_id: str, query: str, n_results: int = 5) -> str:
    """Query ChromaDB and return top N chunks as formatted context string."""
    try:
        query_emb = embed_query(query)
        chunks = query_collection(session_id, query_emb, n_results=n_results)
        if not chunks:
            return "No relevant code found."

        parts: list[str] = []
        for c in chunks:
            fp = c["metadata"].get("file_path", "unknown")
            parts.append(f"FILE: {fp}\n{c['content']}\n---")
        return "\n".join(parts)
    except Exception as exc:
        logger.error("search_codebase failed: %s", exc)
        return "Search failed."


def get_module_files(session_id: str, module_name: str) -> str:
    """Look up the session's module list and return all file paths in that module."""
    session = ai_sessions.get(session_id)
    if not session:
        return f"No session found for {session_id}"

    for mod in session.modules:
        if mod.get("name", "").lower() == module_name.lower() or mod.get("id", "").lower() == module_name.lower():
            files = mod.get("files", [])
            if files:
                return "\n".join(files)
            return f"No files recorded for module '{module_name}'."

    # Fuzzy fallback: check if module_name is a substring
    for mod in session.modules:
        if module_name.lower() in mod.get("name", "").lower():
            files = mod.get("files", [])
            if files:
                return "\n".join(files)

    return f"Module '{module_name}' not found in session."


def get_file_content(session_id: str, file_path: str) -> str:
    """Read the actual file content from the stored session data."""
    session = ai_sessions.get(session_id)
    if not session:
        return f"No session found for {session_id}"

    content = session.files.get(file_path)
    if content is not None:
        # Truncate very large files to avoid blowing up context
        if len(content) > 10000:
            return content[:10000] + "\n... [truncated]"
        return content

    # Try normalising path separators
    normalised = file_path.replace("\\", "/")
    for stored_path, stored_content in session.files.items():
        if stored_path.replace("\\", "/") == normalised:
            if len(stored_content) > 10000:
                return stored_content[:10000] + "\n... [truncated]"
            return stored_content

    return f"File '{file_path}' not found in session."


# ── Dispatcher ───────────────────────────────────────────────────────────────

TOOL_FUNCTIONS = {
    "search_codebase": search_codebase,
    "get_module_files": get_module_files,
    "get_file_content": get_file_content,
}


def execute_tool(session_id: str, tool_name: str, args: dict[str, Any]) -> str:
    """Execute a tool by name with the given args."""
    fn = TOOL_FUNCTIONS.get(tool_name)
    if fn is None:
        return f"Unknown tool: {tool_name}"

    # Inject session_id into the call
    if tool_name == "search_codebase":
        return fn(session_id, args.get("query", ""), args.get("n_results", 5))
    elif tool_name == "get_module_files":
        return fn(session_id, args.get("module_name", ""))
    elif tool_name == "get_file_content":
        return fn(session_id, args.get("file_path", ""))
    return "Tool execution error."
