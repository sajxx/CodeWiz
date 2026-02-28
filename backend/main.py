"""
CodeWiz Backend — FastAPI Application
"""

import os
import sys
from dotenv import load_dotenv

# Ensure the backend directory is on sys.path so `from routers import ...` works
# regardless of which directory uvicorn is launched from.
_backend_dir = os.path.dirname(os.path.abspath(__file__))
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import analyze, chat, explain, impact, health, files

app = FastAPI(title="CodeWiz Backend", version="1.0.0")

# ── CORS ──────────────────────────────────────
# Allow the Vite dev server and any local frontend origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────
app.include_router(health.router)
app.include_router(analyze.router)
app.include_router(chat.router)
app.include_router(explain.router)
app.include_router(impact.router)
app.include_router(files.router)

# ── Startup validation ───────────────────────
@app.on_event("startup")
async def validate_env():
    gemini_key = os.getenv("GEMINI_API_KEY")
    if not gemini_key:
        import logging
        logging.warning("GEMINI_API_KEY is not set — AI features may not work")


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("BACKEND_PORT", "8000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
