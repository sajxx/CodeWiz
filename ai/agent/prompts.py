"""All system prompts and prompt-builder functions."""

from __future__ import annotations

import json
from typing import Any

# ── Shared rules appended to every Gemini prompt ────────────────────────────

_COMMON_RULES = (
    "Do not hallucinate file paths, function names, or module names. "
    "If you are unsure, say so briefly."
)

_LINK_RULES = (
    "Return ONLY official documentation URLs from domains like docs.*, "
    "developer.*, readthedocs.io, or pkg.go.dev. Never return blog posts, "
    "Stack Overflow, Medium, or DEV.to links. If no official doc exists, omit the link."
)

# ── Architecture summary ────────────────────────────────────────────────────

SUMMARIZE_SYSTEM = (
    "You are a senior software architect analyzing an unfamiliar codebase."
)

def build_summarize_user(file_tree_summary: str) -> str:
    return (
        f"Given this file tree structure:\n{file_tree_summary}\n\n"
        "Search the codebase to understand:\n"
        "1. The application's entry points\n"
        "2. The data/persistence layer\n"
        "3. The request handling / routing layer\n\n"
        "Then write a 3-sentence architecture summary.\n"
        "Be concise. Maximum 60 words per sentence.\n"
        f"{_COMMON_RULES}\n"
        "Respond ONLY with valid JSON matching this schema: "
        '{ "architecture_summary": string }'
    )

# ── Components (module roles) ───────────────────────────────────────────────

COMPONENTS_SYSTEM = "You are a senior software architect."

def build_components_user(modules: list[dict[str, Any]]) -> str:
    modules_json = json.dumps(modules, indent=2)
    return (
        "For each module below, write a one-sentence role description (max 15 words).\n"
        f"Modules:\n{modules_json}\n\n"
        "Be concise. Maximum 15 words per field.\n"
        f"{_COMMON_RULES}\n"
        "Respond ONLY with valid JSON matching this schema: "
        '{ "modules": [{ "id": string, "role": string }] }'
    )

# ── Complexity commentary ───────────────────────────────────────────────────

COMPLEXITY_SYSTEM = "You are a senior software engineer specialising in code quality."

def build_complexity_user(scores: list[dict[str, Any]]) -> str:
    scores_json = json.dumps(scores, indent=2)
    return (
        "For each module below, write 1-2 sentence risk commentary "
        "explaining why it has high complexity and what could be improved.\n"
        f"Modules:\n{scores_json}\n\n"
        "Be concise. Maximum 30 words per module.\n"
        f"{_COMMON_RULES}\n"
        "Respond ONLY with valid JSON matching this schema: "
        '{ "commentary": [{ "moduleId": string, "aiCommentary": string }] }'
    )

# ── Execution flows ─────────────────────────────────────────────────────────

FLOWS_SYSTEM = (
    "You are a senior software architect tracing execution flows in an unfamiliar codebase. "
    "You decide which flows are most important to visualise based on the tech stack, "
    "architecture, and module graph. Focus on the key user-facing or system-critical "
    "paths, not trivial utility calls."
)

def build_flows_user(
    entry_points: list[str],
    module_graph: dict[str, Any],
    *,
    tech_stack: list[str] | None = None,
    architecture_summary: str = "",
    component_roles: dict[str, str] | None = None,
) -> str:
    parts: list[str] = []

    if architecture_summary:
        parts.append(f"Architecture summary: {architecture_summary}")
    if tech_stack:
        parts.append(f"Tech stack: {', '.join(tech_stack)}")
    parts.append(f"Entry points: {json.dumps(entry_points)}")
    if component_roles:
        parts.append(f"Module roles: {json.dumps(component_roles)}")
    parts.append(f"Module graph: {json.dumps(module_graph)}")

    context_block = "\n".join(parts)

    return (
        f"{context_block}\n\n"
        "Based on the architecture, tech stack, and module graph above, decide which "
        "execution flows are the most important to visualise for a new developer "
        "trying to understand this codebase. Consider:\n"
        "- The main user request lifecycle (e.g. HTTP request → controller → service → DB → response)\n"
        "- Authentication / authorisation flow (if present)\n"
        "- Data processing or build pipeline (if applicable)\n"
        "- Background job or event-driven flow (if applicable)\n\n"
        "Search the codebase to confirm how requests actually flow between modules. "
        "Produce 1-3 execution flows. Each flow should have 4-10 ordered steps. "
        "Use 'decision' type for branching logic (e.g. auth checks, error handling). "
        "Use 'database' type for any persistence or cache operations. "
        "Every flow MUST start with an 'entry' step and end with an 'exit' step.\n"
        "Give each step a clear, descriptive label (max 15 words) and a short "
        "description field explaining what happens at that step.\n"
        f"{_COMMON_RULES}\n"
        "Respond ONLY with valid JSON matching this schema:\n"
        '{ "flows": [{ "id": string, "name": string, '
        '"steps": [{ "id": string, "label": string, '
        '"type": "service"|"decision"|"entry"|"exit"|"database", '
        '"description": string, "moduleId": string (optional) }] }] }'
    )

# ── Checklist ────────────────────────────────────────────────────────────────

CHECKLIST_SYSTEM = "You are a developer onboarding specialist."

def build_checklist_user(
    template: list[dict[str, Any]],
    detected_files: list[str],
    project_type: str,
) -> str:
    return (
        f"Project type: {project_type}\n"
        f"Detected files in the repo:\n{json.dumps(detected_files[:50])}\n\n"
        f"Checklist template with placeholders:\n{json.dumps(template, indent=2)}\n\n"
        "Replace every placeholder (e.g. {{entry_point}}, {{config_file}}) with the "
        "most appropriate real file from the detected files list. "
        "If no matching file exists, use a reasonable default.\n"
        "Be concise. Maximum 20 words per item label.\n"
        f"{_COMMON_RULES}\n"
        "Respond ONLY with valid JSON matching this schema:\n"
        '{ "checklist": [{ "phase": "read"|"setup"|"start", '
        '"title": string, "items": [{ "id": string, "label": string, '
        '"filePath": string (optional), "isRequired": boolean }] }] }'
    )

# ── Explain ──────────────────────────────────────────────────────────────────

EXPLAIN_SYSTEM = (
    "You are a senior developer explaining codebase elements to a new team member."
)

def build_explain_user(
    element_type: str,
    element_name: str,
    context: str | None,
    rag_context: str,
) -> str:
    ctx = f"\nAdditional context: {context}" if context else ""
    return (
        f"Element type: {element_type}\n"
        f"Element name: {element_name}{ctx}\n\n"
        f"Relevant codebase context:\n{rag_context}\n\n"
        "Write a 2-4 sentence explanation of this element based ONLY on the "
        "provided codebase context. Also suggest 2-3 official documentation links.\n"
        "Answer based only on the provided codebase context below. "
        "If the answer cannot be found in the context, say: "
        "'I couldn't find that in the codebase — try checking [most relevant module name].'\n"
        "Be concise. Maximum 40 words per sentence.\n"
        f"{_COMMON_RULES}\n"
        f"{_LINK_RULES}\n"
        "Respond ONLY with valid JSON matching this schema:\n"
        '{ "explanation": string, "links": [{ "title": string, "url": string }] }'
    )

# ── Dependency graph refinement ───────────────────────────────────────────────

GRAPH_SYSTEM = (
    "You are a senior software architect analysing a codebase's dependency graph. "
    "Your job is to make the graph easy to understand for a new developer by: "
    "assigning clear labels, meaningful descriptions, logical groups, importance scores, "
    "and semantic edge labels."
)


def build_graph_user(
    graph_data: dict,
    *,
    tech_stack: list[str] | None = None,
    architecture_summary: str = "",
    component_roles: dict[str, str] | None = None,
) -> str:
    parts: list[str] = []

    if architecture_summary:
        parts.append(f"Architecture summary: {architecture_summary}")
    if tech_stack:
        parts.append(f"Tech stack: {', '.join(tech_stack)}")
    if component_roles:
        parts.append(f"Module roles: {json.dumps(component_roles)}")
    parts.append(f"Static dependency graph:\n{json.dumps(graph_data)}")

    context_block = "\n".join(parts)

    return (
        f"{context_block}\n\n"
        "Analyse the dependency graph above and search the codebase to understand "
        "what each module actually does. Then return REFINED metadata for every node "
        "and edge.\n\n"
        "For each node you MUST return:\n"
        "- id: EXACT original node id (do NOT change it)\n"
        "- label: a clear, concise label (max 4 words) — rename if the original is "
        "unclear (e.g. 'routers (routing)' → 'API Routes')\n"
        "- type: one of 'core' | 'utility' | 'entry' | 'config'\n"
        "- description: 1-sentence description of what the module does (max 20 words)\n"
        "- group: a logical layer name. Choose from these standard groups:\n"
        "  'Entry Points', 'API Layer', 'Business Logic', 'Data Layer', "
        "'UI Components', 'Configuration', 'Utilities', 'Infrastructure'\n"
        "  You may use a custom group ONLY if none of these fit.\n"
        "- importance: integer 1-5 (5 = most critical to the app's functionality)\n\n"
        "For each edge you MUST return:\n"
        "- id: EXACT original edge id (do NOT change it)\n"
        "- label: a short verb phrase describing the relationship "
        "(e.g. 'delegates to', 'reads from', 'renders', 'validates via') — max 3 words\n\n"
        "IMPORTANT:\n"
        "- Return ALL original nodes and edges — do not add or remove any.\n"
        "- Keep the same node ids and edge ids.\n"
        f"{_COMMON_RULES}\n"
        "Respond ONLY with valid JSON matching this schema:\n"
        '{ "nodes": [{ "id": string, "label": string, "type": "core"|"utility"|"entry"|"config", '
        '"description": string, "group": string, "importance": number }], '
        '"edges": [{ "id": string, "label": string }] }'
    )


# ── Chat ─────────────────────────────────────────────────────────────────────

CHAT_SYSTEM = (
    "You are an expert developer assistant that answers questions about a codebase. "
    "Answer based only on the provided codebase context below. "
    "If the answer cannot be found in the context, say: "
    "'I couldn't find that in the codebase — try checking [most relevant module name].'"
)

def build_chat_user(
    message: str,
    history: list[dict[str, str]],
    rag_context: str,
) -> str:
    history_text = ""
    if history:
        for msg in history[-10:]:  # last 10 messages for token budget
            history_text += f"{msg['role'].upper()}: {msg['content']}\n"

    return (
        f"Conversation history:\n{history_text}\n"
        f"Relevant codebase context:\n{rag_context}\n\n"
        f"User message: {message}\n\n"
        "Be concise and helpful. Maximum 150 words.\n"
        f"{_COMMON_RULES}\n"
        "Respond with a plain-text answer (no JSON wrapping needed)."
    )
