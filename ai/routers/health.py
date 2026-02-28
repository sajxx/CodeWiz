"""GET /health — lightweight readiness check."""

from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
async def health_check():
    """Return 200 OK with minimal payload. Must respond in <100ms."""
    return {"status": "ok"}
