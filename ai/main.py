"""FastAPI app — router registration and lifespan events."""

from __future__ import annotations

import logging
import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI

# Ensure the repo root (CodeWiz/) is on sys.path so `from ai.*` imports work
# regardless of which directory uvicorn is launched from.
_repo_root = str(Path(__file__).resolve().parent.parent)
if _repo_root not in sys.path:
    sys.path.insert(0, _repo_root)

# Load .env — try repo root first, then CWD
_env_candidates = [
    Path(__file__).resolve().parent.parent / ".env",   # /ai/../.env
    Path.cwd() / ".env",                                # CWD/.env
]
for _env in _env_candidates:
    if _env.is_file():
        load_dotenv(_env)
        break

from google import genai

# ── Configure logging ────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("ai")

# ── Configure Gemini ─────────────────────────────────────────────────────────

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
if not GEMINI_API_KEY:
    logger.error("GEMINI_API_KEY is not set in environment. Exiting.")
    sys.exit(1)

GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

# Create a module-level client that all other modules can import
client = genai.Client(api_key=GEMINI_API_KEY)


# ── Lifespan: verify Gemini key on startup ───────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle."""
    # Verify Gemini API key with a minimal test call
    try:
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents="Say OK",
        )
        logger.info("Gemini API key verified — test response received.")
    except Exception as exc:
        # Rate-limit (429) is transient — the key is valid, just quota-exhausted.
        # Let the app start; requests will succeed once the quota resets.
        status = getattr(exc, "status_code", None) or getattr(exc, "code", None)
        if status == 429:
            logger.warning(
                "Gemini API rate-limited during startup check (429). "
                "The key appears valid but quota is temporarily exhausted. "
                "Continuing startup — requests will work once quota resets."
            )
        else:
            logger.error("Gemini API key verification failed: %s", exc)
            sys.exit(1)

    yield  # app runs here

    logger.info("AI service shutting down.")


# ── FastAPI app ──────────────────────────────────────────────────────────────

app = FastAPI(
    title="CodeLens AI Service",
    version="1.0.0",
    lifespan=lifespan,
)

# ── Register routers ─────────────────────────────────────────────────────────

from ai.routers.health import router as health_router
from ai.routers.index import router as index_router
from ai.routers.summarize import router as summarize_router
from ai.routers.components import router as components_router
from ai.routers.complexity import router as complexity_router
from ai.routers.flows import router as flows_router
from ai.routers.checklist import router as checklist_router
from ai.routers.explain import router as explain_router
from ai.routers.chat import router as chat_router

app.include_router(health_router)
app.include_router(index_router)
app.include_router(summarize_router)
app.include_router(components_router)
app.include_router(complexity_router)
app.include_router(flows_router)
app.include_router(checklist_router)
app.include_router(explain_router)
app.include_router(chat_router)
