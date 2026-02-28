# CLAUDE.md — CodeLens Development Log

## 1. PROJECT OVERVIEW

CodeLens is a developer codebase understanding tool that analyzes GitHub repositories or uploaded ZIP files to produce an interactive dashboard featuring architecture summaries, dependency graphs, complexity scores, execution flow diagrams, and new-developer onboarding checklists. It is being built during a 6-hour hackathon by three developers owning the frontend, backend, and AI service respectively.

## 2. REPO STRUCTURE

```
CodeWiz/
├── CLAUDE.md                    # This file — development log and coordination doc
├── docker-compose.yml           # Container orchestration for all services
├── README.md                    # Project readme
├── ai/                          # AI service (Python) — generates explanations, summaries
├── backend/                     # Backend API (FastAPI/Express) — orchestrates analysis pipeline
├── frontend/                    # React 18 + Vite + TypeScript SPA
│   ├── src/
│   │   ├── components/
│   │   │   ├── chatbot/         # ChatbotDrawer component
│   │   │   ├── layout/          # Sidebar, TopBar
│   │   │   ├── modals/          # AIExplanationPopup, ImpactPreviewModal
│   │   │   └── panels/          # All dashboard panels
│   │   ├── lib/                 # API client, WebSocket, env config, export utils
│   │   ├── mocks/               # Mock data for development
│   │   ├── pages/               # LandingPage, Dashboard
│   │   └── store/               # Zustand state stores
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   └── package.json
└── shared/
    └── types.ts                 # Shared type contract — DO NOT edit unilaterally
```

## 3. SHARED CONTRACT

`/shared/types.ts` is the single source of truth for all request/response shapes, domain models, and enum types. All three services (frontend, backend, AI) import from this file. **Do not modify it without agreement from all three developers.**

## 4. FRONTEND STATUS

| Component / Panel          | Status       | File(s)                                                    |
|----------------------------|--------------|------------------------------------------------------------|
| Vite + React + TS scaffold | DONE         | `frontend/vite.config.ts`, `frontend/tsconfig.app.json`   |
| Tailwind CSS v3            | DONE         | `frontend/tailwind.config.js`, `frontend/src/index.css`   |
| Zustand stores             | DONE         | `frontend/src/store/progressStore.ts`                      |
|                            |              | `frontend/src/store/analysisStore.ts`                      |
|                            |              | `frontend/src/store/chatStore.ts`                          |
| Mock data                  | DONE         | `frontend/src/mocks/analysisResult.mock.ts`                |
| Landing Page               | DONE         | `frontend/src/pages/LandingPage.tsx`                       |
| Dashboard Shell + Sidebar  | DONE         | `frontend/src/pages/Dashboard.tsx`                         |
|                            |              | `frontend/src/components/layout/Sidebar.tsx`               |
|                            |              | `frontend/src/components/layout/TopBar.tsx`                |
| Progress Panel             | DONE         | `frontend/src/components/panels/ProgressPanel.tsx`         |
| Overview Panel             | DONE         | `frontend/src/components/panels/OverviewPanel.tsx`         |
| Dependency Graph Panel     | DONE         | `frontend/src/components/panels/DependencyGraphPanel.tsx`  |
| Core Components Panel      | DONE         | `frontend/src/components/panels/CoreComponentsPanel.tsx`   |
| Execution Flow Panel       | DONE         | `frontend/src/components/panels/ExecutionFlowPanel.tsx`    |
| Complexity Scores Panel    | DONE         | `frontend/src/components/panels/ComplexityScoresPanel.tsx`  |
| New Developer Checklist    | DONE         | `frontend/src/components/panels/ChecklistPanel.tsx`        |
| Chatbot Drawer             | DONE         | `frontend/src/components/chatbot/ChatbotDrawer.tsx`        |
| AI Explanation Popup       | DONE         | `frontend/src/components/modals/AIExplanationPopup.tsx`    |
| Impact Preview Modal       | DONE         | `frontend/src/components/modals/ImpactPreviewModal.tsx`    |
| Export (PDF + Markdown)    | DONE         | `frontend/src/lib/export.ts`                               |
| API Client                 | DONE         | `frontend/src/lib/api.ts`                                  |
| WebSocket Client           | DONE         | `frontend/src/lib/ws.ts`                                   |

## 5. BACKEND STATUS

| Component                   | Status       |
|-----------------------------|--------------|
| POST /api/analyze           | NOT STARTED  |
| GET /api/analysis/:id       | NOT STARTED  |
| POST /api/chat              | NOT STARTED  |
| POST /api/explain           | NOT STARTED  |
| POST /api/impact            | NOT STARTED  |
| WebSocket /ws/:session_id   | NOT STARTED  |

## 6. AI SERVICE STATUS

| Component                          | Status       |
|------------------------------------|--------------|
| Architecture summary generation    | NOT STARTED  |
| Module/service role descriptions   | NOT STARTED  |
| Complexity risk commentary         | NOT STARTED  |
| Chat Q&A                          | NOT STARTED  |
| Explanation generation             | NOT STARTED  |
| Execution flow detection           | NOT STARTED  |
| Checklist generation               | NOT STARTED  |

## 7. INTEGRATION NOTES

### Mock Data Location
- **File:** `frontend/src/mocks/analysisResult.mock.ts`
- Contains a realistic `AnalysisResult` for a small Express + React fullstack app
- 6 modules, 15 graph nodes, 17 edges, 2 critical risk modules, 2 execution flows, 9 checklist items

### Lines to Replace at Hour 5 Integration
Each API function in `frontend/src/lib/api.ts` has a `// TODO: Replace mock with:` comment showing the real API call. Specifically:

1. **`submitAnalysis()`** — Line ~21: uncomment `http.post('/api/analyze', data)`, remove mock return
2. **`fetchAnalysisResult()`** — Line ~28: uncomment `http.get('/api/analysis/${sessionId}')`, remove mock import
3. **`sendChatMessage()`** — Line ~35: uncomment `http.post('/api/chat', payload)`, remove mock return
4. **`fetchExplanation()`** — Line ~41: uncomment `http.post('/api/explain', payload)`, remove mock return
5. **`fetchImpact()`** — Line ~57: uncomment `http.post('/api/impact', payload)`, remove mock return

### WebSocket
- `frontend/src/lib/ws.ts` already connects to `ws://[BACKEND_URL]/ws/{session_id}`
- Falls back to mock (simulates completion after 2s) when WS connection fails

### Environment
- Set `VITE_BACKEND_URL` in `.env` or it defaults to `http://localhost:8000`

## 8. KNOWN ISSUES

1. **Execution Flow diamond nodes**: The decision diamond uses CSS `rotate(45deg)` which also rotates the label text. A custom React Flow node component would fix this but was skipped for speed.
2. **React Flow re-renders**: The Dagre layout is recalculated in `useMemo` but `useNodesState`/`useEdgesState` initialization only uses the first value. Switching edge labels requires a remount.
3. **Chunk size warning**: The production build has a >500KB chunk from React Flow + jsPDF. Code-splitting could improve this.
4. **No error boundaries**: Panels can crash on unexpected null data. Error boundaries should be added.
5. **No loading skeletons for all panels**: Only the Overview panel has a skeleton loader.

## 9. CONSTRAINTS REMINDER

- Do NOT create any files outside /frontend/ except CLAUDE.md at repo root
- Do NOT modify /shared/types.ts
- Do NOT install any library not listed above without flagging it first in CLAUDE.md
- All components must be TypeScript — no .jsx files, no implicit any
- Tailwind only for styling — no inline styles, no CSS modules, no styled-components
- All API calls must use the shared types as request/response shapes
- The Zustand store must be in /frontend/src/store/ — one file per concern (progressStore.ts, analysisStore.ts, chatStore.ts)
- React Flow graph must use Dagre layout — do not use the default random layout
- Every panel must render without crashing when given the mock data
- No hardcoded session IDs — always read from Zustand store
