import { useParams, useSearchParams } from "react-router-dom";
import { useCallDetail } from "@/hooks/useCallDetail";
import { CallHeader } from "@/components/detail/CallHeader";
import { EnrichmentCard } from "@/components/detail/EnrichmentCard";
import { CallPath } from "@/components/detail/CallPath";
import { QualityCard } from "@/components/detail/QualityCard";
import { CollectLogs } from "@/components/detail/CollectLogs";
import { RelatedCalls } from "@/components/detail/RelatedCalls";
import { RawCdr } from "@/components/detail/RawCdr";

export function CallDetailPage() {
  const { callId } = useParams();
  const [searchParams] = useSearchParams();
  const callManagerId = searchParams.get("cm") || undefined;
  const { cdr, cmr, sdlTraceCommand, loading, error } = useCallDetail(
    callId!,
    callManagerId,
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-destructive/10 p-4 text-destructive text-sm">
        {error}
      </div>
    );
  }

  if (cdr.length === 0) {
    return (
      <p className="text-muted-foreground">
        No CDR records found for this call.
      </p>
    );
  }

  const primary = cdr[0];

  return (
    <div className="space-y-6">
      <CallHeader cdr={primary} />
      <EnrichmentCard cdr={primary} />
      <CallPath legs={cdr} />
      <QualityCard cmr={cmr} />
      <RelatedCalls
        callId={callId!}
        callManagerId={callManagerId}
        primaryCdr={primary}
      />
      <CollectLogs
        callId={callId!}
        callManagerId={callManagerId}
        sdlTraceCommand={sdlTraceCommand}
      />
      <RawCdr cdr={primary} />
    </div>
  );
}
