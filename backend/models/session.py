"""
SessionData — holds analysis result, graphs, and temp dir for each session.
"""

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Any, Optional
import networkx as nx


@dataclass
class SessionData:
    session_id: str
    status: str = "processing"  # "processing" | "done" | "error"
    temp_dir: Optional[str] = None
    repo_url: Optional[str] = None
    project_name: str = ""

    # Pipeline outputs
    source_files: list[str] = field(default_factory=list)
    config_files: list[str] = field(default_factory=list)
    file_tree: dict = field(default_factory=dict)
    tech_stack: list[dict] = field(default_factory=list)
    import_map: dict[str, list[str]] = field(default_factory=dict)

    # Graphs
    module_graph: Optional[nx.DiGraph] = None
    file_graph: Optional[nx.DiGraph] = None
    graph_data: Optional[dict] = None

    # Complexity
    complexity_scores: list[dict] = field(default_factory=list)

    # AI outputs
    architecture_summary: str = ""
    modules: list[dict] = field(default_factory=list)
    execution_flows: list[dict] = field(default_factory=list)
    checklist: list[dict] = field(default_factory=list)

    # File contents cache (path -> content) for serving to frontend
    file_contents: dict[str, str] = field(default_factory=dict)

    # Final assembled result
    result: Optional[dict] = None
    error: Optional[str] = None
