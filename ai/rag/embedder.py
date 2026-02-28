"""Gemini embedding calls (text-embedding-004)."""

from __future__ import annotations

import logging
import time
from typing import Any

logger = logging.getLogger(__name__)

EMBED_MODEL = "text-embedding-004"
BATCH_SIZE = 20
BATCH_SLEEP = 0.5  # seconds between batches


def _get_client():
    """Lazy import to avoid circular import at module load time."""
    from ai.main import client
    return client


def embed_texts(
    texts: list[str],
    task_type: str = "RETRIEVAL_DOCUMENT",
) -> list[list[float]]:
    """Embed a list of texts using Gemini text-embedding-004.

    Batches requests in groups of BATCH_SIZE with a sleep between batches.
    Returns a list of embedding vectors (same order as input).
    """
    all_embeddings: list[list[float]] = []
    client = _get_client()

    for i in range(0, len(texts), BATCH_SIZE):
        batch = texts[i : i + BATCH_SIZE]
        try:
            result = client.models.embed_content(
                model=EMBED_MODEL,
                contents=batch,
                config={"task_type": task_type},
            )
            all_embeddings.extend([e.values for e in result.embeddings])
        except Exception as exc:
            logger.error("Embedding batch %d failed: %s", i // BATCH_SIZE, exc)
            # Return zero vectors as fallback so indexing can continue
            dim = 768  # text-embedding-004 output dimension
            all_embeddings.extend([[0.0] * dim for _ in batch])

        # Rate-limit sleep (skip after last batch)
        if i + BATCH_SIZE < len(texts):
            time.sleep(BATCH_SLEEP)

    return all_embeddings


def embed_query(text: str) -> list[float]:
    """Embed a single query string for retrieval."""
    client = _get_client()
    try:
        result = client.models.embed_content(
            model=EMBED_MODEL,
            contents=text,
            config={"task_type": "RETRIEVAL_QUERY"},
        )
        return result.embeddings[0].values
    except Exception as exc:
        logger.error("Query embedding failed: %s", exc)
        return [0.0] * 768
