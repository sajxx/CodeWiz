import { WS_URL } from './env';
import { pollResultStatus } from './api';
import type { ProgressEvent, AnalysisResult } from '@shared/types';

/**
 * Manages a WebSocket connection with automatic reconnection and
 * a polling fallback so the app never stalls if the WS fails.
 */
export interface ProgressConnection {
  /** Cleanly close WebSocket and stop polling */
  close: () => void;
}

const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_BASE_DELAY_MS = 1000;
const POLL_INTERVAL_MS = 3000;

export function connectProgressSocket(
  sessionId: string,
  onMessage: (event: ProgressEvent) => void,
  onError?: (err: Event) => void,
  onComplete?: (result: AnalysisResult) => void,
): ProgressConnection {
  let ws: WebSocket | null = null;
  let reconnectAttempts = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let closed = false;
  let wsConnected = false;
  let analysisComplete = false;

  // ── Polling fallback ──────────────────────────────────
  function startPolling() {
    if (pollTimer || closed || analysisComplete) return;
    console.info('[WS Fallback] Starting polling for session', sessionId);

    pollTimer = setInterval(async () => {
      if (closed || analysisComplete) {
        stopPolling();
        return;
      }
      try {
        const status = await pollResultStatus(sessionId);
        if (status.status === 'done' && status.result) {
          analysisComplete = true;
          // Emit all steps as done so progress bar completes
          const allSteps: ProgressEvent['step'][] = [
            'Cloning Repository',
            'Scanning Files',
            'Detecting Tech Stack',
            'Parsing Imports',
            'Building Dependency Graph',
            'Calculating Complexity Scores',
            'Running AI Analysis',
            'Indexing to Knowledge Base',
            'Generating Checklist',
          ];
          for (const step of allSteps) {
            onMessage({ step, status: 'done' });
          }
          onComplete?.(status.result);
          stopPolling();
        } else if (status.status === 'error') {
          onMessage({ step: 'Running AI Analysis', status: 'error', message: status.error });
          stopPolling();
        }
        // 'processing' → keep polling
      } catch {
        // Network error — keep trying
      }
    }, POLL_INTERVAL_MS);
  }

  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  // ── WebSocket connection ──────────────────────────────
  function connect() {
    if (closed || analysisComplete) return;

    const url = `${WS_URL}/ws/${sessionId}`;
    try {
      ws = new WebSocket(url);
    } catch {
      // WebSocket constructor failed (e.g. bad URL) — fall back to polling
      startPolling();
      return;
    }

    ws.onopen = () => {
      console.info('[WS] Connected for session', sessionId);
      wsConnected = true;
      reconnectAttempts = 0;
      // If polling was running, stop it — WS is live
      stopPolling();
    };

    ws.onmessage = (ev) => {
      try {
        const data: ProgressEvent = JSON.parse(ev.data as string);
        onMessage(data);
      } catch {
        // ignore malformed messages
      }
    };

    ws.onerror = (ev) => {
      console.warn('[WS] Error for session', sessionId);
      onError?.(ev);
    };

    ws.onclose = (ev) => {
      wsConnected = false;
      console.info('[WS] Closed for session', sessionId, 'code:', ev.code);

      if (closed || analysisComplete) return;

      // Code 1000 = normal close (server closed after pipeline finished)
      // Code 4004 = session not found
      // In both cases, don't reconnect — just poll for the result
      if (ev.code === 1000 || ev.code === 4004) {
        console.info('[WS] Server closed normally, switching to polling for result');
        startPolling();
        return;
      }

      // Try to reconnect with exponential backoff for abnormal closes
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        const delay = RECONNECT_BASE_DELAY_MS * Math.pow(2, reconnectAttempts);
        reconnectAttempts++;
        console.info(`[WS] Reconnecting in ${delay}ms (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})…`);
        reconnectTimer = setTimeout(() => {
          connect();
        }, delay);
      } else {
        // Exhausted reconnection attempts — fall back to polling
        console.warn('[WS] Max reconnection attempts reached, falling back to polling');
        startPolling();
      }
    };
  }

  // Start the initial connection
  connect();

  // Also start polling as a safety net — it will stop once WS is confirmed working
  // We add a small delay so the WS has a chance to connect first
  setTimeout(() => {
    if (!wsConnected && !closed && !analysisComplete) {
      startPolling();
    }
  }, 2000);

  return {
    close: () => {
      closed = true;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      stopPolling();
      if (ws) {
        ws.onclose = null; // Prevent reconnect loop
        ws.close();
        ws = null;
      }
    },
  };
}
