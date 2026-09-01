import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Phone, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLabelRules } from "@/hooks/useLabelRules";
import {
  getNumplanSeats,
  getNumplanDevices,
  type SeatMapResponse,
  type NumplanDevice,
} from "@/api/client";

const LAST_LABEL_KEY = "cdr-dn-map-last-label";

interface SeatMapState {
  data: SeatMapResponse | null;
  loading: boolean;
  error: string | null;
}

interface DeviceLookupState {
  number: string;
  loading: boolean;
  error: string | null;
  devices: NumplanDevice[];
}

export function SeatMapPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { rules, loading: rulesLoading } = useLabelRules();
  // Read once, synchronously, at mount — no effect needed. Which *rule* this
  // name maps to isn't known until `rules` finishes loading, so selectedRule/
  // selectedId below are derived during render rather than stored directly;
  // once `rules` populates, they resolve on their own without any extra
  // setState round trip. A `?label=` link (e.g. from the Settings page)
  // takes priority over the remembered last-viewed label.
  const [selectedLabelName, setSelectedLabelName] = useState<string | null>(
    () => {
      const fromUrl = searchParams.get("label");
      if (fromUrl) return fromUrl;
      try {
        return localStorage.getItem(LAST_LABEL_KEY);
      } catch {
        return null;
      }
    },
  );
  const [page, setPage] = useState(1);
  // If a label was restored from storage above, seed loading:true so the
  // "Loading DN map…" message shows immediately instead of a blank gap
  // while the fetch effect below resolves it.
  const [state, setState] = useState<SeatMapState>({
    data: null,
    loading: selectedLabelName !== null,
    error: null,
  });
  const [flippedNumber, setFlippedNumber] = useState<string | null>(null);
  const [deviceLookup, setDeviceLookup] = useState<DeviceLookupState | null>(
    null,
  );

  const numberRules = rules.filter(
    (r) => r.fields.includes("calling") || r.fields.includes("called"),
  );
  const selectedRule = selectedLabelName
    ? numberRules.find((r) => r.label === selectedLabelName) || null
    : null;
  const selectedId = selectedRule?.id ?? "";

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    setPage(1);
    setFlippedNumber(null);
    setDeviceLookup(null);

    const rule = numberRules.find((r) => r.id === id);
    setSelectedLabelName(rule ? rule.label : null);
    try {
      if (rule) {
        localStorage.setItem(LAST_LABEL_KEY, rule.label);
      } else {
        localStorage.removeItem(LAST_LABEL_KEY);
      }
    } catch {
      // localStorage unavailable — selection still works, just won't persist.
    }
  };

  const handlePreviousClick = () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    setPage((p) => Math.max(1, p - 1));
    setFlippedNumber(null);
  };

  const handleNextClick = () => {
    const data = state.data;
    if (data && data.eligible) {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      setPage((p) => Math.min(data.totalPages, p + 1));
      setFlippedNumber(null);
    }
  };

  const handleSeatClick = (number: string) => {
    setFlippedNumber((current) => (current === number ? null : number));
  };

  const handleViewDevices = (number: string) => {
    setDeviceLookup({ number, loading: true, error: null, devices: [] });
    getNumplanDevices(number)
      .then((res) => {
        setDeviceLookup({
          number,
          loading: false,
          error: null,
          devices: res.devices,
        });
      })
      .catch((err) => {
        setDeviceLookup({
          number,
          loading: false,
          error:
            err instanceof Error ? err.message : "Failed to load devices.",
          devices: [],
        });
      });
  };

  const handleViewHistory = (number: string) => {
    navigate(`/?q=${encodeURIComponent(number)}`);
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
        <h2 className="text-lg font-semibold">DN Map</h2>
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
        <p className="text-sm text-muted-foreground">Loading DN map…</p>
      )}

      {selectedRule && !state.loading && state.data && !state.data.eligible && (
        <p className="text-sm text-muted-foreground">
          This label isn't a fixed-width number range — no DN map available.
        </p>
      )}

      {selectedRule && !state.loading && state.data && state.data.eligible && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Prefix <code>{state.data.prefix || "(none)"}</code> ·{" "}
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

          <div className="grid grid-cols-10 gap-1 [perspective:600px]">
            {state.data.seats.map((seat) => {
              const isFlipped = flippedNumber === seat.number;
              return (
                <div
                  key={seat.number}
                  className="relative aspect-square cursor-pointer transition-transform duration-300 [transform-style:preserve-3d]"
                  style={{
                    transform: isFlipped ? "rotateY(180deg)" : undefined,
                  }}
                  onClick={() => handleSeatClick(seat.number)}
                  title={
                    seat.configured
                      ? `${seat.number} — ${seat.description ?? "Configured"}`
                      : `${seat.number} — not configured`
                  }
                >
                  <div
                    className={`absolute inset-0 rounded flex items-center justify-center text-[10px] [backface-visibility:hidden] ${
                      seat.configured
                        ? "bg-primary/80 text-primary-foreground"
                        : "border border-border text-muted-foreground"
                    }`}
                  >
                    {seat.number.slice(-4)}
                  </div>
                  <div
                    className="absolute inset-0 rounded border border-border bg-card flex items-center justify-center gap-1 [backface-visibility:hidden]"
                    style={{ transform: "rotateY(180deg)" }}
                  >
                    {seat.configured && (
                      <button
                        type="button"
                        title="View devices"
                        className="text-muted-foreground hover:text-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewDevices(seat.number);
                        }}
                      >
                        <Phone className="size-3" />
                      </button>
                    )}
                    <button
                      type="button"
                      title="View call history"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewHistory(seat.number);
                      }}
                    >
                      <History className="size-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {deviceLookup && (
            <div className="rounded-lg border border-border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">
                  Devices on {deviceLookup.number}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeviceLookup(null)}
                >
                  Close
                </Button>
              </div>
              {deviceLookup.loading && (
                <p className="text-sm text-muted-foreground">Loading…</p>
              )}
              {deviceLookup.error && (
                <p className="text-sm text-destructive">
                  {deviceLookup.error}
                </p>
              )}
              {!deviceLookup.loading &&
                !deviceLookup.error &&
                deviceLookup.devices.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No devices found for this number.
                  </p>
                )}
              {!deviceLookup.loading && deviceLookup.devices.length > 0 && (
                <ul className="space-y-1">
                  {deviceLookup.devices.map((d) => (
                    <li key={d.name} className="text-sm">
                      <span className="font-mono">{d.name}</span>
                      {d.description && (
                        <span className="text-muted-foreground">
                          {" "}
                          — {d.description}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
