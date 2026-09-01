import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useLabelRules } from "@/hooks/useLabelRules";
import { getNumplanSeats, type SeatMapResponse } from "@/api/client";

interface SeatMapState {
  data: SeatMapResponse | null;
  loading: boolean;
  error: string | null;
}

export function SeatMapPage() {
  const { rules, loading: rulesLoading } = useLabelRules();
  const [selectedId, setSelectedId] = useState<string>("");
  const [page, setPage] = useState(1);
  const [state, setState] = useState<SeatMapState>({
    data: null,
    loading: false,
    error: null,
  });

  const numberRules = rules.filter(
    (r) => r.fields.includes("calling") || r.fields.includes("called"),
  );
  const selectedRule = rules.find((r) => r.id === selectedId) || null;

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    setSelectedId(e.target.value);
    setPage(1);
  };

  const handlePreviousClick = () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    setPage((p) => Math.max(1, p - 1));
  };

  const handleNextClick = () => {
    const data = state.data;
    if (data && data.eligible) {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      setPage((p) => Math.min(data.totalPages, p + 1));
    }
  };

  useEffect(() => {
    if (!selectedId || rules.length === 0) {
      return;
    }

    const selectedRuleForFetch = rules.find((r) => r.id === selectedId);
    if (!selectedRuleForFetch) {
      return;
    }

    let cancelled = false;

    getNumplanSeats(selectedRuleForFetch.pattern, page)
      .then((res) => {
        if (!cancelled) {
          setState({ data: res, loading: false, error: null });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setState({
            data: null,
            loading: false,
            error:
              err instanceof Error ? err.message : "Failed to load seat map.",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedId, page, rules]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">DID Seat Map</h2>
      </div>

      <div>
        <label className="text-xs text-muted-foreground mb-1 block">
          Label
        </label>
        <select
          className="w-full max-w-sm rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={selectedId}
          onChange={handleSelectChange}
          disabled={rulesLoading}
        >
          <option value="">Select a label…</option>
          {numberRules.map((rule) => (
            <option key={rule.id} value={rule.id}>
              {rule.label}
            </option>
          ))}
        </select>
      </div>

      {state.error && (
        <div className="rounded-lg bg-destructive/10 p-3 text-destructive text-sm">
          {state.error}
        </div>
      )}

      {selectedRule && state.loading && (
        <p className="text-sm text-muted-foreground">Loading seat map…</p>
      )}

      {selectedRule && !state.loading && state.data && !state.data.eligible && (
        <p className="text-sm text-muted-foreground">
          This label isn't a fixed-width number range — no seat map
          available.
        </p>
      )}

      {selectedRule && !state.loading && state.data && state.data.eligible && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {state.data.totalCount} numbers · Page {state.data.page} of{" "}
              {state.data.totalPages}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={state.data.page <= 1}
                onClick={handlePreviousClick}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={state.data.page >= state.data.totalPages}
                onClick={handleNextClick}
              >
                Next
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-10 gap-1">
            {state.data.seats.map((seat) => (
              <div
                key={seat.number}
                title={
                  seat.configured
                    ? `${seat.number} — ${seat.description ?? "Configured"}`
                    : `${seat.number} — not configured`
                }
                className={`aspect-square rounded flex items-center justify-center text-[10px] ${
                  seat.configured
                    ? "bg-primary/80 text-primary-foreground"
                    : "border border-border text-muted-foreground"
                }`}
              >
                {seat.number.slice(-4)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
