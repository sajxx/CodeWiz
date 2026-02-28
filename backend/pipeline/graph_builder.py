"""
Stage 5 — Graph Builder: Construct NetworkX graphs from parsed imports.
"""

from __future__ import annotations
import logging
import os
import uuid
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Optional

import networkx as nx

logger = logging.getLogger(__name__)

# ── Node type classification ─────────────────────────────────────────
ENTRY_FILES = {"main.py", "index.ts", "index.js", "app.py", "server.js", "index.tsx", "index.jsx"}
CONFIG_DIRS = {"config", "settings", "constants", "env"}
UTILITY_DIRS = {"utils", "helpers", "lib", "common", "shared"}


def _classify_module(folder_path: str, files_in_module: list[str]) -> str:
    """Determine GraphNodeType for a module folder."""
    folder_name = os.path.basename(folder_path).lower() if folder_path else ""

    # Check for entry-point files
    for f in files_in_module:
        if os.path.basename(f).lower() in ENTRY_FILES:
            return "entry"

    if folder_name in CONFIG_DIRS:
        return "config"
    if folder_name in UTILITY_DIRS:
        return "utility"
    return "core"


@dataclass
class GraphBuildResult:
    module_graph: nx.DiGraph
    file_graph: nx.DiGraph
    graph_data: dict  # { nodes: [...], edges: [...] }
    file_to_module: dict[str, str] = field(default_factory=dict)


def build_graphs(
    import_map: dict[str, list[str]],
    source_files: list[str],
) -> GraphBuildResult:
    """Build module-level and file-level dependency graphs.

    Args:
        import_map: file_path -> [imported_file_path, ...]
        source_files: all source file relative paths
    """
    # ── Group files by parent folder (module) ─────────────────────────
    module_files: dict[str, list[str]] = defaultdict(list)
    file_to_module: dict[str, str] = {}

    for f in source_files:
        parent = os.path.dirname(f) or "."
        module_files[parent].append(f)
        file_to_module[f] = parent

    # ── Build file-level graph ────────────────────────────────────────
    file_graph = nx.DiGraph()
    for f in source_files:
        file_graph.add_node(f)

    for source_file, imports in import_map.items():
        for target_file in imports:
            if target_file in file_graph:
                file_graph.add_edge(source_file, target_file)

    # ── Build module-level graph ──────────────────────────────────────
    module_graph = nx.DiGraph()
    for mod_path, files in module_files.items():
        node_type = _classify_module(mod_path, files)
        module_graph.add_node(
            mod_path,
            label=os.path.basename(mod_path) or mod_path,
            type=node_type,
            file_count=len(files),
        )

    # Count cross-module imports
    cross_module_edges: dict[tuple[str, str], int] = defaultdict(int)
    for source_file, imports in import_map.items():
        src_mod = file_to_module.get(source_file)
        if src_mod is None:
            continue
        for target_file in imports:
            tgt_mod = file_to_module.get(target_file)
            if tgt_mod is None or tgt_mod == src_mod:
                continue
            cross_module_edges[(src_mod, tgt_mod)] += 1

    for (src, tgt), count in cross_module_edges.items():
        module_graph.add_edge(src, tgt, weight=count)

    # ── Serialize to GraphData ────────────────────────────────────────
    nodes = []
    for mod_path in module_graph.nodes:
        data = module_graph.nodes[mod_path]
        nodes.append({
            "id": mod_path,
            "label": data.get("label", mod_path),
            "type": data.get("type", "core"),
            "moduleId": mod_path,
            "filePath": mod_path,
        })

    edges = []
    for src, tgt, data in module_graph.edges(data=True):
        edges.append({
            "id": f"{src}->{tgt}",
            "source": src,
            "target": tgt,
            "importCount": data.get("weight", 1),
        })

    graph_data = {"nodes": nodes, "edges": edges}

    logger.info(
        f"Graph built: {len(nodes)} module nodes, {len(edges)} edges, "
        f"{file_graph.number_of_nodes()} file nodes"
    )

    return GraphBuildResult(
        module_graph=module_graph,
        file_graph=file_graph,
        graph_data=graph_data,
        file_to_module=file_to_module,
    )
