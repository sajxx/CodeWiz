"""
Stage 7 — Orchestrator: Call AI service endpoints sequentially, assemble AnalysisResult.
"""

from __future__ import annotations
import logging
import os
import shutil
from datetime import datetime, timezone
from typing import Optional

import httpx
import networkx as nx

from models.session import SessionData
from store.sessions import sessions
from utils.progress import progress_manager
from pipeline.ingestor import ingest_github, ingest_zip
from pipeline.scanner import scan_directory
from pipeline.tech_detector import detect_tech_stack
from pipeline.parser import parse_imports
from pipeline.graph_builder import build_graphs
from pipeline.complexity import calculate_complexity

logger = logging.getLogger(__name__)

AI_SERVICE_URL = os.getenv("AI_SERVICE_URL", "http://localhost:8001")
MAX_REPO_SIZE_MB = int(os.getenv("MAX_REPO_SIZE_MB", "100"))
MAX_FILES_ANALYSED = int(os.getenv("MAX_FILES_ANALYSED", "500"))

# ── Pipeline step names (matching shared/types.ts ProgressEvent) ──────
STEPS = [
    "Cloning Repository",
    "Scanning Files",
    "Detecting Tech Stack",
    "Parsing Imports",
    "Building Dependency Graph",
    "Calculating Complexity Scores",
    "Running AI Analysis",
    "Indexing to Knowledge Base",
    "Generating Checklist",
]


async def _send_progress(session_id: str, step: str, status: str, message: str = ""):
    await progress_manager.broadcast(session_id, step, status, message or None)


async def _ai_post(client: httpx.AsyncClient, path: str, payload: dict) -> Optional[dict]:
    """POST to the AI service. Returns None on failure."""
    try:
        url = f"{AI_SERVICE_URL}{path}"
        resp = await client.post(url, json=payload, timeout=90.0)
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        logger.warning(f"AI service call to {path} failed: {e}")
        return None


def _build_modules(
    module_graph: nx.DiGraph,
    complexity_scores: list[dict],
    import_map: dict[str, list[str]],
    file_to_module: dict[str, str],
    ai_components: Optional[list[dict]] = None,
) -> list[dict]:
    """Build Module list matching the shared TypeScript interface."""
    # Index AI roles by module id
    ai_roles = {}
    if ai_components:
        for comp in ai_components:
            ai_roles[comp.get("id", "")] = comp.get("role", "")

    # Index complexity scores by module id
    score_map = {s["moduleId"]: s for s in complexity_scores}

    # Reverse map: module -> files
    module_files: dict[str, list[str]] = {}
    for f, mod in file_to_module.items():
        module_files.setdefault(mod, []).append(f)

    modules = []
    for mod_path in module_graph.nodes:
        data = module_graph.nodes[mod_path]
        files = module_files.get(mod_path, [])
        score = score_map.get(mod_path, {})

        # Build services (one per file in the module)
        services = []
        for f in files:
            deps = import_map.get(f, [])
            services.append({
                "id": f,
                "name": os.path.basename(f),
                "path": f,
                "role": "",
                "dependencies": deps,
            })

        modules.append({
            "id": mod_path,
            "name": os.path.basename(mod_path) or mod_path,
            "path": mod_path,
            "role": ai_roles.get(mod_path, ""),
            "fileCount": len(files),
            "services": services,
            "complexityScore": score,
            "riskLevel": score.get("riskLevel", "low"),
        })

    return modules


async def run_pipeline(session_id: str, github_url: Optional[str] = None, upload_file=None):
    """Run the full 7-stage analysis pipeline as a background task."""
    session = sessions.get(session_id)
    if not session:
        return

    temp_dir = None

    try:
        # ── Stage 1: Ingest ───────────────────────────────────────────
        await _send_progress(session_id, STEPS[0], "active", "Starting repository ingestion…")
        try:
            if github_url:
                temp_dir = await ingest_github(github_url, MAX_REPO_SIZE_MB)
                session.repo_url = github_url
                session.project_name = github_url.rstrip("/").split("/")[-1].replace(".git", "")
            elif upload_file:
                temp_dir = await ingest_zip(upload_file, MAX_REPO_SIZE_MB)
                session.project_name = upload_file.filename or "uploaded-project"
                session.project_name = session.project_name.replace(".zip", "")
            else:
                raise ValueError("No GitHub URL or ZIP file provided")

            session.temp_dir = temp_dir
        except Exception as e:
            await _send_progress(session_id, STEPS[0], "error", str(e))
            session.status = "error"
            session.error = str(e)
            return
        await _send_progress(session_id, STEPS[0], "done", "Repository ingested successfully")

        # ── Stage 2: Scan ─────────────────────────────────────────────
        await _send_progress(session_id, STEPS[1], "active", "Scanning file tree…")
        try:
            scan_result = scan_directory(temp_dir, MAX_FILES_ANALYSED)
            session.source_files = scan_result.source_files
            session.config_files = scan_result.config_files
            session.file_tree = scan_result.file_tree
        except Exception as e:
            await _send_progress(session_id, STEPS[1], "error", str(e))
            session.status = "error"
            session.error = str(e)
            return
        await _send_progress(
            session_id, STEPS[1], "done",
            f"Found {len(session.source_files)} source files"
        )

        # ── Stage 3: Tech Detection ──────────────────────────────────
        await _send_progress(session_id, STEPS[2], "active", "Detecting tech stack…")
        try:
            session.tech_stack = detect_tech_stack(
                temp_dir, session.config_files, session.source_files
            )
        except Exception as e:
            await _send_progress(session_id, STEPS[2], "error", str(e))
            session.tech_stack = []
        await _send_progress(
            session_id, STEPS[2], "done",
            f"Detected {len(session.tech_stack)} technologies"
        )

        # ── Stage 4: Parse Imports ────────────────────────────────────
        await _send_progress(session_id, STEPS[3], "active", "Parsing imports…")
        try:
            session.import_map = parse_imports(temp_dir, session.source_files)
        except Exception as e:
            await _send_progress(session_id, STEPS[3], "error", str(e))
            session.import_map = {}
        await _send_progress(session_id, STEPS[3], "done", "Imports parsed")

        # ── Stage 5: Build Graph ──────────────────────────────────────
        await _send_progress(session_id, STEPS[4], "active", "Building dependency graph…")
        try:
            graph_result = build_graphs(session.import_map, session.source_files)
            session.module_graph = graph_result.module_graph
            session.file_graph = graph_result.file_graph
            session.graph_data = graph_result.graph_data
            file_to_module = graph_result.file_to_module
        except Exception as e:
            await _send_progress(session_id, STEPS[4], "error", str(e))
            session.module_graph = nx.DiGraph()
            session.file_graph = nx.DiGraph()
            session.graph_data = {"nodes": [], "edges": []}
            file_to_module = {}
        await _send_progress(session_id, STEPS[4], "done", "Dependency graph built")

        # ── Stage 6: Complexity ───────────────────────────────────────
        await _send_progress(session_id, STEPS[5], "active", "Calculating complexity…")
        try:
            session.complexity_scores = calculate_complexity(
                temp_dir, session.module_graph, session.source_files, file_to_module
            )
        except Exception as e:
            await _send_progress(session_id, STEPS[5], "error", str(e))
            session.complexity_scores = []
        await _send_progress(session_id, STEPS[5], "done", "Complexity scores calculated")

        # ── Stage 7: AI Orchestration ─────────────────────────────────
        # Prepare context for AI calls
        file_tree_summary = session.file_tree
        tech_names = [t["name"] for t in session.tech_stack]
        module_summaries = []
        for score in session.complexity_scores:
            module_summaries.append({
                "id": score["moduleId"],
                "name": score["name"],
                "fileCount": score["fileCount"],
                "riskLevel": score["riskLevel"],
            })

        ai_context = {
            "projectName": session.project_name,
            "techStack": tech_names,
            "modules": module_summaries,
            "fileTree": file_tree_summary,
            "graph": session.graph_data,
            "complexityScores": session.complexity_scores,
            "sessionId": session_id,
        }

        async with httpx.AsyncClient() as client:
            # 7a: Summarize
            await _send_progress(session_id, STEPS[6], "active", "AI: Generating architecture summary…")
            summary_resp = await _ai_post(client, "/ai/summarize", ai_context)
            if summary_resp:
                session.architecture_summary = summary_resp.get("architecture_summary", "")
            else:
                session.architecture_summary = "AI analysis unavailable — the AI service could not be reached."
            await _send_progress(session_id, STEPS[6], "done", "Architecture summary generated")

            # 7b: Components
            await _send_progress(session_id, STEPS[6], "active", "AI: Analyzing components…")
            comp_resp = await _ai_post(client, "/ai/components", ai_context)
            ai_components = comp_resp.get("modules", []) if comp_resp else []

            # 7c: Complexity commentary
            await _send_progress(session_id, STEPS[6], "active", "AI: Adding complexity commentary…")
            complexity_resp = await _ai_post(client, "/ai/complexity", ai_context)
            if complexity_resp:
                commentaries = complexity_resp.get("commentary", [])
                commentary_map = {c["moduleId"]: c.get("aiCommentary", "") for c in commentaries}
                for score in session.complexity_scores:
                    ai_comment = commentary_map.get(score["moduleId"])
                    if ai_comment:
                        score["aiCommentary"] = ai_comment

            # 7d: Execution flows
            await _send_progress(session_id, STEPS[6], "active", "AI: Mapping execution flows…")
            flows_resp = await _ai_post(client, "/ai/flows", ai_context)
            session.execution_flows = flows_resp.get("flows", []) if flows_resp else []
            await _send_progress(session_id, STEPS[6], "done", "AI analysis complete")

            # 7e: Index to knowledge base
            await _send_progress(session_id, STEPS[7], "active", "Indexing to knowledge base…")
            # Read source file contents for indexing
            source_contents = {}
            for f in session.source_files[:100]:  # Limit for indexing
                from utils.file_utils import safe_read_file
                content = safe_read_file(os.path.join(temp_dir, f))
                if content:
                    source_contents[f] = content

            index_payload = {
                **ai_context,
                "sourceFiles": source_contents,
            }
            index_resp = await _ai_post(client, "/ai/index", index_payload)
            indexed = index_resp.get("indexed_count", 0) if index_resp else 0
            await _send_progress(
                session_id, STEPS[7], "done",
                f"Indexed {indexed} files to knowledge base"
            )

            # 7f: Checklist
            await _send_progress(session_id, STEPS[8], "active", "Generating onboarding checklist…")
            checklist_resp = await _ai_post(client, "/ai/checklist", ai_context)
            session.checklist = checklist_resp.get("checklist", []) if checklist_resp else []
            await _send_progress(session_id, STEPS[8], "done", "Checklist generated")

        # ── Assemble final AnalysisResult ─────────────────────────────
        modules = _build_modules(
            session.module_graph,
            session.complexity_scores,
            session.import_map,
            file_to_module,
            ai_components,
        )
        session.modules = modules

        session.result = {
            "sessionId": session_id,
            "projectName": session.project_name,
            "repositoryUrl": session.repo_url,
            "analyzedAt": datetime.now(timezone.utc).isoformat(),
            "techStack": session.tech_stack,
            "architectureSummary": session.architecture_summary,
            "modules": modules,
            "graph": session.graph_data,
            "complexityScores": session.complexity_scores,
            "executionFlows": session.execution_flows,
            "checklist": session.checklist,
        }
        session.status = "done"
        logger.info(f"Pipeline complete for session {session_id}")

    except Exception as e:
        logger.exception(f"Pipeline failed for session {session_id}: {e}")
        session.status = "error"
        session.error = str(e)
        # Send error progress for current step
        await _send_progress(session_id, "Running AI Analysis", "error", str(e))

    finally:
        # Clean up temp directory
        if temp_dir and os.path.exists(temp_dir):
            # Walk up to find the codelens_ prefix dir
            parent = temp_dir
            while parent and not os.path.basename(parent).startswith("codelens_"):
                parent = os.path.dirname(parent)
            if parent:
                shutil.rmtree(parent, ignore_errors=True)
            else:
                shutil.rmtree(temp_dir, ignore_errors=True)
            session.temp_dir = None
            logger.info(f"Cleaned up temp dir for session {session_id}")

        # Close WebSocket connections
        await progress_manager.close_all(session_id)
