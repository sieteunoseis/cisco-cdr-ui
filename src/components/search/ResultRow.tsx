import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import {
  formatDurationFromInterval,
  formatRelativeTime,
  formatTimestamp,
} from "@/lib/format";
import { mosToGrade, gradeBadgeVariant } from "@/lib/quality";
import type { CdrResult } from "@/hooks/useSearch";

interface ResultRowProps {
  result: CdrResult;
}

export function isRecordingLeg(result: CdrResult): boolean {
  const calling = result.callingpartynumber || "";
  const called = result.finalcalledpartynumber || "";
  const origDevice = result.origdevicename || "";
  const destDevice = result.destdevicename || "";
  const bib = /^b\d{5,}/;
  return (
    bib.test(calling) ||
    bib.test(called) ||
    /Inform|Record|BIB/i.test(origDevice) ||
    /Inform|Record|BIB/i.test(destDevice)
  );
}

export function ResultRow({ result }: ResultRowProps) {
  const navigate = useNavigate();
  const isConnected = result.datetimeconnect != null;
  const grade = mosToGrade(null);
  const isRecording = isRecordingLeg(result);

  return (
    <div
      onClick={() =>
        navigate(
          `/call/${result.globalcallid_callid}?cm=${result.globalcallid_callmanagerid}`,
        )
      }
      className={`flex items-center justify-between rounded-lg border border-border p-4 hover:bg-accent cursor-pointer transition-colors ${isRecording ? "opacity-60" : ""}`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-sm font-mono">
          <span className="font-medium">
            {result.callingpartynumber || "N/A"}
          </span>
          <span className="text-muted-foreground">→</span>
          <span className="font-medium">
            {result.finalcalledpartynumber || "N/A"}
          </span>
          {isRecording && (
            <Badge variant="outline" className="text-xs ml-2">
              Recording
            </Badge>
          )}
        </div>
        <div className="mt-1 text-xs text-muted-foreground truncate">
          {result.originalcalledpartynumber &&
            result.originalcalledpartynumber !==
              result.finalcalledpartynumber && (
              <span className="mr-3">
                Dialed: {result.originalcalledpartynumber}
              </span>
            )}
          {result.orig_device_description || result.origdevicename}
          {" → "}
          {result.dest_device_description || result.destdevicename}
          <span className="ml-3 opacity-50">
            Call ID: {result.globalcallid_callid}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-4 ml-4 shrink-0">
        <div className="text-right">
          <div className="text-sm font-medium">
            {formatDurationFromInterval(result.duration)}
          </div>
          <div
            className="text-xs text-muted-foreground"
            title={formatTimestamp(result.datetimeorigination)}
          >
            {formatRelativeTime(result.datetimeorigination)}
          </div>
        </div>
        <Badge variant={isConnected ? "default" : "destructive"}>
          {isConnected
            ? "Connected"
            : result.destcause_description || `Cause ${result.destcause_value}`}
        </Badge>
        <Badge variant={gradeBadgeVariant(grade)}>
          {grade === "ungraded"
            ? "Ungraded"
            : grade.charAt(0).toUpperCase() + grade.slice(1)}
        </Badge>
      </div>
    </div>
  );
}
