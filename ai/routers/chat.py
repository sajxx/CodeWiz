"""POST /ai/chat — RAG-augmented chat with conversation history."""

from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel

from ai.agent.prompts import CHAT_SYSTEM, build_chat_user
from ai.rag.embedder import embed_query
from ai.rag.store import query_collection

logger = logging.getLogger(__name__)
router = APIRouter()


class ChatMessageInput(BaseModel):
    role: str
    content: str
    timestamp: str


class ChatRequest(BaseModel):
    session_id: str
    message: str
    history: list[ChatMessageInput]


class ChatResponse(BaseModel):
    reply: str


@router.post("/ai/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    """Answer a chat question using RAG context + full conversation history."""
    # Build RAG context from the user's message
    query_emb = embed_query(req.message)
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

    history = [{"role": m.role, "content": m.content} for m in req.history]
    user_prompt = build_chat_user(req.message, history, rag_context)

    try:
        from ai.main import client, GEMINI_MODEL
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=user_prompt,
            config={"system_instruction": CHAT_SYSTEM},
        )
        reply = response.text.strip() if response.text else ""
        return ChatResponse(reply=reply)

    except Exception as exc:
        logger.error("Chat generation failed: %s", exc)
        return ChatResponse(reply="Sorry, I encountered an error processing your question. Please try again.")
