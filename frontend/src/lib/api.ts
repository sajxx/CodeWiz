import axios from 'axios';
import { BACKEND_URL } from './env';
import type {
  AnalyzeRequest,
  AnalyzeResponse,
  AnalysisResult,
  ChatRequest,
  ChatResponse,
  ExplainRequest,
  ExplainResponse,
  ImpactRequest,
  ImpactResult,
} from '@shared/types';

const http = axios.create({ baseURL: BACKEND_URL });

export async function submitAnalysis(
  _data: AnalyzeRequest | FormData,
): Promise<AnalyzeResponse> {
  // TODO: Replace mock with: const res = await http.post<ApiResponse<AnalyzeResponse>>('/api/analyze', data);
  return { session_id: crypto.randomUUID() };
}

export async function fetchAnalysisResult(
  sessionId: string,
): Promise<AnalysisResult> {
  // TODO: Replace mock with: const res = await http.get<ApiResponse<AnalysisResult>>(`/api/analysis/${sessionId}`);
  const { mockAnalysisResult } = await import('@/mocks/analysisResult.mock');
  return { ...mockAnalysisResult, sessionId };
}

export async function sendChatMessage(
  payload: ChatRequest,
): Promise<ChatResponse> {
  // TODO: Replace mock with: const res = await http.post<ApiResponse<ChatResponse>>('/api/chat', payload);
  return { reply: `This is a mock response to: "${payload.message}". In production this answer will come from the AI service.` };
}

export async function fetchExplanation(
  payload: ExplainRequest,
): Promise<ExplainResponse> {
  // TODO: Replace mock with: const res = await http.post<ApiResponse<ExplainResponse>>('/api/explain', payload);
  return {
    explanation: `**${payload.element_name}** is a key part of the codebase. It handles core functionality related to ${payload.element_type.replace('_', ' ')}. Understanding this component is essential for making changes in the surrounding modules. It follows common patterns used throughout the project.`,
    links: [
      { title: 'React Documentation', url: 'https://react.dev' },
      { title: 'Express.js Guide', url: 'https://expressjs.com/en/guide/routing.html' },
      { title: 'TypeScript Handbook', url: 'https://www.typescriptlang.org/docs/handbook/' },
    ],
  };
}

export async function fetchImpact(
  payload: ImpactRequest,
): Promise<ImpactResult> {
  // TODO: Replace mock with: const res = await http.post<ApiResponse<ImpactResult>>('/api/impact', payload);
  return {
    targetFile: payload.file_path,
    affected: [
      { path: 'src/routes/index.ts', level: 'direct', reason: `Directly imports ${payload.file_path}` },
      { path: 'src/app.ts', level: 'direct', reason: `Mounts routes that depend on ${payload.file_path}` },
      { path: 'src/middleware/errorHandler.ts', level: 'transitive', reason: 'Error handler wraps routes transitively' },
      { path: 'src/utils/logger.ts', level: 'transitive', reason: 'Logger used by dependent modules' },
      { path: 'tsconfig.json', level: 'config', reason: 'TypeScript config governs compilation of this file' },
      { path: 'package.json', level: 'config', reason: 'Dependency versions affect build output' },
    ],
  };
}

export { http };
