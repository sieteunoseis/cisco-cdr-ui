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

export function sipLadder(callId: string, callManagerId?: string) {
  return apiFetch<{
    messages: any[];
    count: number;
    callIds: string[];
    files_searched: number;
    timeWindow: { from: string; to: string };
  }>("/api/v1/cdr/logs/sip-ladder", {
    method: "POST",
    body: JSON.stringify({ callId, callManagerId }),
  });
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

export function relatedCalls(
  callId: string,
  callManagerId?: string,
  windowSeconds?: number,
) {
  const params = new URLSearchParams();
  if (callManagerId) params.set("callmanager_id", callManagerId);
  if (windowSeconds) params.set("window", String(windowSeconds));
  const qs = params.toString();
  return apiFetch<{ count: number; results: any[] }>(
    `/api/v1/cdr/related/${callId}${qs ? `?${qs}` : ""}`,
  );
}

export function sqlSchema() {
  return apiFetch<{
    tables: Record<string, { name: string; type: string }[]>;
  }>("/api/v1/cdr/sql/schema");
}

export function healthCheck() {
  return apiFetch<any>("/api/v1/health");
}

// Starred calls
export function getStarred() {
  return apiFetch<{ starred: any[]; count: number }>("/api/v1/starred");
}

export function isStarred(callId: string, callManagerId: string) {
  return apiFetch<{ starred: boolean; data: any }>(
    `/api/v1/starred/${callId}/${callManagerId}`,
  );
}

export function starCall(callId: string, callManagerId: string, note?: string) {
  return apiFetch<{ starred: boolean; data: any }>(
    `/api/v1/starred/${callId}/${callManagerId}`,
    { method: "POST", body: JSON.stringify({ note }) },
  );
}

export function unstarCall(callId: string, callManagerId: string) {
  return apiFetch<{ starred: boolean }>(
    `/api/v1/starred/${callId}/${callManagerId}`,
    { method: "DELETE" },
  );
}

// Device info
export function getDeviceInfo(deviceName: string, clusterId?: string) {
  const qs = clusterId ? `?cluster=${encodeURIComponent(clusterId)}` : "";
  return apiFetch<{
    found: boolean;
    deviceName: string;
    ip: string | null;
    status: string;
    statusReason: number;
    statusReasonText: string;
    model: string;
    protocol: string;
    activeLoadId: string;
    dirNumber: string;
    description: string;
    webCapable: boolean;
    webPages: Record<string, string> | null;
  }>(`/api/v1/device/${deviceName}${qs}`);
}

export function getPhoneWebPage(
  deviceName: string,
  page: string,
  clusterId?: string,
) {
  const qs = clusterId ? `?cluster=${encodeURIComponent(clusterId)}` : "";
  return apiFetch<{
    deviceName: string;
    ip: string;
    page: string;
    html: string;
  }>(`/api/v1/device/${deviceName}/web/${page}${qs}`);
}
