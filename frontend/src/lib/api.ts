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

const http = axios.create({
  baseURL: BACKEND_URL,
  // Allow 202 responses without throwing (used for polling)
  validateStatus: (status) => status >= 200 && status < 500,
});

export async function submitAnalysis(
  data: AnalyzeRequest | FormData,
): Promise<AnalyzeResponse> {
  const payload =
    data instanceof FormData
      ? data
      : (() => {
          const fd = new FormData();
          if (data.github_url) fd.append('github_url', data.github_url);
          return fd;
        })();
  const res = await http.post<AnalyzeResponse>('/api/analyze', payload);
  return res.data;
}

export async function fetchAnalysisResult(
  sessionId: string,
): Promise<AnalysisResult> {
  // Poll until the result is ready (backend returns 202 while processing)
  const maxAttempts = 180; // up to ~6 minutes
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await http.get(`/api/result/${sessionId}`);
      if (res.status === 200 && res.data?.data) {
        return res.data.data as AnalysisResult;
      }
      if (res.status >= 400 && res.status !== 404) {
        throw new Error(res.data?.error || `Backend error: ${res.status}`);
      }
    } catch (err) {
      // Network error — keep retrying
      if (axios.isAxiosError(err) && !err.response) {
        console.warn(`[fetchAnalysisResult] Network error, retrying (${i + 1}/${maxAttempts})…`);
      } else {
        throw err;
      }
    }
    // 202 = still processing — wait and retry
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error('Analysis timed out. Please try again.');
}

/**
 * Poll the result endpoint once — returns the result if ready, null if still processing.
 * Used as a WebSocket fallback to check completion status.
 */
export async function pollResultStatus(
  sessionId: string,
): Promise<{ status: 'processing' | 'done' | 'error'; result?: AnalysisResult; error?: string }> {
  try {
    const res = await http.get(`/api/result/${sessionId}`);
    if (res.status === 200 && res.data?.data) {
      return { status: 'done', result: res.data.data as AnalysisResult };
    }
    if (res.status === 202) {
      return { status: 'processing' };
    }
    if (res.status >= 400) {
      return { status: 'error', error: res.data?.error || `Error ${res.status}` };
    }
    return { status: 'processing' };
  } catch {
    return { status: 'processing' };
  }
}

export async function sendChatMessage(
  payload: ChatRequest,
): Promise<ChatResponse> {
  const res = await http.post<ChatResponse>('/api/chat', payload);
  if (res.status >= 400) {
    throw new Error((res.data as unknown as { error?: string })?.error || 'Chat request failed');
  }
  return res.data;
}

export async function fetchExplanation(
  payload: ExplainRequest,
): Promise<ExplainResponse> {
  const res = await http.post<ExplainResponse>('/api/explain', payload);
  if (res.status >= 400) {
    throw new Error((res.data as unknown as { error?: string })?.error || 'Explain request failed');
  }
  return res.data;
}

export async function fetchImpact(
  payload: ImpactRequest,
): Promise<ImpactResult> {
  const res = await http.post<ImpactResult>('/api/impact', payload);
  if (res.status >= 400) {
    throw new Error((res.data as unknown as { error?: string })?.error || 'Impact request failed');
  }
  return res.data;
}

export async function fetchFileContent(
  sessionId: string,
  filePath: string,
): Promise<{ content: string; path: string }> {
  const res = await http.get(`/api/file/${sessionId}`, {
    params: { path: filePath },
  });
  if (res.status >= 400) {
    throw new Error(
      (res.data as unknown as { error?: string })?.error || 'File not found',
    );
  }
  return res.data as { content: string; path: string };
}

export { http };
