import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { relatedCalls } from "@/api/client";
import { formatDurationFromInterval, formatTimestamp } from "@/lib/format";

interface RelatedCallsProps {
  callId: string;
  callManagerId?: string;
  primaryCdr: any;
}

interface FlowStep {
  label: string;
  detail: string;
  action: string;
  type: "device" | "trunk" | "cti" | "gateway";
}

function mapDeviceType(axlType: string | null | undefined): FlowStep["type"] {
  switch (axlType) {
    case "trunk":
      return "trunk";
    case "cti":
      return "cti";
    case "gateway":
      return "gateway";
    default:
      return "device";
  }
}

function describeAction(
  leg: any,
  type: FlowStep["type"],
  isOrig: boolean,
  prevType: FlowStep["type"] | null,
  isFirst: boolean,
  isLast: boolean,
  originalDialed: string | null,
): string {
  const cause = leg.destcause_description || "";
  const called = leg.finalcalledpartynumber || "";
  const origDialed = leg.originalcalledpartynumber || "";

  if (isOrig && isFirst && type === "gateway") return "Inbound call";
  if (isOrig && isFirst && type === "device") {
    if (originalDialed && originalDialed !== called) {
      return `Dialed ${originalDialed}`;
    }
    return called ? `Dialed ${called}` : "Originated call";
  }
  if (isOrig && !isFirst && type === "device") {
    if (originalDialed && origDialed !== called) {
      return `Dialed ${originalDialed}`;
    }
    return "Answered";
  }

  if (!isOrig) {
    if (type === "gateway") return "Routed to gateway";
    if (type === "trunk") {
      if (cause === "Call split") return "Call split to trunk";
      return "Routed to trunk";
    }
    if (type === "cti") return "Routed to CTI";
    if (isLast && type === "device") return "Delivered to agent";
    if (type === "device" && prevType === "trunk") return "Delivered";
    return "Connected";
  }

  return "";
}

function buildCallFlow(primaryCdr: any, related: any[]): FlowStep[] {
  const allLegs = [primaryCdr, ...related].sort(
    (a, b) =>
      new Date(a.datetimeorigination).getTime() -
      new Date(b.datetimeorigination).getTime(),
  );

  const steps: FlowStep[] = [];
  const seen = new Set<string>();

  const firstLeg = allLegs[0];
  const originalDialed = firstLeg?.originalcalledpartynumber || null;

  for (let i = 0; i < allLegs.length; i++) {
    const leg = allLegs[i];
    const origName = leg.origdevicename || "";
    const destName = leg.destdevicename || "";
    const origDesc = leg.orig_device_description || origName;
    const destDesc = leg.dest_device_description || destName;
    const caller = leg.callingpartynumber || "";
    const called = leg.finalcalledpartynumber || "";
    const prevType = steps.length > 0 ? steps[steps.length - 1].type : null;

    if (origName && !seen.has(origName)) {
      seen.add(origName);
      const type = mapDeviceType(leg.orig_device_type);
      const isFirst = steps.length === 0;
      const action = describeAction(
        leg,
        type,
        true,
        prevType,
        isFirst,
        false,
        originalDialed,
      );
      steps.push({
        label: type === "gateway" ? caller || origName : origDesc,
        detail: `${caller ? caller + " • " : ""}${origName}`,
        action,
        type,
      });
    }

    if (destName && !seen.has(destName)) {
      seen.add(destName);
      const type = mapDeviceType(leg.dest_device_type);
      const isLastLeg = i === allLegs.length - 1;
      const action = describeAction(
        leg,
        type,
        false,
        prevType,
        false,
        isLastLeg,
        originalDialed,
      );
      let detail = `${called ? called + " • " : ""}${destName}`;
      if (leg.lastredirectdn) {
        detail += ` (via ${leg.lastredirectdn})`;
      }
      steps.push({
        label: destDesc,
        detail,
        action,
        type,
      });
    }
  }

  return steps;
}

function stepColor(type: FlowStep["type"]): string {
  switch (type) {
    case "gateway":
      return "bg-green-500";
    case "trunk":
      return "bg-yellow-500";
    case "cti":
      return "bg-blue-500";
    case "device":
      return "bg-primary";
  }
}

function stepBorderColor(type: FlowStep["type"]): string {
  switch (type) {
    case "gateway":
      return "border-green-500/30";
    case "trunk":
      return "border-yellow-500/30";
    case "cti":
      return "border-blue-500/30";
    case "device":
      return "border-border";
  }
}

export function RelatedCalls({
  callId,
  callManagerId,
  primaryCdr,
}: RelatedCallsProps) {
  const navigate = useNavigate();
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    relatedCalls(callId, callManagerId)
      .then((data) => {
        if (!cancelled) {
          setResults(data.results);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [callId, callManagerId]);

  const flow = useMemo(
    () => (results.length > 0 ? buildCallFlow(primaryCdr, results) : []),
    [primaryCdr, results],
  );

  if (loading) return null;
  if (error) return null;
  if (results.length === 0) return null;

  return (
    <Card className="p-6">
      {/* Assumed call flow */}
      {flow.length > 1 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-1">Assumed Call Flow</h3>
          <p className="text-xs text-muted-foreground mb-4">
            Reconstructed from CDR legs — may not reflect exact routing
          </p>
          <div className="space-y-0">
            {flow.map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="flex flex-col items-center pt-1">
                  <div
                    className={`h-3 w-3 rounded-full ${stepColor(step.type)}`}
                  />
                  {i < flow.length - 1 && (
                    <div className="w-0.5 h-8 bg-border" />
                  )}
                </div>
                <div
                  className={`rounded-lg border ${stepBorderColor(step.type)} px-3 py-2 mb-1 flex-1`}
                >
                  {step.action && (
                    <p className="text-xs font-medium text-muted-foreground mb-0.5">
                      {step.action}
                    </p>
                  )}
                  <span className="text-sm font-medium">{step.label}</span>
                  <p className="text-xs text-muted-foreground">{step.detail}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-green-500" /> Gateway
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-yellow-500" /> Trunk
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-blue-500" /> CTI
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-primary" /> Device
            </span>
          </div>
        </div>
      )}

      {/* Related call legs */}
      <h3 className="text-lg font-semibold mb-4">
        Related Calls ({results.length})
      </h3>
      <p className="text-xs text-muted-foreground mb-3">
        Other call legs involving the same numbers within 5 minutes
      </p>
      <div className="space-y-2">
        {results.map((r) => {
          const isConnected = r.datetimeconnect != null;
          const isTransfer =
            r.origcallterminationonbehalfof === 5 ||
            r.origcallterminationonbehalfof === 6 ||
            r.destcallterminationonbehalfof === 5 ||
            r.destcallterminationonbehalfof === 6;
          const isConference = (r.joinonbehalfof || 0) !== 0;

          return (
            <div
              key={r.pkid}
              onClick={() =>
                navigate(
                  `/call/${r.globalcallid_callid}?cm=${r.globalcallid_callmanagerid}`,
                )
              }
              className="flex items-center justify-between rounded-md border border-border p-3 hover:bg-accent cursor-pointer transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-sm font-mono">
                  <span>{r.callingpartynumber || "N/A"}</span>
                  <span className="text-muted-foreground">→</span>
                  <span>{r.finalcalledpartynumber || "N/A"}</span>
                  {isTransfer && (
                    <Badge className="text-xs bg-orange-500/15 text-orange-400 border-orange-500/25">
                      Transfer
                    </Badge>
                  )}
                  {isConference && (
                    <Badge className="text-xs bg-blue-500/15 text-blue-400 border-blue-500/25">
                      Conference
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {r.orig_device_description || r.origdevicename}
                  {" → "}
                  {r.dest_device_description || r.destdevicename}
                  {r.lastredirectdn && (
                    <span className="ml-2">
                      Redirected from: {r.lastredirectdn}
                    </span>
                  )}
                  <span className="ml-2 opacity-50">
                    Call ID: {r.globalcallid_callid}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3 ml-4 shrink-0">
                <div className="text-right">
                  <div className="text-sm">
                    {formatDurationFromInterval(r.duration)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatTimestamp(r.datetimeorigination)}
                  </div>
                </div>
                <Badge variant={isConnected ? "default" : "destructive"}>
                  {isConnected
                    ? "Connected"
                    : r.destcause_description || `Cause ${r.destcause_value}`}
                </Badge>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
