"""
Stage 3 — Tech Detector: Identify technologies from config files.
"""

from __future__ import annotations
import json
import logging
import os
from typing import Optional

from utils.file_utils import safe_read_file

logger = logging.getLogger(__name__)

# ── Known package → TechStackItem mappings ────────────────────────────
PACKAGE_MAP: dict[str, dict] = {
    # Frameworks
    "react": {"name": "React", "type": "framework", "color": "#61DAFB"},
    "react-dom": {"name": "React", "type": "framework", "color": "#61DAFB"},
    "next": {"name": "Next.js", "type": "framework", "color": "#000000"},
    "nextjs": {"name": "Next.js", "type": "framework", "color": "#000000"},
    "vue": {"name": "Vue.js", "type": "framework", "color": "#4FC08D"},
    "nuxt": {"name": "Nuxt.js", "type": "framework", "color": "#00DC82"},
    "angular": {"name": "Angular", "type": "framework", "color": "#DD0031"},
    "@angular/core": {"name": "Angular", "type": "framework", "color": "#DD0031"},
    "svelte": {"name": "Svelte", "type": "framework", "color": "#FF3E00"},
    "express": {"name": "Express", "type": "framework", "color": "#68A063"},
    "fastapi": {"name": "FastAPI", "type": "framework", "color": "#009688"},
    "django": {"name": "Django", "type": "framework", "color": "#092E20"},
    "flask": {"name": "Flask", "type": "framework", "color": "#000000"},
    "fastify": {"name": "Fastify", "type": "framework", "color": "#000000"},
    "nest": {"name": "NestJS", "type": "framework", "color": "#E0234E"},
    "@nestjs/core": {"name": "NestJS", "type": "framework", "color": "#E0234E"},
    "spring-boot": {"name": "Spring Boot", "type": "framework", "color": "#6DB33F"},
    # Languages
    "typescript": {"name": "TypeScript", "type": "language", "color": "#3178C6"},
    # Databases
    "postgresql": {"name": "PostgreSQL", "type": "database", "color": "#336791"},
    "psycopg2": {"name": "PostgreSQL", "type": "database", "color": "#336791"},
    "psycopg2-binary": {"name": "PostgreSQL", "type": "database", "color": "#336791"},
    "pg": {"name": "PostgreSQL", "type": "database", "color": "#336791"},
    "mongodb": {"name": "MongoDB", "type": "database", "color": "#47A248"},
    "pymongo": {"name": "MongoDB", "type": "database", "color": "#47A248"},
    "mongoose": {"name": "MongoDB", "type": "database", "color": "#47A248"},
    "redis": {"name": "Redis", "type": "database", "color": "#DC382D"},
    "mysql": {"name": "MySQL", "type": "database", "color": "#4479A1"},
    "mysql-connector-python": {"name": "MySQL", "type": "database", "color": "#4479A1"},
    "sqlite3": {"name": "SQLite", "type": "database", "color": "#003B57"},
    "sequelize": {"name": "Sequelize", "type": "tool", "color": "#2379BD"},
    "prisma": {"name": "Prisma", "type": "tool", "color": "#2D3748"},
    "@prisma/client": {"name": "Prisma", "type": "tool", "color": "#2D3748"},
    # Tools
    "webpack": {"name": "Webpack", "type": "tool", "color": "#8DD6F9"},
    "vite": {"name": "Vite", "type": "tool", "color": "#646CFF"},
    "eslint": {"name": "ESLint", "type": "tool", "color": "#4B32C3"},
    "jest": {"name": "Jest", "type": "tool", "color": "#C21325"},
    "pytest": {"name": "pytest", "type": "tool", "color": "#009BDB"},
    "tailwindcss": {"name": "Tailwind CSS", "type": "framework", "color": "#06B6D4"},
    "sass": {"name": "Sass", "type": "tool", "color": "#CC6699"},
    "graphql": {"name": "GraphQL", "type": "tool", "color": "#E10098"},
    "axios": {"name": "Axios", "type": "tool", "color": "#5A29E4"},
}


def _parse_package_json(content: str) -> set[str]:
    """Extract dependency names from package.json."""
    packages = set()
    try:
        data = json.loads(content)
        for key in ("dependencies", "devDependencies", "peerDependencies"):
            deps = data.get(key, {})
            if isinstance(deps, dict):
                packages.update(deps.keys())
    except (json.JSONDecodeError, TypeError) as e:
        logger.warning(f"Failed to parse package.json: {e}")
    return packages


def _parse_requirements_txt(content: str) -> set[str]:
    """Extract package names from requirements.txt."""
    packages = set()
    for line in content.splitlines():
        line = line.strip()
        if not line or line.startswith("#") or line.startswith("-"):
            continue
        # Handle: package==1.0, package>=1.0, package[extra], package
        name = line.split("==")[0].split(">=")[0].split("<=")[0].split("!=")[0]
        name = name.split("[")[0].split(";")[0].strip()
        if name:
            packages.add(name.lower())
    return packages


def detect_tech_stack(
    root_dir: str,
    config_files: list[str],
    source_files: list[str],
) -> list[dict]:
    """Detect tech stack from config files and source files."""
    detected: dict[str, dict] = {}  # name → TechStackItem (deduplicated)
    all_packages: set[str] = set()

    for cfg in config_files:
        full_path = os.path.join(root_dir, cfg)
        content = safe_read_file(full_path)
        if content is None:
            continue

        filename = os.path.basename(cfg)

        if filename == "package.json":
            pkgs = _parse_package_json(content)
            all_packages.update(pkgs)

        elif filename == "requirements.txt":
            pkgs = _parse_requirements_txt(content)
            all_packages.update(pkgs)

        elif filename == "Dockerfile":
            detected["Docker"] = {"name": "Docker", "type": "tool", "color": "#2496ED"}

        elif filename == "tsconfig.json":
            detected["TypeScript"] = {
                "name": "TypeScript", "type": "language", "color": "#3178C6"
            }

        elif filename == "pyproject.toml":
            # Basic check — full TOML parsing not needed for hackathon
            if "fastapi" in content.lower():
                detected["FastAPI"] = PACKAGE_MAP["fastapi"]
            if "django" in content.lower():
                detected["Django"] = PACKAGE_MAP["django"]
            if "flask" in content.lower():
                detected["Flask"] = PACKAGE_MAP["flask"]

    # Map known packages
    for pkg in all_packages:
        pkg_lower = pkg.lower()
        if pkg_lower in PACKAGE_MAP:
            item = PACKAGE_MAP[pkg_lower]
            detected[item["name"]] = item

    # Detect languages from source files
    has_python = any(f.endswith(".py") for f in source_files)
    has_js = any(f.endswith((".js", ".jsx")) for f in source_files)
    has_ts = any(f.endswith((".ts", ".tsx")) for f in source_files)

    if has_python:
        detected["Python"] = {"name": "Python", "type": "language", "color": "#3776AB"}
    if has_js and "TypeScript" not in detected:
        detected["JavaScript"] = {
            "name": "JavaScript", "type": "language", "color": "#F7DF1E"
        }
    if has_ts:
        detected["TypeScript"] = {
            "name": "TypeScript", "type": "language", "color": "#3178C6"
        }

    # Check for docker-compose
    for cfg in config_files:
        if os.path.basename(cfg) in ("docker-compose.yml", "docker-compose.yaml"):
            detected["Docker"] = {"name": "Docker", "type": "tool", "color": "#2496ED"}

    return list(detected.values())
