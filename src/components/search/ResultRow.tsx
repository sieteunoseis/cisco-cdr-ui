import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import {
  formatDurationFromInterval,
  formatRelativeTime,
  formatTimestamp,
} from "@/lib/format";
import type { CdrResult } from "@/hooks/useSearch";

interface ResultRowProps {
  result: CdrResult;
  starred?: boolean;
  onToggleStar?: (callId: string, cmId: string, starred: boolean) => void;
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

// Transfer: on-behalf-of 5=transfer, 6=consult transfer only
// Don't trigger on lastredirectdn alone — UCCE populates it for normal routing
export function isTransfer(result: CdrResult): boolean {
  const obo = result.origcallterminationonbehalfof || 0;
  const dObo = result.destcallterminationonbehalfof || 0;
  return obo === 5 || obo === 6 || dObo === 5 || dObo === 6;
}

// Conference: joinonbehalfof is non-zero (values: 5=conference, etc.)
export function isConference(result: CdrResult): boolean {
  return (result.joinonbehalfof || 0) !== 0;
}

// Has a phone device (SEP, AN, JBR, TCT, BOT, CSF) on either side
const PHONE_PREFIX = /^(SEP|AN[A-F0-9]|JBR|TCT|BOT|CSF)/i;
export function hasPhoneDevice(result: CdrResult): boolean {
  return (
    PHONE_PREFIX.test(result.origdevicename || "") ||
    PHONE_PREFIX.test(result.destdevicename || "")
  );
}

export function ResultRow({ result, starred, onToggleStar }: ResultRowProps) {
  const navigate = useNavigate();
  const isConnected = result.datetimeconnect != null;
  const isRecording = isRecordingLeg(result);
  const transfer = !isRecording && isTransfer(result);
  const conference = !isRecording && isConference(result);

  return (
    <div
      className={`flex items-center justify-between rounded-lg border border-border p-4 hover:bg-accent cursor-pointer transition-colors ${isRecording ? "opacity-60" : ""}`}
    >
      <div
        className="flex-1 min-w-0"
        onClick={() =>
          navigate(
            `/call/${result.globalcallid_callid}?cm=${result.globalcallid_callmanagerid}`,
          )
        }
      >
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
          {transfer && (
            <Badge className="text-xs ml-2 bg-orange-500/15 text-orange-400 border-orange-500/25">
              Transfer
            </Badge>
          )}
          {conference && (
            <Badge className="text-xs ml-2 bg-blue-500/15 text-blue-400 border-blue-500/25">
              Conference
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
          {transfer && result.lastredirectdn && (
            <span className="mr-3">
              Redirected from: {result.lastredirectdn}
            </span>
          )}
          {result.orig_device_description || result.origdevicename}
          {" → "}
          {result.dest_device_description || result.destdevicename}
          <span className="ml-3 opacity-50">
            Call ID: {result.globalcallid_callid}
          </span>
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          {formatTimestamp(result.datetimeorigination)}
          <span className="ml-2 opacity-60">
            ({formatRelativeTime(result.datetimeorigination)})
          </span>
        </div>
      </div>
      <div className="flex items-center gap-3 ml-4 shrink-0">
        <div className="text-right">
          <div className="text-sm font-medium">
            {formatDurationFromInterval(result.duration)}
          </div>
        </div>
        <Badge variant={isConnected ? "default" : "destructive"}>
          {isConnected
            ? "Connected"
            : result.destcause_description || `Cause ${result.destcause_value}`}
        </Badge>
        {onToggleStar && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleStar(
                String(result.globalcallid_callid),
                String(result.globalcallid_callmanagerid),
                !starred,
              );
            }}
            className="text-lg transition-colors hover:scale-110 w-6 text-center"
            title={starred ? "Unstar call" : "Star call"}
          >
            {starred ? "★" : "☆"}
          </button>
        )}
      </div>
    </div>
  );
}
