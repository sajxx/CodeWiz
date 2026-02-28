# CLAUDE.md — CodeLens Project Notes

## PROJECT OVERVIEW
CodeLens is a developer codebase understanding tool built during a 6-hour CIT hackathon.
Three services: frontend (React/Vite), backend (FastAPI), AI service (Python/Gemini).

## SHARED CONTRACT
All types live in `/shared/types.ts`. Do not edit unilaterally.

---

## BACKEND STATUS

- [x] POST /api/analyze endpoint
- [x] WebSocket /ws/{session_id} progress streaming
- [x] GET /api/result/{session_id}
- [x] POST /api/chat (proxy)
- [x] POST /api/explain (proxy)
- [x] POST /api/impact (NetworkX impact trace)
- [x] Stage 1: Ingestor (GitHub + ZIP)
- [x] Stage 2: File Scanner
- [x] Stage 3: Tech Stack Detector
- [x] Stage 4: Import Parser (JS/TS + Python)
- [x] Stage 5: Graph Builder (NetworkX)
- [x] Stage 6: Complexity Scorer
- [x] Stage 7: AI Orchestrator
- [x] docker-compose.yml

## BACKEND TECH
- FastAPI + uvicorn on port 8000
- tree-sitter-languages for JS/TS AST parsing (bundled grammars, no compilation)
- Python ast module for Python parsing
- NetworkX for dependency graphs
- httpx for async AI service calls
- In-memory sessions dict (no database)
- Regex fallback if tree-sitter fails on a file

## HOW TO RUN BACKEND
```bash
cd backend
conda activate work
pip install -r requirements.txt
python main.py  # or: uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## KNOWN ISSUES
- tree-sitter-languages uses tree-sitter 0.21.x API (not 0.22+). Pinned to tree-sitter==0.21.3.
- ZIP uploads with deeply nested single-root folders are unwrapped to the inner folder.
- If AI service is unreachable, pipeline completes with placeholder/empty AI fields.
- WebSocket connections are closed after pipeline finishes; frontend should reconnect if needed.

---

## FRONTEND STATUS
*(To be filled by frontend developer)*

## AI SERVICE STATUS
*(To be filled by AI developer)*
