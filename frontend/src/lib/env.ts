const raw = import.meta.env.VITE_BACKEND_URL as string | undefined;

export const BACKEND_URL = raw || 'http://localhost:8000';
export const WS_URL = BACKEND_URL.replace(/^http/, 'ws');
