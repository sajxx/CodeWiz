import { WS_URL } from './env';
import type { ProgressEvent } from '@shared/types';

export function connectProgressSocket(
  sessionId: string,
  onMessage: (event: ProgressEvent) => void,
  onError?: (err: Event) => void,
  onClose?: () => void,
): WebSocket {
  const url = `${WS_URL}/ws/${sessionId}`;
  const ws = new WebSocket(url);

  ws.onmessage = (ev) => {
    try {
      const data: ProgressEvent = JSON.parse(ev.data as string);
      onMessage(data);
    } catch {
      // ignore malformed messages
    }
  };

  ws.onerror = (ev) => onError?.(ev);
  ws.onclose = () => onClose?.();

  return ws;
}
