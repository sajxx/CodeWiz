"""
File utility helpers — safe reading with encoding detection.
"""

from __future__ import annotations
import os
import logging
from typing import Optional
import chardet

logger = logging.getLogger(__name__)


def safe_read_file(file_path: str, max_bytes: int = 1_000_000) -> Optional[str]:
    """Read a file safely, detecting encoding. Returns None on failure."""
    try:
        size = os.path.getsize(file_path)
        if size > max_bytes:
            logger.warning(f"Skipping large file ({size} bytes): {file_path}")
            return None

        with open(file_path, "rb") as f:
            raw = f.read()

        if not raw:
            return ""

        # Try UTF-8 first (most common)
        try:
            return raw.decode("utf-8")
        except UnicodeDecodeError:
            pass

        # Fall back to chardet detection
        detected = chardet.detect(raw)
        encoding = detected.get("encoding", "utf-8") or "utf-8"
        try:
            return raw.decode(encoding, errors="replace")
        except (UnicodeDecodeError, LookupError):
            return raw.decode("utf-8", errors="replace")

    except Exception as e:
        logger.warning(f"Failed to read file {file_path}: {e}")
        return None


def get_dir_size_mb(path: str) -> float:
    """Get total size of a directory in MB."""
    total = 0
    for dirpath, _dirnames, filenames in os.walk(path):
        for f in filenames:
            fp = os.path.join(dirpath, f)
            try:
                total += os.path.getsize(fp)
            except OSError:
                pass
    return total / (1024 * 1024)
