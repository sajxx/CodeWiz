"""
Stage 2 — Scanner: Walk the file tree, apply ignore rules, collect source & config files.
"""

from __future__ import annotations
import os
import logging
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)

# Directories to skip entirely
IGNORE_DIRS = {
    "node_modules", ".git", "__pycache__", "dist", "build",
    ".next", ".nuxt", "coverage", ".venv", "venv", "env",
}

# File extensions to skip
IGNORE_EXTENSIONS = {
    ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico",
    ".woff", ".woff2", ".ttf", ".eot",
    ".mp4", ".mp3", ".zip", ".tar", ".lock",
}

# Source-code extensions we care about
SOURCE_EXTENSIONS = {".js", ".ts", ".jsx", ".tsx", ".py"}

# Config files to collect for tech detection
CONFIG_FILENAMES = {
    "package.json", "requirements.txt", "Dockerfile",
    "docker-compose.yml", "docker-compose.yaml",
    "tsconfig.json", "pyproject.toml", "go.mod", "pom.xml",
}

CONFIG_PREFIXES = (".eslintrc",)


@dataclass
class ScanResult:
    source_files: list[str] = field(default_factory=list)
    config_files: list[str] = field(default_factory=list)
    file_tree: dict = field(default_factory=dict)


def _is_config_file(filename: str) -> bool:
    if filename in CONFIG_FILENAMES:
        return True
    for prefix in CONFIG_PREFIXES:
        if filename.startswith(prefix):
            return True
    return False


def _should_ignore_file(filename: str) -> bool:
    # Special case: keep package-lock.json
    if filename == "package-lock.json":
        return False
    _, ext = os.path.splitext(filename)
    return ext.lower() in IGNORE_EXTENSIONS


def _build_tree_node(base_path: str, rel_path: str) -> dict:
    """Build a nested dict representing the file tree."""
    full = os.path.join(base_path, rel_path) if rel_path else base_path
    name = os.path.basename(full) or os.path.basename(base_path)

    if os.path.isfile(full):
        return {"name": name, "type": "file", "path": rel_path}

    children = []
    try:
        entries = sorted(os.listdir(full))
    except PermissionError:
        entries = []

    for entry in entries:
        if entry in IGNORE_DIRS:
            continue
        child_rel = os.path.join(rel_path, entry) if rel_path else entry
        child_full = os.path.join(full, entry)
        if os.path.isdir(child_full):
            children.append(_build_tree_node(base_path, child_rel))
        elif not _should_ignore_file(entry):
            children.append({"name": entry, "type": "file", "path": child_rel})

    return {"name": name, "type": "directory", "path": rel_path, "children": children}


def scan_directory(root_dir: str, max_files: int = 500) -> ScanResult:
    """Walk the directory tree and collect source files, config files, and a file tree."""
    result = ScanResult()

    for dirpath, dirnames, filenames in os.walk(root_dir):
        # Filter out ignored directories in-place
        dirnames[:] = [d for d in dirnames if d not in IGNORE_DIRS]

        for filename in filenames:
            if _should_ignore_file(filename):
                continue

            full_path = os.path.join(dirpath, filename)
            rel_path = os.path.relpath(full_path, root_dir)

            # Config files
            if _is_config_file(filename):
                result.config_files.append(rel_path)

            # Source files
            _, ext = os.path.splitext(filename)
            if ext.lower() in SOURCE_EXTENSIONS:
                if len(result.source_files) < max_files:
                    result.source_files.append(rel_path)
                else:
                    logger.warning(
                        f"Reached max file limit ({max_files}), skipping remaining files"
                    )
                    break
        else:
            continue
        break  # Break out of outer loop if inner loop broke

    # Build file tree
    result.file_tree = _build_tree_node(root_dir, "")

    logger.info(
        f"Scanned: {len(result.source_files)} source files, "
        f"{len(result.config_files)} config files"
    )
    return result
