"""ChromaDB collection management – create, upsert, query."""

from __future__ import annotations

import logging
import os
from typing import Any

import chromadb

logger = logging.getLogger(__name__)

CHROMA_PERSIST_DIR = os.getenv("CHROMA_PERSIST_DIR", "./chroma_data")

_client: chromadb.PersistentClient | None = None


def _get_client() -> chromadb.PersistentClient:
    global _client
    if _client is None:
        _client = chromadb.PersistentClient(path=CHROMA_PERSIST_DIR)
    return _client


def _collection_name(session_id: str) -> str:
    return f"codelens_{session_id}"


def get_or_create_collection(session_id: str) -> chromadb.Collection:
    """Return (or create) the ChromaDB collection for a session."""
    client = _get_client()
    return client.get_or_create_collection(
        name=_collection_name(session_id),
        metadata={"hnsw:space": "cosine"},
    )


def upsert_chunks(
    session_id: str,
    ids: list[str],
    documents: list[str],
    embeddings: list[list[float]],
    metadatas: list[dict[str, Any]],
) -> None:
    """Upsert chunks into the session collection in batches of 50."""
    collection = get_or_create_collection(session_id)
    batch_size = 50
    for i in range(0, len(ids), batch_size):
        end = i + batch_size
        collection.upsert(
            ids=ids[i:end],
            documents=documents[i:end],
            embeddings=embeddings[i:end],
            metadatas=metadatas[i:end],
        )
    logger.info("Upserted %d chunks into collection %s", len(ids), _collection_name(session_id))


def query_collection(
    session_id: str,
    query_embedding: list[float],
    n_results: int = 5,
) -> list[dict[str, Any]]:
    """Query the session collection and return matching chunks with metadata."""
    collection = get_or_create_collection(session_id)
    try:
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=n_results,
            include=["documents", "metadatas", "distances"],
        )
    except Exception as exc:
        logger.error("ChromaDB query failed: %s", exc)
        return []

    chunks: list[dict[str, Any]] = []
    if results and results["documents"]:
        docs = results["documents"][0]
        metas = results["metadatas"][0] if results["metadatas"] else [{}] * len(docs)
        distances = results["distances"][0] if results["distances"] else [0.0] * len(docs)
        for doc, meta, dist in zip(docs, metas, distances):
            chunks.append({"content": doc, "metadata": meta, "distance": dist})
    return chunks


def delete_collection(session_id: str) -> None:
    """Delete a session's collection (cleanup)."""
    client = _get_client()
    try:
        client.delete_collection(_collection_name(session_id))
    except Exception:
        pass
