import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { formatDuration } from "@/lib/format";
import { useLabelRules } from "@/hooks/useLabelRules";
import {
  getAlertRules,
  createAlertRule,
  updateAlertRule,
  deleteAlertRule,
  checkAlerts,
  getAlertBreakdown,
  type AlertRule,
  type AlertRuleType,
  type AlertDirection,
  type AlertQualityMetric,
  type AlertCheckResult,
  type AlertBreakdownEntry,
  type LongCallEntry,
} from "@/api/client";

interface RuleFormState {
  name: string;
  type: AlertRuleType;
  window: string;
  threshold: string;
  labelId: string;
  direction: AlertDirection;
  metric: AlertQualityMetric;
}

const EMPTY_FORM: RuleFormState = {
  name: "",
  type: "volume_spike",
  window: "1h",
  threshold: "2",
  labelId: "",
  direction: "above",
  metric: "mos",
};

const WINDOW_RE = /^\d+[mhdw]$/;

// Types that accept an optional label scope (org-wide unless one is
// chosen) as opposed to label_volume, where the label is the whole point.
const LABEL_SCOPABLE_TYPES: AlertRuleType[] = [
  "volume_spike",
  "failure_rate",
  "quality_degradation",
];
// Types where "above vs. below the threshold" is a meaningful choice —
// failure_rate/long_call only make sense as "above" (a low failure rate or
// a call that stayed short isn't alert-worthy). quality_degradation's
// direction is implied by the chosen metric instead (MOS: worse = lower;
// jitter/latency/loss: worse = higher), so it's not in this list either.
const DIRECTION_TYPES: AlertRuleType[] = ["volume_spike", "label_volume"];

const TYPE_LABELS: Record<AlertRuleType, string> = {
  volume_spike: "Volume Spike",
  failure_rate: "Failure Rate",
  label_volume: "Label Volume",
  long_call: "Long Call",
  quality_degradation: "Quality Degradation",
};

const METRIC_LABELS: Record<AlertQualityMetric, string> = {
  mos: "MOS",
  jitter: "Jitter",
  latency: "Latency",
  loss: "Packet Loss",
};

function formatMetricValue(
  metric: AlertQualityMetric | null | undefined,
  value: number,
): string {
  switch (metric) {
    case "mos":
      return value.toFixed(2);
    case "jitter":
    case "latency":
      return `${Math.round(value)}ms`;
    case "loss":
      return `${Math.round(value)} pkts`;
    default:
      return String(value);
  }
}

function thresholdHint(
  type: AlertRuleType,
  direction: AlertDirection,
  metric: AlertQualityMetric,
): string {
  const below = direction === "below";
  switch (type) {
    case "volume_spike":
      return below
        ? "Multiplier — e.g. 0.5 means alert if call volume drops to 50% or less of the prior window (device/trunk-down detection)"
        : "Multiplier — e.g. 2 means alert if call volume is 2x the prior window";
    case "failure_rate":
      return "Percent — e.g. 20 means alert if 20% or more of calls failed";
    case "label_volume":
      return below
        ? "Count — e.g. 5 means alert if fewer than 5 calls match the chosen label in the window (e.g. recording silently stopped)"
        : "Count — e.g. 50 means alert if 50 or more calls match the chosen label in the window";
    case "long_call":
      return "Seconds — e.g. 3600 means alert if any call in the window exceeds 1 hour";
    case "quality_degradation":
      switch (metric) {
        case "mos":
          return "MOS score — e.g. 3.5 means alert if any call's MOS drops below 3.5";
        case "jitter":
          return "Milliseconds — e.g. 50 means alert if any call's jitter exceeds 50ms";
        case "latency":
          return "Milliseconds — e.g. 150 means alert if any call's latency exceeds 150ms";
        case "loss":
          return "Packets — e.g. 10 means alert if any call loses more than 10 packets";
      }
  }
}

function formatThreshold(rule: AlertRule): string {
  const below = rule.direction === "below";
  switch (rule.type) {
    case "volume_spike":
      return `${below ? "≤" : "≥"}${rule.threshold}x`;
    case "failure_rate":
      return `${rule.threshold}%`;
    case "label_volume":
      return `${below ? "<" : "≥"}${rule.threshold} calls`;
    case "long_call":
      return formatDuration(rule.threshold);
    case "quality_degradation": {
      const worse = rule.metric === "mos" ? "<" : ">";
      return `${rule.metric ? METRIC_LABELS[rule.metric] : "metric"} ${worse} ${formatMetricValue(rule.metric, rule.threshold)}`;
    }
  }
}

interface BreakdownListProps {
  title: string;
  type: AlertRuleType;
  entries: AlertBreakdownEntry[];
  onNumberClick: (number: string) => void;
}

function BreakdownList({
  title,
  type,
  entries,
  onNumberClick,
}: BreakdownListProps) {
  return (
    <div>
      <h4 className="text-xs font-semibold text-muted-foreground mb-1.5">
        {title}
      </h4>
      {entries.length === 0 ? (
        <p className="text-xs text-muted-foreground">No data.</p>
      ) : (
        <ul className="space-y-1">
          {entries.map((e) => (
            <li
              key={e.number}
              className="flex items-center justify-between text-xs"
            >
              <button
                type="button"
                onClick={() => onNumberClick(e.number)}
                className="font-mono text-primary hover:underline text-left"
                title="View calls for this number"
              >
                {e.number}
              </button>
              <span className="text-muted-foreground shrink-0 ml-2">
                {type === "volume_spike" &&
                  `${e.current} now (+${e.delta} vs ${e.prior} prior)`}
                {type === "failure_rate" &&
                  `${e.failed}/${e.total} failed (${e.rate}%)`}
                {type === "label_volume" && `${e.count} calls`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface LongCallListProps {
  calls: LongCallEntry[];
  metric?: AlertQualityMetric | null;
  onCallClick: (callId: string, callManagerId: string) => void;
}

function LongCallList({ calls, metric, onCallClick }: LongCallListProps) {
  if (calls.length === 0) {
    return <p className="text-xs text-muted-foreground">No data.</p>;
  }
  return (
    <ul className="space-y-1 sm:col-span-2">
      {calls.map((c) => (
        <li key={c.callId}>
          <button
            type="button"
            onClick={() => onCallClick(c.callId, c.callManagerId)}
            className="w-full flex items-center justify-between text-xs rounded px-1 py-0.5 hover:bg-accent text-left"
            title="View this call"
          >
            <span className="font-mono text-primary">
              {c.callingNumber ?? "—"}
              <span className="text-muted-foreground mx-1">→</span>
              {c.calledNumber ?? "—"}
            </span>
            <span className="text-muted-foreground shrink-0 ml-2">
              {metric
                ? formatMetricValue(metric, c.metricValue ?? 0)
                : formatDuration(c.durationSeconds ?? 0)}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export function AlertsPage() {
  const navigate = useNavigate();
  const { rules: labelRules } = useLabelRules();
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<RuleFormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [results, setResults] = useState<AlertCheckResult[]>([]);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [breakdown, setBreakdown] = useState<{
    byCalling?: AlertBreakdownEntry[];
    byCalled?: AlertBreakdownEntry[];
    calls?: LongCallEntry[];
  } | null>(null);
  const [breakdownLoading, setBreakdownLoading] = useState(false);
  const [breakdownError, setBreakdownError] = useState<string | null>(null);

  const toggleBreakdown = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    setBreakdown(null);
    setBreakdownError(null);
    setBreakdownLoading(true);
    getAlertBreakdown(id)
      .then((res) => {
        setBreakdown(res);
        setBreakdownLoading(false);
      })
      .catch((err) => {
        setBreakdownError(err instanceof Error ? err.message : String(err));
        setBreakdownLoading(false);
      });
  };

  const loadRules = useCallback(() => {
    setLoading(true);
    getAlertRules()
      .then((res) => {
        setRules(res.rules);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      });
  }, []);

  const runCheck = useCallback(() => {
    setChecking(true);
    checkAlerts()
      .then((res) => {
        setResults(res.results);
        setChecking(false);
        setCheckError(null);
      })
      .catch((err) => {
        setCheckError(err instanceof Error ? err.message : String(err));
        setChecking(false);
      });
  }, []);

  useEffect(() => {
    // Both start `loading`/`checking` state already true (initial useState
    // value) — this mount-time call is what the lint rule below is about.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadRules();
    runCheck();
  }, [loadRules, runCheck]);

  const windowValid = WINDOW_RE.test(form.window.trim());
  const thresholdNum = Number(form.threshold);
  const thresholdValid = Number.isFinite(thresholdNum) && thresholdNum > 0;
  const labelValid = form.type !== "label_volume" || form.labelId !== "";
  const canSave =
    form.name.trim() !== "" && windowValid && thresholdValid && labelValid;

  const startEdit = (rule: AlertRule) => {
    setEditingId(rule.id);
    setForm({
      name: rule.name,
      type: rule.type,
      window: rule.window,
      threshold: String(rule.threshold),
      labelId: rule.labelId ?? "",
      direction: rule.direction,
      metric: rule.metric ?? "mos",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleSave = () => {
    if (!canSave) return;
    const payload = {
      name: form.name.trim(),
      type: form.type,
      window: form.window.trim(),
      threshold: thresholdNum,
      direction: form.direction,
      labelId: form.labelId || null,
      metric: form.metric,
    };
    const action = editingId
      ? updateAlertRule(editingId, payload)
      : createAlertRule({ ...payload, enabled: true });
    action
      .then(() => {
        setSaveError(null);
        cancelEdit();
        loadRules();
        runCheck();
      })
      .catch((err) =>
        setSaveError(err instanceof Error ? err.message : "Save failed."),
      );
  };

  const toggleRule = (rule: AlertRule) => {
    updateAlertRule(rule.id, { enabled: !rule.enabled })
      .then(() => {
        loadRules();
        runCheck();
      })
      .catch((err) =>
        setSaveError(err instanceof Error ? err.message : "Update failed."),
      );
  };

  const removeRule = (id: string) => {
    deleteAlertRule(id)
      .then(() => {
        if (editingId === id) cancelEdit();
        loadRules();
        runCheck();
      })
      .catch((err) =>
        setSaveError(err instanceof Error ? err.message : "Delete failed."),
      );
  };

  const triggeredCount = results.filter((r) => r.triggered).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Alerts</h2>
        <Button
          variant="outline"
          size="sm"
          disabled={checking}
          onClick={runCheck}
        >
          {checking ? "Checking…" : "Refresh"}
        </Button>
      </div>

      <Card size="sm">
        <CardHeader>
          <CardTitle>
            Status
            {triggeredCount > 0 && (
              <span className="ml-2 text-xs px-2 py-0.5 rounded-full border border-destructive/40 bg-destructive/10 text-destructive">
                {triggeredCount} triggered
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {checkError && (
            <p className="text-sm text-destructive">{checkError}</p>
          )}
          {!checkError && results.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No enabled rules to evaluate. Add one below.
            </p>
          )}
          {results.map((r) => (
            <div key={r.id} className="rounded-lg border border-border p-3 text-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full border ${
                      r.triggered
                        ? "border-destructive/40 bg-destructive/10 text-destructive"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    {r.triggered ? "Triggered" : "OK"}
                  </span>
                  <span className="font-medium truncate">{r.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {TYPE_LABELS[r.type]} · last {r.window} · threshold{" "}
                    {formatThreshold(r)}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground">
                    {r.type === "volume_spike" &&
                      `${r.current} vs ${r.baseline} prior${
                        r.value !== null ? ` (${r.value}x)` : ""
                      }${r.labelName ? ` — ${r.labelName}` : ""}`}
                    {r.type === "failure_rate" &&
                      `${r.current}/${r.baseline} failed (${r.value}%)${
                        r.labelName ? ` — ${r.labelName}` : ""
                      }`}
                    {r.type === "label_volume" &&
                      `${r.current} of ${r.baseline} matched "${r.labelName ?? "label"}"`}
                    {r.type === "long_call" &&
                      `${r.current} over threshold${
                        r.value !== null
                          ? ` (max ${formatDuration(r.value)})`
                          : ""
                      }`}
                    {r.type === "quality_degradation" &&
                      `${r.current} of ${r.baseline} calls${
                        r.value !== null
                          ? ` (worst ${formatMetricValue(r.metric, r.value)})`
                          : ""
                      }${r.labelName ? ` — ${r.labelName}` : ""}`}
                  </span>
                  {r.triggered && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleBreakdown(r.id)}
                    >
                      {expandedId === r.id ? "Hide numbers" : "Show numbers"}
                    </Button>
                  )}
                </div>
              </div>

              {expandedId === r.id && (
                <div className="mt-3 pt-3 border-t border-border grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {breakdownLoading && (
                    <p className="text-xs text-muted-foreground sm:col-span-2">
                      Loading…
                    </p>
                  )}
                  {breakdownError && (
                    <p className="text-xs text-destructive sm:col-span-2">
                      {breakdownError}
                    </p>
                  )}
                  {breakdown &&
                    (r.type === "long_call" ||
                      r.type === "quality_degradation") && (
                      <LongCallList
                        calls={breakdown.calls ?? []}
                        metric={
                          r.type === "quality_degradation" ? r.metric : null
                        }
                        onCallClick={(callId, cm) =>
                          navigate(`/call/${callId}?cm=${cm}`)
                        }
                      />
                    )}
                  {breakdown &&
                    r.type !== "long_call" &&
                    r.type !== "quality_degradation" && (
                    <>
                      <BreakdownList
                        title="Top Calling Numbers"
                        type={r.type}
                        entries={breakdown.byCalling ?? []}
                        onNumberClick={(n) =>
                          navigate(`/?q=${encodeURIComponent(n)}`)
                        }
                      />
                      <BreakdownList
                        title="Top Called Numbers"
                        type={r.type}
                        entries={breakdown.byCalled ?? []}
                        onNumberClick={(n) =>
                          navigate(`/?q=${encodeURIComponent(n)}`)
                        }
                      />
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-lg bg-destructive/10 p-3 text-destructive text-sm">
          Couldn't load alert rules from the server: {error}
        </div>
      )}
      {saveError && (
        <div className="rounded-lg bg-destructive/10 p-3 text-destructive text-sm">
          {saveError}
        </div>
      )}

      <div className="rounded-lg border border-border p-4 space-y-3">
        <h3 className="text-sm font-semibold">
          {editingId ? "Edit Rule" : "Add Rule"}
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Name
            </label>
            <Input
              value={form.name}
              onChange={(e) =>
                setForm((f) => ({ ...f, name: e.target.value }))
              }
              placeholder="e.g. Overnight volume spike"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Type
            </label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.type}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  type: e.target.value as AlertRuleType,
                }))
              }
            >
              <option value="volume_spike">Volume Spike</option>
              <option value="failure_rate">Failure Rate</option>
              <option value="label_volume">Label Volume</option>
              <option value="long_call">Long Call</option>
              <option value="quality_degradation">Quality Degradation</option>
            </select>
          </div>
          {form.type === "quality_degradation" && (
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Metric
              </label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.metric}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    metric: e.target.value as AlertQualityMetric,
                  }))
                }
              >
                {(Object.keys(METRIC_LABELS) as AlertQualityMetric[]).map(
                  (m) => (
                    <option key={m} value={m}>
                      {METRIC_LABELS[m]}
                    </option>
                  ),
                )}
              </select>
            </div>
          )}
          {(form.type === "label_volume" ||
            LABEL_SCOPABLE_TYPES.includes(form.type)) && (
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                {form.type === "label_volume"
                  ? "Label"
                  : "Scope to Label (optional)"}
              </label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.labelId}
                onChange={(e) =>
                  setForm((f) => ({ ...f, labelId: e.target.value }))
                }
                aria-invalid={!labelValid}
              >
                <option value="">
                  {form.type === "label_volume"
                    ? "Select a label…"
                    : "None (org-wide)"}
                </option>
                {labelRules.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          {DIRECTION_TYPES.includes(form.type) && (
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Direction
              </label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.direction}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    direction: e.target.value as AlertDirection,
                  }))
                }
              >
                <option value="above">At or above threshold</option>
                <option value="below">At or below threshold (drop)</option>
              </select>
            </div>
          )}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Window
            </label>
            <Input
              value={form.window}
              onChange={(e) =>
                setForm((f) => ({ ...f, window: e.target.value }))
              }
              placeholder="e.g. 15m, 1h, 1d"
              aria-invalid={!windowValid}
            />
            {!windowValid && (
              <p className="text-xs text-destructive mt-1">
                Must look like 15m, 1h, 1d, 1w.
              </p>
            )}
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Threshold
            </label>
            <Input
              type="number"
              min="0"
              step="any"
              value={form.threshold}
              onChange={(e) =>
                setForm((f) => ({ ...f, threshold: e.target.value }))
              }
              aria-invalid={!thresholdValid}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {thresholdHint(form.type, form.direction, form.metric)}
        </p>
        <div className="flex items-center gap-2">
          <Button size="sm" disabled={!canSave} onClick={handleSave}>
            {editingId ? "Save Changes" : "Add Rule"}
          </Button>
          {editingId && (
            <Button variant="outline" size="sm" onClick={cancelEdit}>
              Cancel
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading rules…</p>
      ) : (
        <div className="space-y-2">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className="flex items-center justify-between rounded-lg border border-border p-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Switch
                  checked={rule.enabled}
                  onCheckedChange={() => toggleRule(rule)}
                />
                <span className="text-sm font-medium truncate">
                  {rule.name}
                </span>
                <span className="text-xs text-muted-foreground truncate">
                  {TYPE_LABELS[rule.type]} · {rule.window} ·{" "}
                  {formatThreshold(rule)}
                  {rule.labelId &&
                    ` · ${labelRules.find((l) => l.id === rule.labelId)?.label ?? "label"}`}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => startEdit(rule)}
                >
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeRule(rule.id)}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
          {rules.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No alert rules yet. Add one above — for example, a Volume
              Spike rule with a 1h window and 2x threshold.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
