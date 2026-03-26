const BASE_URL =
  (window as any).__ENV__?.API_URL || import.meta.env.VITE_API_URL || "";

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `API error: ${res.status}`);
  }
  return res.json();
}

export function searchCdr(params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  return apiFetch<{ count: number; results: any[] }>(
    `/api/v1/cdr/search?${qs}`,
  );
}

export function traceCdr(callId: string, callManagerId?: string) {
  const qs = callManagerId ? `?callmanager_id=${callManagerId}` : "";
  return apiFetch<{ cdr: any[]; cmr: any[]; sdl_trace_command: string | null }>(
    `/api/v1/cdr/trace/${callId}${qs}`,
  );
}

export function qualityCdr(params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  return apiFetch<{ count: number; results: any[] }>(
    `/api/v1/cdr/quality?${qs}`,
  );
}

export function executeSql(query: string) {
  return apiFetch<{
    columns: string[];
    rows: any[];
    count: number;
    duration_ms: number;
  }>("/api/v1/cdr/sql", { method: "POST", body: JSON.stringify({ query }) });
}

export function collectLogs(callId: string, callManagerId?: string) {
  return apiFetch<{
    cluster: string;
    host: string;
    timeWindow: any;
    files: any[];
    count: number;
  }>("/api/v1/cdr/logs/collect", {
    method: "POST",
    body: JSON.stringify({ callId, callManagerId }),
  });
}

export function healthCheck() {
  return apiFetch<any>("/api/v1/health");
}
