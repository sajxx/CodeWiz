# CodeWiz Backend

FastAPI server that accepts a GitHub URL or ZIP upload, runs a 7-stage analysis pipeline, streams progress over WebSocket, and serves the completed analysis via REST.

## Prerequisites

- Python 3.11+
- Conda (or virtualenv)
- Git (for cloning repos)

## Setup

```bash
# 1. Navigate to the backend directory
cd backend

# 2. Activate your conda environment
conda activate work

# 3. Install dependencies
pip install -r requirements.txt
```

## Running the Server

```bash
# Option A: With auto-reload (development)
python main.py

# Option B: Direct uvicorn
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The server starts on **http://localhost:8000**.

## Environment Variables

Loaded from `../.env` (project root). Key variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `GEMINI_API_KEY` | — | Required by AI service (validated on startup) |
| `AI_SERVICE_URL` | `http://localhost:8001` | URL of the AI service |
| `FRONTEND_URL` | `http://localhost:5173` | Added to CORS allowlist |
| `BACKEND_PORT` | `8000` | Port the backend listens on |
| `MAX_REPO_SIZE_MB` | `100` | Reject repos larger than this |
| `MAX_FILES_ANALYSED` | `500` | Max source files to parse |

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Health check |
| `POST` | `/api/analyze` | Start analysis (GitHub URL or ZIP) |
| `WS` | `/ws/{session_id}` | Stream pipeline progress events |
| `GET` | `/api/result/{session_id}` | Get completed analysis result |
| `POST` | `/api/chat` | Proxy chat to AI service |
| `POST` | `/api/explain` | Proxy explain to AI service |
| `POST` | `/api/impact` | File impact preview (NetworkX, no AI) |

---

## Sample Test Cases

Run these commands with the server running on port 8000.

### 1. Health Check

```bash
curl -s http://localhost:8000/api/health
```

**Expected output:**
```json
{"status": "ok"}
```

---

### 2. Analyze a GitHub Repository

```bash
curl -s -X POST http://localhost:8000/api/analyze \
  -F "github_url=https://github.com/expressjs/express"
```

**Expected output:**
```json
{"session_id": "e763aea3-31a7-4f59-83cc-44eac9a6de04"}
```
*(UUID will differ each run)*

---

### 3. Analyze a Small Repository (faster)

```bash
curl -s -X POST http://localhost:8000/api/analyze \
  -F "github_url=https://github.com/sindresorhus/is-odd"
```

**Expected output:**
```json
{"session_id": "<uuid>"}
```

---

### 4. Get Analysis Result

Wait a few seconds after submitting, then:

```bash
# Replace <session_id> with the UUID from step 2 or 3
curl -s http://localhost:8000/api/result/<session_id> | python3 -m json.tool | head -30
```

**Expected output (truncated):**
```json
{
    "success": true,
    "data": {
        "sessionId": "<session_id>",
        "projectName": "express",
        "analyzedAt": "2026-02-28T...",
        "techStack": [
            {"name": "JavaScript", "type": "language", "color": "#F7DF1E"}
        ],
        "modules": [ ... ],
        "graph": { "nodes": [...], "edges": [...] },
        "complexityScores": [ ... ]
    }
}
```

**If still processing** (HTTP 202):
```json
{"success": true, "data": {"status": "processing"}}
```

**If session not found** (HTTP 404):
```json
{"success": false, "error": "Session not found"}
```

---

### 5. Impact Preview

After analysis is done:

```bash
curl -s -X POST http://localhost:8000/api/impact \
  -H "Content-Type: application/json" \
  -d '{"session_id":"<session_id>","file_path":"lib/express.js"}' \
  | python3 -m json.tool
```

**Expected output:**
```json
{
    "targetFile": "lib/express.js",
    "affected": [
        {
            "path": "index.js",
            "level": "direct",
            "reason": "Directly imports lib/express.js"
        },
        {
            "path": "examples/route-middleware/index.js",
            "level": "direct",
            "reason": "Directly imports lib/express.js"
        },
        {
            "path": "test/acceptance/route-map.js",
            "level": "transitive",
            "reason": "Transitively depends on lib/express.js"
        }
    ]
}
```

---

### 6. Chat (requires AI service on port 8001)

```bash
curl -s -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "<session_id>",
    "message": "What does this codebase do?",
    "history": []
  }'
```

**Expected (AI running):**
```json
{"reply": "This codebase is..."}
```

**Expected (AI not running — HTTP 502):**
```json
{"success": false, "error": "AI service unavailable"}
```

---

### 7. Explain (requires AI service on port 8001)

```bash
curl -s -X POST http://localhost:8000/api/explain \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "<session_id>",
    "element_type": "module_card",
    "element_name": "lib",
    "context": "Core Express library folder"
  }'
```

**Expected (AI running):**
```json
{"explanation": "...", "links": [{"title": "...", "url": "..."}]}
```

---

### 8. Analyze a ZIP Upload

```bash
# Create a test zip first
mkdir -p /tmp/test-project/src
echo 'import os' > /tmp/test-project/src/main.py
echo 'from src.main import os' > /tmp/test-project/app.py
echo 'fastapi' > /tmp/test-project/requirements.txt
cd /tmp && zip -r test-project.zip test-project/

# Upload it
curl -s -X POST http://localhost:8000/api/analyze \
  -F "file=@/tmp/test-project.zip"
```

**Expected output:**
```json
{"session_id": "<uuid>"}
```

---

### 9. Invalid Request (no URL or file)

```bash
curl -s -X POST http://localhost:8000/api/analyze
```

**Expected (HTTP 400):**
```json
{"success": false, "error": "Provide either github_url or a ZIP file"}
```

---

### 10. WebSocket Progress (using websocat or Python)

```bash
# Install websocat: cargo install websocat  (or: brew install websocat)
# First start an analysis, then immediately connect:

SESSION=$(curl -s -X POST http://localhost:8000/api/analyze \
  -F "github_url=https://github.com/sindresorhus/is-odd" | python3 -c "import sys,json; print(json.load(sys.stdin)['session_id'])")

echo "Connecting to ws://localhost:8000/ws/$SESSION"
websocat "ws://localhost:8000/ws/$SESSION"
```

**Expected output (one JSON per line):**
```
{"step": "Cloning Repository", "status": "active", "message": "Starting repository ingestion…"}
{"step": "Cloning Repository", "status": "done", "message": "Repository ingested successfully"}
{"step": "Scanning Files", "status": "active", "message": "Scanning file tree…"}
{"step": "Scanning Files", "status": "done", "message": "Found 3 source files"}
...
{"step": "Generating Checklist", "status": "done", "message": "Checklist generated"}
```

**Alternative — Python WebSocket client:**
```python
import asyncio, json, websockets

async def listen(session_id):
    async with websockets.connect(f"ws://localhost:8000/ws/{session_id}") as ws:
        async for msg in ws:
            event = json.loads(msg)
            print(f"[{event['status']:6s}] {event['step']}: {event.get('message','')}")

# Replace with your session_id
asyncio.run(listen("<session_id>"))
```

---

## Pipeline Stages

| # | Stage | Module | Description |
|---|-------|--------|-------------|
| 1 | Ingestor | `pipeline/ingestor.py` | Git clone (depth=1) or ZIP extract |
| 2 | Scanner | `pipeline/scanner.py` | File tree walk, ignore rules |
| 3 | Tech Detector | `pipeline/tech_detector.py` | Detect stack from package.json, requirements.txt, etc. |
| 4 | Parser | `pipeline/parser.py` | AST import extraction (tree-sitter for JS/TS, ast for Python) |
| 5 | Graph Builder | `pipeline/graph_builder.py` | Module + file level NetworkX DiGraphs |
| 6 | Complexity | `pipeline/complexity.py` | Metrics, coupling levels, risk scores |
| 7 | Orchestrator | `pipeline/orchestrator.py` | Calls AI service, assembles AnalysisResult |

## Project Structure

```
backend/
├── main.py                  # FastAPI app entry point
├── requirements.txt         # Python dependencies
├── Dockerfile               # Container build
├── routers/
│   ├── analyze.py           # /api/analyze, /ws/{id}, /api/result/{id}
│   ├── chat.py              # /api/chat
│   ├── explain.py           # /api/explain
│   ├── impact.py            # /api/impact
│   └── health.py            # /api/health
├── pipeline/
│   ├── ingestor.py          # Stage 1
│   ├── scanner.py           # Stage 2
│   ├── tech_detector.py     # Stage 3
│   ├── parser.py            # Stage 4
│   ├── graph_builder.py     # Stage 5
│   ├── complexity.py        # Stage 6
│   └── orchestrator.py      # Stage 7
├── models/
│   └── session.py           # SessionData dataclass
├── store/
│   └── sessions.py          # In-memory sessions dict
└── utils/
    ├── progress.py          # WebSocket manager
    └── file_utils.py        # Safe file reading
```

## Notes

- The AI service (port 8001) is **not required** for Stages 1–6. If unreachable, the pipeline completes with empty/placeholder AI fields.
- All temp directories are cleaned up after results are stored.
- Session IDs are UUID4 strings.
- No database — everything is in-memory. Restarting the server clears all sessions.
