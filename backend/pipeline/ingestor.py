"""
Stage 1 — Ingestor: Clone GitHub repos or extract ZIP uploads.
"""

from __future__ import annotations
import logging
import os
import shutil
import tempfile
import zipfile
from typing import Optional

from fastapi import UploadFile
from git import Repo

from utils.file_utils import get_dir_size_mb

logger = logging.getLogger(__name__)


async def ingest_github(url: str, max_size_mb: int = 100) -> str:
    """Clone a GitHub repo (shallow, depth=1) into a temp directory.
    Returns the temp directory path.
    """
    temp_dir = tempfile.mkdtemp(prefix="codewiz_")
    try:
        logger.info(f"Cloning {url} into {temp_dir}")
        Repo.clone_from(url, temp_dir, depth=1)

        size = get_dir_size_mb(temp_dir)
        if size > max_size_mb:
            shutil.rmtree(temp_dir, ignore_errors=True)
            raise ValueError(
                f"Repository too large: {size:.1f} MB (limit: {max_size_mb} MB)"
            )

        return temp_dir
    except Exception as e:
        if "too large" not in str(e):
            logger.error(f"Git clone failed: {e}")
        # Clean up on failure only if not a size error (already cleaned)
        if os.path.exists(temp_dir) and "too large" not in str(e):
            shutil.rmtree(temp_dir, ignore_errors=True)
        raise


async def ingest_zip(file: UploadFile, max_size_mb: int = 100) -> str:
    """Extract a ZIP upload into a temp directory.
    Returns the temp directory path.
    """
    temp_dir = tempfile.mkdtemp(prefix="codewiz_")
    zip_path = os.path.join(temp_dir, "upload.zip")

    try:
        # Write uploaded file to disk
        content = await file.read()
        with open(zip_path, "wb") as f:
            f.write(content)

        # Extract
        extract_dir = os.path.join(temp_dir, "extracted")
        os.makedirs(extract_dir, exist_ok=True)

        with zipfile.ZipFile(zip_path, "r") as zf:
            zf.extractall(extract_dir)

        # Remove the zip file
        os.remove(zip_path)

        # Check size
        size = get_dir_size_mb(extract_dir)
        if size > max_size_mb:
            shutil.rmtree(temp_dir, ignore_errors=True)
            raise ValueError(
                f"Extracted archive too large: {size:.1f} MB (limit: {max_size_mb} MB)"
            )

        # If the archive contains a single root folder, use that as the root
        entries = os.listdir(extract_dir)
        if len(entries) == 1 and os.path.isdir(os.path.join(extract_dir, entries[0])):
            return os.path.join(extract_dir, entries[0])

        return extract_dir
    except Exception as e:
        if "too large" not in str(e):
            logger.error(f"ZIP extraction failed: {e}")
        if os.path.exists(temp_dir) and "too large" not in str(e):
            shutil.rmtree(temp_dir, ignore_errors=True)
        raise
