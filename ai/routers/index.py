"""POST /ai/index — chunk files, embed, upsert into ChromaDB."""

from __future__ import annotations

import logging
import uuid
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel

from ai.rag.chunker import chunk_file
from ai.rag.embedder import embed_texts
from ai.rag.store import upsert_chunks, get_or_create_collection
from ai.store.sessions import get_or_create_session

logger = logging.getLogger(__name__)
router = APIRouter()


class FileItem(BaseModel):
    path: str
    content: str


class IndexRequest(BaseModel):
    session_id: str
    files: list[FileItem]


class IndexResponse(BaseModel):
    indexed_count: int


@router.post("/ai/index", response_model=IndexResponse)
async def index_files(req: IndexRequest):
    """Chunk all files, embed, and upsert into ChromaDB collection."""
    session = get_or_create_session(req.session_id)

    # Cache raw file content in the session for tool access later
    for f in req.files:
        session.files[f.path] = f.content

    # Ensure collection exists
    get_or_create_collection(req.session_id)

    # Chunk all files
    all_chunks: list[dict[str, Any]] = []
    for f in req.files:
        # Derive module name from first directory component
        parts = f.path.replace("\\", "/").split("/")
        module_name = parts[0] if len(parts) > 1 else "root"
        chunks = chunk_file(f.path, f.content, req.session_id, module_name)
        all_chunks.extend(chunks)

    if not all_chunks:
        return IndexResponse(indexed_count=0)

    # Prepare data for upsertion
    texts = [c["text"] for c in all_chunks]
    ids = [f"{req.session_id}_{i}_{uuid.uuid4().hex[:8]}" for i in range(len(all_chunks))]
    metadatas = [c["metadata"] for c in all_chunks]

    # Embed all chunks
    embeddings = embed_texts(texts, task_type="retrieval_document")

    # Upsert into ChromaDB
    upsert_chunks(req.session_id, ids, texts, embeddings, metadatas)

    logger.info("Indexed %d chunks for session %s", len(all_chunks), req.session_id)
    return IndexResponse(indexed_count=len(all_chunks))
