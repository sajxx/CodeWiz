"""POST /ai/explain — RAG + Gemini element explanation with doc links."""

from __future__ import annotations

import json
import logging
from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel

from ai.agent.prompts import EXPLAIN_SYSTEM, build_explain_user
from ai.rag.embedder import embed_query
from ai.rag.store import query_collection

logger = logging.getLogger(__name__)
router = APIRouter()


class ExplainRequest(BaseModel):
    session_id: str
    element_type: str
    element_name: str
    context: Optional[str] = None


class DocLink(BaseModel):
    title: str
    url: str


class ExplainResponse(BaseModel):
    explanation: str
    links: list[DocLink]


@router.post("/ai/explain", response_model=ExplainResponse)
async def explain(req: ExplainRequest):
    """Explain a codebase element using RAG context + Gemini."""
    # Build RAG context
    query_text = f"{req.element_type} {req.element_name}"
    if req.context:
        query_text += f" {req.context}"

    query_emb = embed_query(query_text)
    chunks = query_collection(req.session_id, query_emb, n_results=5)

    rag_context = ""
    if chunks:
        parts = []
        for c in chunks:
            fp = c["metadata"].get("file_path", "unknown")
            parts.append(f"FILE: {fp}\n{c['content']}\n---")
        rag_context = "\n".join(parts)
    else:
        rag_context = "No relevant code found in the codebase index."

    user_prompt = build_explain_user(
        req.element_type, req.element_name, req.context, rag_context
    )

    try:
        from ai.main import client, GEMINI_MODEL
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=user_prompt,
            config={"system_instruction": EXPLAIN_SYSTEM},
        )
        raw = response.text

        cleaned = raw.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned[3:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            cleaned = cleaned.strip()

        data = json.loads(cleaned)
        explanation = data.get("explanation", "")
        links = [
            DocLink(title=l.get("title", ""), url=l.get("url", ""))
            for l in data.get("links", [])
            if l.get("url")  # skip entries with empty URLs
        ]
        return ExplainResponse(explanation=explanation, links=links)

    except Exception as exc:
        logger.error("Explain generation failed: %s", exc)
        return ExplainResponse(explanation="", links=[])
