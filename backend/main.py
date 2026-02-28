"""
CodeLens Backend — FastAPI Application
"""

import os
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import analyze, chat, explain, impact, health

app = FastAPI(title="CodeLens Backend", version="1.0.0")

# ── CORS ──────────────────────────────────────
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_url],
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
