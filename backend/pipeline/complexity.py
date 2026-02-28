"""
Stage 6 — Complexity: Calculate static complexity metrics and risk levels.
"""

from __future__ import annotations
import logging
import os
from typing import Optional

import networkx as nx

from utils.file_utils import safe_read_file

logger = logging.getLogger(__name__)


def _count_lines(root_dir: str, file_path: str) -> int:
    """Count lines in a file."""
    full_path = os.path.join(root_dir, file_path)
    content = safe_read_file(full_path)
    if content is None:
        return 0
    return len(content.splitlines())


def _coupling_level(in_degree: int) -> str:
    if in_degree > 5:
        return "Very High"
    if in_degree > 3:
        return "High"
    if in_degree > 1:
        return "Medium"
    return "Low"


def _risk_level(coupling: int, dependency_count: int) -> str:
    if coupling > 5 or dependency_count > 8:
        return "critical"
    if coupling > 3 or dependency_count > 5:
        return "high"
    if coupling > 1 or dependency_count > 3:
        return "medium"
    return "low"


def calculate_complexity(
    root_dir: str,
    module_graph: nx.DiGraph,
    source_files: list[str],
    file_to_module: dict[str, str],
) -> list[dict]:
    """Calculate ComplexityScore for each module.

    Returns a list of ComplexityScore dicts with aiCommentary set to None.
    """
    # Group files by module
    module_files: dict[str, list[str]] = {}
    for f in source_files:
        mod = file_to_module.get(f, os.path.dirname(f) or ".")
        module_files.setdefault(mod, []).append(f)

    scores = []
    for mod_path in module_graph.nodes:
        files = module_files.get(mod_path, [])
        file_count = len(files)

        # Average lines
        if file_count > 0:
            total_lines = sum(_count_lines(root_dir, f) for f in files)
            avg_lines = round(total_lines / file_count, 1)
        else:
            avg_lines = 0

        # Graph metrics
        out_deg = module_graph.out_degree(mod_path)  # how many modules this imports
        in_deg = module_graph.in_degree(mod_path)    # how many modules import this

        coupling = _coupling_level(in_deg)
        risk = _risk_level(in_deg, out_deg)

        scores.append({
            "moduleId": mod_path,
            "name": os.path.basename(mod_path) or mod_path,
            "fileCount": file_count,
            "dependencyCount": out_deg,
            "couplingScore": in_deg,
            "couplingLevel": coupling,
            "avgLines": avg_lines,
            "riskLevel": risk,
            "aiCommentary": None,
        })

    logger.info(f"Computed complexity for {len(scores)} modules")
    return scores
