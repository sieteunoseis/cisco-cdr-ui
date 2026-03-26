import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDurationFromInterval, formatTimestamp } from "@/lib/format";

interface CallHeaderProps {
  cdr: any;
}

export function CallHeader({ cdr }: CallHeaderProps) {
  const navigate = useNavigate();
  const isConnected = cdr.datetimeconnect != null;

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
        ← Back
      </Button>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-mono font-bold">
            {cdr.callingpartynumber || "N/A"}
            <span className="text-muted-foreground mx-3">→</span>
            {cdr.finalcalledpartynumber || "N/A"}
          </h1>
          {cdr.originalcalledpartynumber &&
            cdr.originalcalledpartynumber !== cdr.finalcalledpartynumber && (
              <p className="text-lg font-mono text-muted-foreground mt-1">
                Originally dialed: {cdr.originalcalledpartynumber}
              </p>
            )}
          <p className="text-muted-foreground mt-1">
            {formatTimestamp(cdr.datetimeorigination)} —{" "}
            {formatDurationFromInterval(cdr.duration)}
            <span className="ml-3 opacity-50">
              Call ID: {cdr.globalcallid_callid} • CM:{" "}
              {cdr.globalcallid_callmanagerid} • {cdr.globalcallid_clusterid}
            </span>
          </p>
        </div>
        <Badge variant={isConnected ? "default" : "destructive"}>
          {isConnected ? "Connected" : `Cause ${cdr.destcause_value}`}
        </Badge>
      </div>
    </div>
  );
}
