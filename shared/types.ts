// /shared/types.ts
// CodeLens — Shared Type Contract v1.0.0
// All three developers import from this file. Do not edit unilaterally.

// ─────────────────────────────────────────────
// PROGRESS & SESSION
// ─────────────────────────────────────────────

export interface ProgressEvent {
  step:
    | 'Cloning Repository'
    | 'Scanning Files'
    | 'Detecting Tech Stack'
    | 'Parsing Imports'
    | 'Building Dependency Graph'
    | 'Calculating Complexity Scores'
    | 'Running AI Analysis'
    | 'Indexing to Knowledge Base'
    | 'Generating Checklist';
  status: 'pending' | 'active' | 'done' | 'error';
  message?: string;
}

export interface AnalyzeRequest {
  github_url?: string;
  // ZIP is sent as multipart/form-data, not in this interface
}

export interface AnalyzeResponse {
  session_id: string;
}

// ─────────────────────────────────────────────
// TECH STACK
// ─────────────────────────────────────────────

export interface TechStackItem {
  name: string;
  type: 'language' | 'framework' | 'tool' | 'database';
  color: string; // hex e.g. "#3178C6" for TypeScript
}

// ─────────────────────────────────────────────
// MODULES & SERVICES
// ─────────────────────────────────────────────

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface Service {
  id: string;
  name: string;
  path: string;
  role: string;
  dependencies: string[]; // array of service/file paths this service imports
}

export interface Module {
  id: string;
  name: string;
  path: string;
  role: string;           // AI-generated one-sentence description
  fileCount: number;
  services: Service[];
  complexityScore: ComplexityScore;
  riskLevel: RiskLevel;
}

// ─────────────────────────────────────────────
// DEPENDENCY GRAPH
// ─────────────────────────────────────────────

export type GraphNodeType = 'core' | 'utility' | 'entry' | 'config';

export interface GraphNode {
  id: string;
  label: string;
  type: GraphNodeType;
  moduleId: string;
  filePath: string;
}

export interface GraphEdge {
  id: string;
  source: string; // GraphNode id
  target: string; // GraphNode id
  importCount: number;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// ─────────────────────────────────────────────
// COMPLEXITY SCORES
// ─────────────────────────────────────────────

export type CouplingLevel = 'Low' | 'Medium' | 'High' | 'Very High';

export interface ComplexityScore {
  moduleId: string;
  name: string;
  fileCount: number;
  dependencyCount: number;  // how many modules this module imports from (out-degree)
  couplingScore: number;    // how many modules import FROM this module (in-degree)
  couplingLevel: CouplingLevel;
  avgLines: number;
  riskLevel: RiskLevel;
  aiCommentary?: string;    // only populated for 'high' and 'critical' modules
}

// ─────────────────────────────────────────────
// EXECUTION FLOW
// ─────────────────────────────────────────────

export type FlowStepType = 'service' | 'decision' | 'entry' | 'exit' | 'database';

export interface FlowStep {
  id: string;
  label: string;
  type: FlowStepType;
  description?: string;
  moduleId?: string;
}

export interface Flow {
  id: string;
  name: string; // e.g. "Authentication Flow", "Data Request Flow"
  steps: FlowStep[];
}

// ─────────────────────────────────────────────
// NEW DEVELOPER CHECKLIST
// ─────────────────────────────────────────────

export type ChecklistPhaseType = 'read' | 'setup' | 'start';

export interface ChecklistItem {
  id: string;
  label: string;
  filePath?: string;  // if present, clicking opens AI explanation popup
  isRequired: boolean;
}

export interface ChecklistPhase {
  phase: ChecklistPhaseType;
  title: string; // e.g. "Phase 1 — Read First"
  items: ChecklistItem[];
}

// ─────────────────────────────────────────────
// MAIN ANALYSIS RESULT
// ─────────────────────────────────────────────

export interface AnalysisResult {
  sessionId: string;
  projectName: string;
  repositoryUrl?: string;
  analyzedAt: string; // ISO timestamp
  techStack: TechStackItem[];
  architectureSummary: string;
  modules: Module[];
  graph: GraphData;
  complexityScores: ComplexityScore[];
  executionFlows: Flow[];
  checklist: ChecklistPhase[];
}

// ─────────────────────────────────────────────
// CHATBOT
// ─────────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ChatRequest {
  session_id: string;
  message: string;
  history: ChatMessage[];
}

export interface ChatResponse {
  reply: string;
}

// ─────────────────────────────────────────────
// AI EXPLANATION POPUP
// ─────────────────────────────────────────────

export type ExplainElementType =
  | 'graph_node'
  | 'tech_stack_badge'
  | 'module_card'
  | 'service_file'
  | 'complexity_row';

export interface DocLink {
  title: string;
  url: string;
}

export interface ExplainRequest {
  session_id: string;
  element_type: ExplainElementType;
  element_name: string;
  context?: string; // optional extra context e.g. the file path
}

export interface ExplainResponse {
  explanation: string;
  links: DocLink[];
}

// ─────────────────────────────────────────────
// IMPACT PREVIEW
// ─────────────────────────────────────────────

export type ImpactLevel = 'direct' | 'transitive' | 'config';

export interface AffectedFile {
  path: string;
  level: ImpactLevel;
  reason: string; // e.g. "Directly imports auth/middleware.ts"
}

export interface ImpactRequest {
  session_id: string;
  file_path: string;
}

export interface ImpactResult {
  targetFile: string;
  affected: AffectedFile[];
}

// ─────────────────────────────────────────────
// GENERIC API WRAPPER
// ─────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}