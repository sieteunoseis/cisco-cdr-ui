import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldQuestion, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDurationFromInterval, formatTimestamp } from "@/lib/format";
import {
  isStarred,
  starCall,
  unstarCall,
  checkSpam,
  createLabel,
  getSpamChecked,
  type SpamProviderResult,
} from "@/api/client";
import { isCheckableNumber } from "@/lib/spam";

interface CallHeaderProps {
  cdr: any;
  onSpamProviders?: (
    providers: Record<string, SpamProviderResult> | null,
  ) => void;
}

type SpamStatus = "unknown" | "checking" | "not_spam" | "spam" | "error";

export function CallHeader({ cdr, onSpamProviders }: CallHeaderProps) {
  const navigate = useNavigate();
  const isConnected = cdr.datetimeconnect != null;
  const [starred, setStarred] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [spamStatus, setSpamStatus] = useState<SpamStatus>("unknown");
  const [spamProviders, setSpamProviders] = useState<
    Record<string, SpamProviderResult> | null
  >(null);

  const callId = String(cdr.globalcallid_callid);
  const cmId = String(cdr.globalcallid_callmanagerid);
  const callingNumber = cdr.callingpartynumber || "";

  useEffect(() => {
    isStarred(callId, cmId)
      .then((r) => setStarred(r.starred))
      .catch(() => {});
  }, [callId, cmId]);

  // Restore a previously cached spam-check result so the button doesn't
  // re-appear (and burn another add-on credit) on repeat visits.
  useEffect(() => {
    if (!isCheckableNumber(callingNumber)) return;
    getSpamChecked([callingNumber])
      .then((data) => {
        const cached = data.results[callingNumber];
        if (!cached) return;
        setSpamProviders(cached.providers);
        setSpamStatus(cached.isSpam ? "spam" : "not_spam");
      })
      .catch(() => {});
  }, [callingNumber]);

  useEffect(() => {
    onSpamProviders?.(spamProviders);
  }, [spamProviders, onSpamProviders]);

  const toggleStar = async () => {
    setToggling(true);
    try {
      if (starred) {
        await unstarCall(callId, cmId);
        setStarred(false);
      } else {
        await starCall(callId, cmId);
        setStarred(true);
      }
    } catch {}
    setToggling(false);
  };

  const runSpamCheck = async () => {
    setSpamStatus("checking");
    try {
      const { isSpam, providers } = await checkSpam(callingNumber);
      setSpamProviders(providers);
      if (isSpam) {
        // Also persist as a label rule so this number gets the same badge
        // everywhere else it shows up (Search results), not just here.
        await createLabel({
          label: "Spam",
          color: "red",
          fields: ["calling"],
          pattern: `^${callingNumber}$`,
          enabled: true,
          external: true,
        });
        setSpamStatus("spam");
      } else {
        setSpamStatus("not_spam");
      }
    } catch {
      setSpamStatus("error");
    }
  };

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
        ← Back
      </Button>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-mono font-bold">
              {cdr.callingpartynumber || "N/A"}
              <span className="text-muted-foreground mx-3">→</span>
              {cdr.finalcalledpartynumber || "N/A"}
            </h1>
            <button
              onClick={toggleStar}
              disabled={toggling}
              className="text-2xl transition-colors hover:scale-110"
              title={starred ? "Unstar call" : "Star call"}
            >
              {starred ? "★" : "☆"}
            </button>
            {isCheckableNumber(callingNumber) && spamStatus === "unknown" && (
              <button
                onClick={runSpamCheck}
                className="text-muted-foreground hover:text-foreground"
                title="Check calling number for spam"
              >
                <ShieldQuestion className="size-5" />
              </button>
            )}
            {spamStatus === "checking" && (
              <span className="text-xs text-muted-foreground">
                Checking…
              </span>
            )}
            {spamStatus === "not_spam" && (
              <span title="Verified not spam">
                <ShieldCheck className="size-5 text-green-500" />
              </span>
            )}
            {spamStatus === "spam" && (
              <Badge className="bg-red-500/15 text-red-400 border-red-500/25">
                Spam
              </Badge>
            )}
            {spamStatus === "error" && (
              <span className="text-xs text-destructive" title="Spam check failed">
                Spam check failed
              </span>
            )}
          </div>
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
