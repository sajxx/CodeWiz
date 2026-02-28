"""File chunking logic for the RAG pipeline."""

from __future__ import annotations

import ast
import os
import re
import logging
from typing import Any

import tiktoken

logger = logging.getLogger(__name__)

_enc = tiktoken.get_encoding("cl100k_base")

MAX_CHUNK_TOKENS = 800

# Extensions recognised as JS/TS
_JS_TS_EXTS = {".js", ".ts", ".jsx", ".tsx"}

# Extensions / filenames treated as "config" → entire file = one chunk
_CONFIG_NAMES = {
    "package.json",
    "package-lock.json",
    "requirements.txt",
    "pyproject.toml",
    "setup.py",
    "setup.cfg",
    "tsconfig.json",
    "jsconfig.json",
    "webpack.config.js",
    "vite.config.ts",
    "vite.config.js",
    "next.config.js",
    "next.config.mjs",
    "dockerfile",
    "docker-compose.yml",
    "docker-compose.yaml",
    ".env",
    ".env.example",
    "makefile",
    "cargo.toml",
    "go.mod",
    "go.sum",
}

_JS_TS_SPLIT_RE = re.compile(
    r"(?=\n(?:export\s+(?:default\s+)?(?:function|class|const|async)|function\s+\w+|class\s+\w+))"
)


def _token_count(text: str) -> int:
    return len(_enc.encode(text))


def _split_by_token_limit(text: str, max_tokens: int = MAX_CHUNK_TOKENS) -> list[str]:
    """Split a large text into pieces ≤ max_tokens at double-newline boundaries."""
    if _token_count(text) <= max_tokens:
        return [text]

    paragraphs = re.split(r"\n\n+", text)
    chunks: list[str] = []
    current = ""
    for para in paragraphs:
        candidate = (current + "\n\n" + para).strip() if current else para
        if _token_count(candidate) > max_tokens:
            if current:
                chunks.append(current.strip())
            # If a single paragraph is too large, hard-split by lines
            if _token_count(para) > max_tokens:
                lines = para.split("\n")
                sub = ""
                for line in lines:
                    cand = (sub + "\n" + line).strip() if sub else line
                    if _token_count(cand) > max_tokens:
                        if sub:
                            chunks.append(sub.strip())
                        sub = line
                    else:
                        sub = cand
                if sub:
                    current = sub
                else:
                    current = ""
            else:
                current = para
        else:
            current = candidate
    if current.strip():
        chunks.append(current.strip())
    return chunks


# ── Python chunking (AST-based) ──────────────────────────────────────────────


def _chunk_python(content: str, file_path: str) -> list[str]:
    """Chunk a Python file using the ast module."""
    try:
        tree = ast.parse(content)
    except SyntaxError:
        # Fallback: treat entire file as one chunk
        return _split_by_token_limit(content)

    lines = content.split("\n")

    # Collect top-level node ranges
    ranges: list[tuple[int, int]] = []  # (start_line_0idx, end_line_0idx_exclusive)
    for node in ast.iter_child_nodes(tree):
        if isinstance(node, (ast.ClassDef, ast.FunctionDef, ast.AsyncFunctionDef)):
            start = node.lineno - 1  # 0-indexed
            end = node.end_lineno if node.end_lineno else start + 1
            ranges.append((start, end))

    if not ranges:
        return _split_by_token_limit(content)

    # Sort by start line
    ranges.sort(key=lambda r: r[0])

    chunks: list[str] = []

    # Module-level code before the first class/function
    if ranges[0][0] > 0:
        module_header = "\n".join(lines[: ranges[0][0]]).strip()
        if module_header:
            chunks.extend(_split_by_token_limit(module_header))

    # Each class / top-level function
    for start, end in ranges:
        block = "\n".join(lines[start:end]).strip()
        if block:
            chunks.extend(_split_by_token_limit(block))

    # Trailing code after last node
    last_end = ranges[-1][1]
    if last_end < len(lines):
        trailer = "\n".join(lines[last_end:]).strip()
        if trailer:
            chunks.extend(_split_by_token_limit(trailer))

    return chunks


# ── JS/TS chunking (regex-based) ─────────────────────────────────────────────


def _chunk_js_ts(content: str, file_path: str) -> list[str]:
    """Chunk a JS/TS file using regex splitting at export/function/class boundaries."""
    parts = _JS_TS_SPLIT_RE.split(content)
    chunks: list[str] = []
    for part in parts:
        part = part.strip()
        if part:
            chunks.extend(_split_by_token_limit(part))
    return chunks


# ── Config chunking ──────────────────────────────────────────────────────────


def _chunk_config(content: str, file_path: str) -> list[str]:
    """Config files → entire file = one chunk (split if huge)."""
    return _split_by_token_limit(content)


# ── Public API ───────────────────────────────────────────────────────────────


def chunk_file(
    file_path: str,
    content: str,
    session_id: str,
    module_name: str | None = None,
) -> list[dict[str, Any]]:
    """Chunk a single file and return list of chunk dicts ready for embedding.

    Each dict has keys: text, metadata.
    metadata = { session_id, file_path, module_name, chunk_index, language }
    """
    basename = os.path.basename(file_path).lower()
    ext = os.path.splitext(file_path)[1].lower()

    # Determine language
    if ext == ".py":
        language = "python"
    elif ext in _JS_TS_EXTS:
        language = "javascript" if ext in {".js", ".jsx"} else "typescript"
    else:
        language = "config"

    # Choose chunking strategy
    if basename in _CONFIG_NAMES or ext in {".json", ".yml", ".yaml", ".toml", ".cfg", ".ini", ".env"}:
        raw_chunks = _chunk_config(content, file_path)
        language = "config"
    elif ext == ".py":
        raw_chunks = _chunk_python(content, file_path)
    elif ext in _JS_TS_EXTS:
        raw_chunks = _chunk_js_ts(content, file_path)
    else:
        # Unknown file type – treat as config / plain text
        raw_chunks = _chunk_config(content, file_path)
        language = "other"

    if module_name is None:
        # Derive module from first directory component in file_path
        parts = file_path.replace("\\", "/").split("/")
        module_name = parts[0] if len(parts) > 1 else "root"

    result: list[dict[str, Any]] = []
    for idx, text in enumerate(raw_chunks):
        if not text.strip():
            continue
        result.append(
            {
                "text": text,
                "metadata": {
                    "session_id": session_id,
                    "file_path": file_path,
                    "module_name": module_name,
                    "chunk_index": idx,
                    "language": language,
                },
            }
        )
    return result
