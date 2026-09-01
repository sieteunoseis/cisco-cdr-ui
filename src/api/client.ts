import type { LabelRule, LabelField, PaletteKey } from "@/hooks/useLabelRules";

const BASE_URL =
  (window as any).__ENV__?.API_URL || import.meta.env.VITE_API_URL || "";

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (res.status === 204) return null as T;
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

interface SipLadderResult {
  messages: any[];
  count: number;
  callIds: string[];
  files_searched: number;
  timeWindow: { from: string; to: string };
  cucmNode?: { hostname: string; ip: string | null };
  ipDns?: Record<string, string>;
}

export interface SipLadderJobStatus {
  jobId: string;
  status: "pending" | "downloading" | "parsing" | "complete" | "error";
  progress: { filesTotal: number; filesDownloaded: number; node: string };
  elapsed?: number;
  result?: SipLadderResult;
  error?: string;
}

// Start a background SIP ladder job
export function sipLadderStart(callId: string, callManagerId?: string) {
  return apiFetch<SipLadderJobStatus>("/api/v1/cdr/logs/sip-ladder", {
    method: "POST",
    body: JSON.stringify({ callId, callManagerId }),
  });
}

// Poll for job status
export function sipLadderStatus(jobId: string) {
  return apiFetch<SipLadderJobStatus>(
    `/api/v1/cdr/logs/sip-ladder/status/${encodeURIComponent(jobId)}`,
  );
}

// Convenience: start job and poll until complete
export function sipLadder(
  callId: string,
  callManagerId?: string,
  onProgress?: (status: SipLadderJobStatus) => void,
): Promise<SipLadderResult> {
  return new Promise(async (resolve, reject) => {
    try {
      const start = await sipLadderStart(callId, callManagerId);
      if (start.status === "complete" && start.result) {
        return resolve(start.result);
      }

      const jobId = start.jobId;
      const poll = async () => {
        try {
          const status = await sipLadderStatus(jobId);
          onProgress?.(status);
          if (status.status === "complete" && status.result) {
            resolve(status.result);
          } else if (status.status === "error") {
            reject(new Error(status.error || "SIP trace download failed"));
          } else {
            setTimeout(poll, 2000);
          }
        } catch (err) {
          reject(err);
        }
      };
      setTimeout(poll, 2000);
    } catch (err) {
      reject(err);
    }
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

export function checkStarred(
  calls: { callId: string; callManagerId: string }[],
) {
  return apiFetch<{ starred: Record<string, boolean> }>(
    "/api/v1/starred/check",
    { method: "POST", body: JSON.stringify({ calls }) },
  );
}

// Snapshots
export function getSnapshots(callId: string, cmId: string) {
  return apiFetch<{ snapshots: any[] }>(`/api/v1/snapshots/${callId}/${cmId}`);
}

export function getSnapshot(
  callId: string,
  cmId: string,
  type: string,
  device?: string,
) {
  const params = device ? `?device=${device}` : "";
  return apiFetch<any>(`/api/v1/snapshots/${callId}/${cmId}/${type}${params}`);
}

export function saveSnapshot(
  callId: string,
  cmId: string,
  type: string,
  content: string | object,
  deviceName?: string,
) {
  return apiFetch<{ saved: boolean; filePath: string }>(
    `/api/v1/snapshots/${callId}/${cmId}`,
    {
      method: "POST",
      body: JSON.stringify({ type, deviceName, content }),
    },
  );
}

// Device info
export function getDeviceBatch(devices: string[], clusterId?: string) {
  return apiFetch<{ devices: Record<string, any> }>("/api/v1/device/batch", {
    method: "POST",
    body: JSON.stringify({ devices, cluster: clusterId }),
  });
}

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

export function getPhoneLogs(deviceName: string, clusterId?: string) {
  const params = clusterId ? `?cluster=${clusterId}` : "";
  return apiFetch<{ logs: string[] }>(
    `/api/v1/device/${deviceName}/logs${params}`,
  );
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
    data?: { key: string; val: string }[];
    text?: string;
  }>(`/api/v1/device/${deviceName}/web/${page}${qs}`);
}

// Label rules
export function getLabels() {
  return apiFetch<{ rules: LabelRule[] }>("/api/v1/labels");
}

export function createLabel(rule: {
  label: string;
  color: PaletteKey;
  fields: LabelField[];
  pattern: string;
  enabled: boolean;
  external?: boolean;
}) {
  return apiFetch<{ rule: LabelRule }>("/api/v1/labels", {
    method: "POST",
    body: JSON.stringify(rule),
  });
}

export function updateLabel(
  id: string,
  patch: Partial<{
    label: string;
    color: PaletteKey;
    fields: LabelField[];
    pattern: string;
    enabled: boolean;
    external: boolean;
  }>,
) {
  return apiFetch<{ rule: LabelRule }>(`/api/v1/labels/${id}`, {
    method: "PUT",
    body: JSON.stringify(patch),
  });
}

export function deleteLabel(id: string) {
  return apiFetch<{ deleted: boolean }>(`/api/v1/labels/${id}`, {
    method: "DELETE",
  });
}

export function importLabels(rules: Omit<LabelRule, "id" | "createdAt">[]) {
  return apiFetch<{ imported: number; rules: LabelRule[] }>(
    "/api/v1/labels/bulk",
    { method: "POST", body: JSON.stringify({ rules }) },
  );
}

export function resetLabels() {
  return apiFetch<{ rules: LabelRule[] }>("/api/v1/labels/reset", {
    method: "POST",
  });
}

// Alert rules
export type AlertRuleType = "volume_spike" | "failure_rate";

export interface AlertRule {
  id: string;
  name: string;
  type: AlertRuleType;
  window: string;
  threshold: number;
  enabled: boolean;
  createdAt: string;
}

export interface AlertCheckResult extends AlertRule {
  triggered: boolean;
  current: number;
  baseline: number;
  value: number | null;
}

export function getAlertRules() {
  return apiFetch<{ rules: AlertRule[] }>("/api/v1/alerts/rules");
}

export function createAlertRule(rule: {
  name: string;
  type: AlertRuleType;
  window: string;
  threshold: number;
  enabled: boolean;
}) {
  return apiFetch<{ rule: AlertRule }>("/api/v1/alerts/rules", {
    method: "POST",
    body: JSON.stringify(rule),
  });
}

export function updateAlertRule(
  id: string,
  patch: Partial<{
    name: string;
    type: AlertRuleType;
    window: string;
    threshold: number;
    enabled: boolean;
  }>,
) {
  return apiFetch<{ rule: AlertRule }>(`/api/v1/alerts/rules/${id}`, {
    method: "PUT",
    body: JSON.stringify(patch),
  });
}

export function deleteAlertRule(id: string) {
  return apiFetch<{ deleted: boolean }>(`/api/v1/alerts/rules/${id}`, {
    method: "DELETE",
  });
}

export function checkAlerts() {
  return apiFetch<{ results: AlertCheckResult[] }>("/api/v1/alerts/check");
}

export interface AlertBreakdownEntry {
  number: string;
  current?: number;
  prior?: number;
  delta?: number;
  total?: number;
  failed?: number;
  rate?: number;
}

export function getAlertBreakdown(id: string) {
  return apiFetch<{
    byCalling: AlertBreakdownEntry[];
    byCalled: AlertBreakdownEntry[];
  }>(`/api/v1/alerts/rules/${id}/breakdown`);
}

// DN map
export interface SeatMapSeat {
  number: string;
  configured: boolean;
  description: string | null;
}

export type SeatMapResponse =
  | { eligible: false }
  | {
      eligible: true;
      prefix: string;
      totalCount: number;
      totalPages: number;
      page: number;
      seats: SeatMapSeat[];
    };

export function getNumplanSeats(pattern: string, page: number) {
  return apiFetch<SeatMapResponse>(
    `/api/v1/numplan/seats?pattern=${encodeURIComponent(pattern)}&page=${page}`,
  );
}

export interface NumplanDevice {
  name: string;
  description: string | null;
  adminUrl: string | null;
}

export function getNumplanDevices(number: string) {
  return apiFetch<{ devices: NumplanDevice[] }>(
    `/api/v1/numplan/devices?number=${encodeURIComponent(number)}`,
  );
}

export interface CallCounts {
  last24h: number;
  last7d: number;
  last30d: number;
}

export function getNumplanCallCounts(numbers: string[]) {
  return apiFetch<{ counts: Record<string, CallCounts> }>(
    `/api/v1/numplan/call-counts?numbers=${encodeURIComponent(numbers.join(","))}`,
  );
}

// Spam check
// Nomorobo is just { isSpam }. Scout returns its full raw result (carrier,
// line type, porting, geo/LATA/OCN data, etc.) — the index signature lets
// the UI render whatever fields are present without the client needing to
// enumerate every one of Scout's fields.
export interface SpamProviderResult {
  isSpam: boolean;
  error?: string;
  [key: string]: unknown;
}

export interface SpamCheckResult {
  isSpam: boolean;
  providers: Record<string, SpamProviderResult>;
}

export function checkSpam(number: string) {
  return apiFetch<SpamCheckResult>("/api/v1/spam/check", {
    method: "POST",
    body: JSON.stringify({ number }),
  });
}

export interface CachedSpamCheck extends SpamCheckResult {
  checkedAt: string;
}

export function getSpamChecked(numbers: string[]) {
  const q = encodeURIComponent(numbers.join(","));
  return apiFetch<{ results: Record<string, CachedSpamCheck> }>(
    `/api/v1/spam/checked?numbers=${q}`,
  );
}
