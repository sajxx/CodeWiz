"""Per-project-type checklist templates with placeholders."""

from __future__ import annotations

from typing import Any

TEMPLATES: dict[str, list[dict[str, Any]]] = {
    "react-frontend": [
        {
            "phase": "read",
            "title": "Phase 1 — Read First",
            "items": [
                {"id": "r1", "label": "Read {entry_point} to understand how the app starts", "filePath": "{entry_point}", "isRequired": True},
                {"id": "r2", "label": "Read {config_file} to understand build configuration", "filePath": "{config_file}", "isRequired": True},
                {"id": "r3", "label": "Read the {main_module} module to understand core UI components", "filePath": None, "isRequired": True},
            ],
        },
        {
            "phase": "setup",
            "title": "Phase 2 — Set Up",
            "items": [
                {"id": "s1", "label": "Install dependencies: {install_command}", "filePath": None, "isRequired": True},
                {"id": "s2", "label": "Copy .env.example to .env and fill in required values", "filePath": ".env.example", "isRequired": False},
                {"id": "s3", "label": "Start the dev server: {start_command}", "filePath": None, "isRequired": True},
            ],
        },
        {
            "phase": "start",
            "title": "Phase 3 — Start Here",
            "items": [
                {"id": "st1", "label": "Explore the /src/components/ directory for UI components", "filePath": None, "isRequired": True},
                {"id": "st2", "label": "Look at {main_module} first — it has the most important routes", "filePath": None, "isRequired": True},
                {"id": "st3", "label": "Run the test suite: {test_command}", "filePath": None, "isRequired": False},
            ],
        },
    ],
    "node-express-api": [
        {
            "phase": "read",
            "title": "Phase 1 — Read First",
            "items": [
                {"id": "r1", "label": "Read {entry_point} to understand how the server starts", "filePath": "{entry_point}", "isRequired": True},
                {"id": "r2", "label": "Read {config_file} to understand environment configuration", "filePath": "{config_file}", "isRequired": True},
                {"id": "r3", "label": "Read the {main_module} module to understand core routes", "filePath": None, "isRequired": True},
            ],
        },
        {
            "phase": "setup",
            "title": "Phase 2 — Set Up",
            "items": [
                {"id": "s1", "label": "Install dependencies: {install_command}", "filePath": None, "isRequired": True},
                {"id": "s2", "label": "Copy .env.example to .env and fill in required values", "filePath": ".env.example", "isRequired": False},
                {"id": "s3", "label": "Start the server: {start_command}", "filePath": None, "isRequired": True},
            ],
        },
        {
            "phase": "start",
            "title": "Phase 3 — Start Here",
            "items": [
                {"id": "st1", "label": "Explore the /routes/ directory for API endpoints", "filePath": None, "isRequired": True},
                {"id": "st2", "label": "Look at {main_module} first — it has the lowest coupling score", "filePath": None, "isRequired": True},
                {"id": "st3", "label": "Run the test suite: {test_command}", "filePath": None, "isRequired": False},
            ],
        },
    ],
    "python-fastapi": [
        {
            "phase": "read",
            "title": "Phase 1 — Read First",
            "items": [
                {"id": "r1", "label": "Read {entry_point} to understand how the app starts", "filePath": "{entry_point}", "isRequired": True},
                {"id": "r2", "label": "Read {config_file} to understand environment configuration", "filePath": "{config_file}", "isRequired": True},
                {"id": "r3", "label": "Read the {main_module} module to understand core business logic", "filePath": None, "isRequired": True},
            ],
        },
        {
            "phase": "setup",
            "title": "Phase 2 — Set Up",
            "items": [
                {"id": "s1", "label": "Install dependencies: {install_command}", "filePath": None, "isRequired": True},
                {"id": "s2", "label": "Copy .env.example to .env and fill in required values", "filePath": ".env.example", "isRequired": False},
                {"id": "s3", "label": "Run the app: uvicorn main:app --reload", "filePath": None, "isRequired": True},
            ],
        },
        {
            "phase": "start",
            "title": "Phase 3 — Start Here",
            "items": [
                {"id": "st1", "label": "Explore the /routers/ directory for API endpoints", "filePath": None, "isRequired": True},
                {"id": "st2", "label": "Look at {main_module} first — it has the lowest coupling score", "filePath": None, "isRequired": True},
                {"id": "st3", "label": "Run the test suite: {test_command}", "filePath": None, "isRequired": False},
            ],
        },
    ],
    "python-django": [
        {
            "phase": "read",
            "title": "Phase 1 — Read First",
            "items": [
                {"id": "r1", "label": "Read {entry_point} to understand how Django starts", "filePath": "{entry_point}", "isRequired": True},
                {"id": "r2", "label": "Read {config_file} to understand settings and middleware", "filePath": "{config_file}", "isRequired": True},
                {"id": "r3", "label": "Read the {main_module} module to understand core app logic", "filePath": None, "isRequired": True},
            ],
        },
        {
            "phase": "setup",
            "title": "Phase 2 — Set Up",
            "items": [
                {"id": "s1", "label": "Install dependencies: {install_command}", "filePath": None, "isRequired": True},
                {"id": "s2", "label": "Copy .env.example to .env and configure database URL", "filePath": ".env.example", "isRequired": True},
                {"id": "s3", "label": "Run migrations: python manage.py migrate", "filePath": None, "isRequired": True},
                {"id": "s4", "label": "Start the server: python manage.py runserver", "filePath": None, "isRequired": True},
            ],
        },
        {
            "phase": "start",
            "title": "Phase 3 — Start Here",
            "items": [
                {"id": "st1", "label": "Explore the urls.py files for URL routing", "filePath": None, "isRequired": True},
                {"id": "st2", "label": "Look at {main_module} first — it contains the core models", "filePath": None, "isRequired": True},
                {"id": "st3", "label": "Run the test suite: {test_command}", "filePath": None, "isRequired": False},
            ],
        },
    ],
    "fullstack-monorepo": [
        {
            "phase": "read",
            "title": "Phase 1 — Read First",
            "items": [
                {"id": "r1", "label": "Read {entry_point} to understand the project root setup", "filePath": "{entry_point}", "isRequired": True},
                {"id": "r2", "label": "Read {config_file} to understand workspace/monorepo config", "filePath": "{config_file}", "isRequired": True},
                {"id": "r3", "label": "Read the {main_module} module for core shared logic", "filePath": None, "isRequired": True},
            ],
        },
        {
            "phase": "setup",
            "title": "Phase 2 — Set Up",
            "items": [
                {"id": "s1", "label": "Install all dependencies: {install_command}", "filePath": None, "isRequired": True},
                {"id": "s2", "label": "Copy .env.example to .env in each package", "filePath": None, "isRequired": False},
                {"id": "s3", "label": "Start all services: {start_command}", "filePath": None, "isRequired": True},
            ],
        },
        {
            "phase": "start",
            "title": "Phase 3 — Start Here",
            "items": [
                {"id": "st1", "label": "Understand the frontend in /frontend or /client", "filePath": None, "isRequired": True},
                {"id": "st2", "label": "Understand the backend in /backend or /server", "filePath": None, "isRequired": True},
                {"id": "st3", "label": "Run the full test suite: {test_command}", "filePath": None, "isRequired": False},
            ],
        },
    ],
    "generic": [
        {
            "phase": "read",
            "title": "Phase 1 — Read First",
            "items": [
                {"id": "r1", "label": "Read {entry_point} to understand the main entry point", "filePath": "{entry_point}", "isRequired": True},
                {"id": "r2", "label": "Read {config_file} to understand project configuration", "filePath": "{config_file}", "isRequired": True},
                {"id": "r3", "label": "Browse the {main_module} module for core logic", "filePath": None, "isRequired": True},
            ],
        },
        {
            "phase": "setup",
            "title": "Phase 2 — Set Up",
            "items": [
                {"id": "s1", "label": "Install dependencies: {install_command}", "filePath": None, "isRequired": True},
                {"id": "s2", "label": "Copy .env.example to .env and fill in values", "filePath": ".env.example", "isRequired": False},
                {"id": "s3", "label": "Start the application: {start_command}", "filePath": None, "isRequired": True},
            ],
        },
        {
            "phase": "start",
            "title": "Phase 3 — Start Here",
            "items": [
                {"id": "st1", "label": "Explore the project structure to find key directories", "filePath": None, "isRequired": True},
                {"id": "st2", "label": "Look at {main_module} first — start with the core module", "filePath": None, "isRequired": True},
                {"id": "st3", "label": "Run the test suite: {test_command}", "filePath": None, "isRequired": False},
            ],
        },
    ],
}
