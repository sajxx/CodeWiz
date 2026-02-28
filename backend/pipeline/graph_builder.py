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
ENTRY_FILES = {
    "main.py", "index.ts", "index.js", "app.py", "server.js", "server.ts",
    "index.tsx", "index.jsx", "app.ts", "app.tsx", "app.js", "app.jsx",
    "manage.py", "wsgi.py", "asgi.py", "cli.py", "main.ts",
}
CONFIG_DIRS = {"config", "settings", "constants", "env", "configuration", "configs"}
UTILITY_DIRS = {"utils", "helpers", "lib", "common", "shared", "util", "helper", "tools"}
ROUTER_DIRS = {"routes", "routers", "controllers", "handlers", "endpoints", "api", "views"}
MODEL_DIRS = {"models", "entities", "schemas", "types", "domain", "dto"}
MIDDLEWARE_DIRS = {"middleware", "middlewares", "interceptors", "guards", "pipes", "filters"}
SERVICE_DIRS = {"services", "service", "providers", "usecases", "use_cases", "business"}
DATA_DIRS = {"repositories", "repository", "dal", "dao", "database", "db", "store", "stores", "persistence"}
TEST_DIRS = {"tests", "test", "__tests__", "spec", "specs", "e2e", "integration", "unit"}
COMPONENT_DIRS = {"components", "widgets", "ui", "elements", "atoms", "molecules", "organisms"}
PAGE_DIRS = {"pages", "views", "screens", "features"}
STATIC_DIRS = {"public", "static", "assets", "dist", "build", "out"}


def _classify_module(folder_path: str, files_in_module: list[str]) -> str:
    """Determine GraphNodeType for a module folder.

    Extended classification that recognises routers, models, services,
    middleware, data layers, tests, components and pages in addition to the
    original entry / config / utility categories.
    """
    folder_name = os.path.basename(folder_path).lower() if folder_path else ""

    # Check for entry-point files
    for f in files_in_module:
        if os.path.basename(f).lower() in ENTRY_FILES:
            return "entry"

    if folder_name in CONFIG_DIRS:
        return "config"
    if folder_name in UTILITY_DIRS:
        return "utility"
    # Extended classifications — all map to "core" for the type system but
    # we store a richer label in node metadata.  The GraphNodeType union
    # currently only has core/utility/entry/config so we keep the type as
    # "core" while enriching the label.
    return "core"


def _module_role_hint(folder_name: str) -> str:
    """Return a human-friendly role hint string based on folder name."""
    fl = folder_name.lower()
    if fl in ROUTER_DIRS:
        return "routing"
    if fl in MODEL_DIRS:
        return "data-model"
    if fl in MIDDLEWARE_DIRS:
        return "middleware"
    if fl in SERVICE_DIRS:
        return "business-logic"
    if fl in DATA_DIRS:
        return "data-access"
    if fl in TEST_DIRS:
        return "testing"
    if fl in COMPONENT_DIRS:
        return "ui-component"
    if fl in PAGE_DIRS:
        return "page/view"
    if fl in STATIC_DIRS:
        return "static-asset"
    if fl in CONFIG_DIRS:
        return "configuration"
    if fl in UTILITY_DIRS:
        return "utility"
    return ""


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

    # ── Collapse single-file leaf modules into their parent ───────────
    # If a directory has exactly one file and no sub-directories with files,
    # merge it into its parent module to reduce graph noise.
    to_merge: list[str] = []
    for mod_path, files in list(module_files.items()):
        if mod_path == ".":
            continue
        if len(files) == 1:
            parent = os.path.dirname(mod_path) or "."
            # Only merge if the parent also exists as a module
            if parent in module_files:
                to_merge.append(mod_path)
    for mod_path in to_merge:
        files = module_files.pop(mod_path)
        parent = os.path.dirname(mod_path) or "."
        module_files[parent].extend(files)
        for f in files:
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
        folder_name = os.path.basename(mod_path) or mod_path
        role_hint = _module_role_hint(folder_name)

        # Compute per-module stats for richer metadata
        in_degree = 0  # filled after edges are added
        out_degree = 0

        module_graph.add_node(
            mod_path,
            label=folder_name,
            type=node_type,
            file_count=len(files),
            role_hint=role_hint,
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

    # ── Prune isolated nodes with no edges and ≤1 file ────────────────
    # These clutter the graph without adding information.
    isolates = [
        n for n in list(nx.isolates(module_graph))
        if module_graph.nodes[n].get("file_count", 0) <= 1
        and module_graph.nodes[n].get("type") != "entry"
    ]
    module_graph.remove_nodes_from(isolates)

    # ── Compute hub score: nodes with high in/out degree ──────────────
    for node in module_graph.nodes:
        module_graph.nodes[node]["in_degree"] = module_graph.in_degree(node)
        module_graph.nodes[node]["out_degree"] = module_graph.out_degree(node)

    # ── Serialize to GraphData ────────────────────────────────────────
    nodes = []
    for mod_path in module_graph.nodes:
        data = module_graph.nodes[mod_path]
        label = data.get("label", mod_path)
        role = data.get("role_hint", "")
        if role:
            label = f"{label} ({role})"
        nodes.append({
            "id": mod_path,
            "label": label,
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
        f"{file_graph.number_of_nodes()} file nodes "
        f"(pruned {len(isolates)} isolated leaf modules)"
    )

    return GraphBuildResult(
        module_graph=module_graph,
        file_graph=file_graph,
        graph_data=graph_data,
        file_to_module=file_to_module,
    )
