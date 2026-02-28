# CLAUDE.md — CodeLens Project

## Project Overview
CodeLens is a developer codebase understanding tool built during a 6-hour hackathon.
It consists of three services: frontend (port 5173), backend (port 8000), and AI/ML (port 8001).

## AI SERVICE STATUS

- [x] GET /health endpoint
- [x] ChromaDB setup and collection management
- [x] Chunker (Python AST + JS/TS regex)
- [x] Gemini embeddings (text-embedding-004)
- [x] POST /ai/index (full RAG indexing pipeline)
- [x] Agentic loop with function calling
- [x] POST /ai/summarize
- [x] POST /ai/components
- [x] POST /ai/complexity (critical/high only)
- [x] POST /ai/flows
- [x] POST /ai/checklist with templates
- [x] POST /ai/explain (RAG + doc links)
- [x] POST /ai/chat (RAG + history)

## Architecture

```
/ai/
  main.py                — FastAPI app, router registration, lifespan startup
  requirements.txt       — pinned dependencies
  /routers/              — one file per endpoint
    health.py            — GET /health
    index.py             — POST /ai/index
    summarize.py         — POST /ai/summarize
    components.py        — POST /ai/components
    complexity.py        — POST /ai/complexity
    flows.py             — POST /ai/flows
    checklist.py         — POST /ai/checklist
    explain.py           — POST /ai/explain
    chat.py              — POST /ai/chat
  /agent/
    loop.py              — agentic Gemini function-calling orchestration
    tools.py             — search_codebase, get_module_files, get_file_content
    prompts.py           — all system prompts and prompt builders
  /rag/
    chunker.py           — Python AST + JS/TS regex + config chunking
    embedder.py          — Gemini embedding model (configurable via GEMINI_EMBED_MODEL, default text-embedding-005) with batch + rate limiting
    store.py             — ChromaDB collection CRUD (cosine, batch 50)
  /templates/
    checklist_templates.py — per-project-type checklist templates
  /store/
    sessions.py          — in-memory session registry
  chroma_data/           — ChromaDB persistence (gitignored)
```

## Running the AI Service

```bash
cd ai
# From the repo root:
uvicorn ai.main:app --host 0.0.0.0 --port 8001 --reload
```

## Environment Variables

- `GEMINI_API_KEY` — Required. Gemini API key.
- `CHROMA_PERSIST_DIR` — Default `./chroma_data`. ChromaDB data directory.
- `MAX_AGENT_TOOL_CALLS` — Default `5`. Hard limit on agent tool calls per request.

## KNOWN ISSUES

- Gemini `gemini-2.0-flash-exp` may occasionally return markdown-fenced JSON (```json...```). All parsers strip fences before `json.loads`.
- ChromaDB PersistentClient requires the `chroma_data/` directory to exist. Created on first use.
- Embedding batch sleep (0.5s) may cause slow index times for large repos (500+ files). Consider parallelising if needed.
- The agentic loop forces text output after MAX_AGENT_TOOL_CALLS, which may produce truncated context for very complex repos.
