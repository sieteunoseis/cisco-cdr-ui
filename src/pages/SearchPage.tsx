import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { SearchBar } from "@/components/search/SearchBar";
import { TimeRange } from "@/components/search/TimeRange";
import {
  AdvancedSearch,
  type AdvancedSearchParams,
} from "@/components/search/AdvancedSearch";
import {
  ResultRow,
  isRecordingLeg,
  isTransfer,
  isConference,
  hasPhoneDevice,
} from "@/components/search/ResultRow";
import { useSearch } from "@/hooks/useSearch";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { checkStarred, starCall, unstarCall, getStarred } from "@/api/client";
import type { CdrResult } from "@/hooks/useSearch";

const REFRESH_INTERVAL = 30000;

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const initialTimeRange = searchParams.get("t") || "24h";

  const [timeRange, setTimeRange] = useState(initialTimeRange);
  const [limit, setLimit] = useState(100);
  const savedFilters = (() => {
    try {
      return JSON.parse(sessionStorage.getItem("cdr-filters") || "{}");
    } catch {
      return {};
    }
  })();
  const [hideRecording, setHideRecording] = useState(
    savedFilters.hideRecording ?? true,
  );
  const [hideZeroDuration, setHideZeroDuration] = useState(
    savedFilters.hideZeroDuration ?? false,
  );
  const [hideTransfer, setHideTransfer] = useState(
    savedFilters.hideTransfer ?? false,
  );
  const [hideConference, setHideConference] = useState(
    savedFilters.hideConference ?? false,
  );
  const [phonesOnly, setPhonesOnly] = useState(
    savedFilters.phonesOnly ?? false,
  );
  const [showStarredOnly, setShowStarredOnly] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Persist filter state to sessionStorage
  useEffect(() => {
    sessionStorage.setItem(
      "cdr-filters",
      JSON.stringify({
        hideRecording,
        hideZeroDuration,
        hideTransfer,
        hideConference,
        phonesOnly,
      }),
    );
  }, [
    hideRecording,
    hideZeroDuration,
    hideTransfer,
    hideConference,
    phonesOnly,
  ]);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const lastSearchRef = useRef<Record<string, string> | null>(null);
  const { results, count, loading, error, search } = useSearch();

  // Starred state
  const [starredMap, setStarredMap] = useState<Record<string, boolean>>({});
  const [starredResults, setStarredResults] = useState<CdrResult[]>([]);
  const [starredLoading, setStarredLoading] = useState(false);

  // Fetch starred status for current results
  useEffect(() => {
    if (results.length === 0) return;
    const calls = results.map((r) => ({
      callId: String(r.globalcallid_callid),
      callManagerId: String(r.globalcallid_callmanagerid),
    }));
    checkStarred(calls)
      .then((data) => setStarredMap(data.starred))
      .catch(() => {});
  }, [results]);

  // Load starred calls when filter is toggled on
  useEffect(() => {
    if (!showStarredOnly) return;
    setStarredLoading(true);
    getStarred()
      .then((data) => {
        setStarredResults(data.starred as CdrResult[]);
        // Mark all as starred
        const map: Record<string, boolean> = {};
        for (const r of data.starred) {
          map[`${r.globalcallid_callid}:${r.globalcallid_callmanagerid}`] =
            true;
        }
        setStarredMap((prev) => ({ ...prev, ...map }));
      })
      .catch(() => {})
      .finally(() => setStarredLoading(false));
  }, [showStarredOnly]);

  const handleToggleStar = useCallback(
    async (callId: string, cmId: string, star: boolean) => {
      const key = `${callId}:${cmId}`;
      try {
        if (star) {
          await starCall(callId, cmId);
          setStarredMap((prev) => ({ ...prev, [key]: true }));
        } else {
          await unstarCall(callId, cmId);
          setStarredMap((prev) => {
            const next = { ...prev };
            delete next[key];
            return next;
          });
          // Remove from starred view if showing starred only
          if (showStarredOnly) {
            setStarredResults((prev) =>
              prev.filter(
                (r) =>
                  !(
                    String(r.globalcallid_callid) === callId &&
                    String(r.globalcallid_callmanagerid) === cmId
                  ),
              ),
            );
          }
        }
      } catch {}
    },
    [showStarredOnly],
  );

  const displayResults = showStarredOnly ? starredResults : results;
  const displayLoading = showStarredOnly ? starredLoading : loading;

  const { filteredResults, hiddenCounts } = useMemo(() => {
    let filtered = displayResults;
    const counts = {
      recording: 0,
      zeroDuration: 0,
      transfer: 0,
      conference: 0,
      noPhone: 0,
    };
    for (const r of displayResults) {
      if (isRecordingLeg(r)) counts.recording++;
      if (
        r.duration === "00:00:00" ||
        r.duration === "0" ||
        Number(r.duration) === 0
      )
        counts.zeroDuration++;
      if (isTransfer(r)) counts.transfer++;
      if (isConference(r)) counts.conference++;
      if (!hasPhoneDevice(r)) counts.noPhone++;
    }
    if (hideRecording) filtered = filtered.filter((r) => !isRecordingLeg(r));
    if (hideZeroDuration)
      filtered = filtered.filter(
        (r) =>
          r.duration !== "00:00:00" &&
          r.duration !== "0" &&
          Number(r.duration) !== 0,
      );
    if (hideTransfer) filtered = filtered.filter((r) => !isTransfer(r));
    if (hideConference) filtered = filtered.filter((r) => !isConference(r));
    if (phonesOnly) filtered = filtered.filter((r) => hasPhoneDevice(r));
    return { filteredResults: filtered, hiddenCounts: counts };
  }, [
    displayResults,
    hideRecording,
    hideZeroDuration,
    hideTransfer,
    hideConference,
    phonesOnly,
  ]);

  const handleSearch = useCallback(
    (query: string) => {
      setShowStarredOnly(false);
      setSearchParams({ q: query, t: timeRange }, { replace: true });
      const params = { number: query, last: timeRange, limit: String(limit) };
      lastSearchRef.current = params;
      search(params);
    },
    [search, timeRange, limit, setSearchParams],
  );

  const handleAdvancedSearch = useCallback(
    (params: AdvancedSearchParams) => {
      setShowStarredOnly(false);
      const clean: Record<string, string> = {};
      for (const [k, v] of Object.entries(params)) {
        if (v) clean[k] = v;
      }
      lastSearchRef.current = clean;
      search(clean);
    },
    [search],
  );

  // Load recent calls on mount (or re-run search when returning via back button)
  useEffect(() => {
    const params: Record<string, string> = {
      last: initialQuery ? initialTimeRange : timeRange,
      limit: String(limit),
    };
    if (initialQuery) params.number = initialQuery;
    lastSearchRef.current = params;
    search(params);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || !lastSearchRef.current) return;
    const id = setInterval(() => {
      if (lastSearchRef.current) search(lastSearchRef.current);
    }, REFRESH_INTERVAL);
    return () => clearInterval(id);
  }, [autoRefresh, search]);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <SearchBar
          onSearch={handleSearch}
          loading={loading}
          initialValue={initialQuery}
        />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TimeRange selected={timeRange} onSelect={setTimeRange} />
            <Button
              variant={showStarredOnly ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setShowStarredOnly(!showStarredOnly)}
            >
              {showStarredOnly ? "★ Starred" : "☆ Starred"}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={autoRefresh ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              disabled={!lastSearchRef.current}
            >
              {autoRefresh ? "Auto-refresh on (30s)" : "Auto-refresh"}
            </Button>
          </div>
        </div>
        {!showStarredOnly && (
          <AdvancedSearch onSearch={handleAdvancedSearch} loading={loading} />
        )}
      </div>
      {error && (
        <div className="rounded-lg bg-destructive/10 p-4 text-destructive text-sm">
          {error}
        </div>
      )}
      {displayResults.length > 0 && (
        <div className="space-y-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <p className="text-sm text-muted-foreground">
                  Showing {filteredResults.length} of{" "}
                  {showStarredOnly ? starredResults.length : count} results
                  {showStarredOnly && " (starred)"}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => {
                    const cols = [
                      "callingpartynumber",
                      "finalcalledpartynumber",
                      "originalcalledpartynumber",
                      "origdevicename",
                      "destdevicename",
                      "orig_device_description",
                      "dest_device_description",
                      "datetimeorigination",
                      "datetimeconnect",
                      "datetimedisconnect",
                      "duration",
                      "destcause_value",
                      "destcause_description",
                      "globalcallid_callid",
                      "globalcallid_callmanagerid",
                      "globalcallid_clusterid",
                    ];
                    const header = cols.join(",");
                    const rows = filteredResults.map((r) =>
                      cols
                        .map(
                          (c) => `"${String(r[c] ?? "").replace(/"/g, '""')}"`,
                        )
                        .join(","),
                    );
                    const blob = new Blob([`${header}\n${rows.join("\n")}`], {
                      type: "text/csv",
                    });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `cdr-export-${Date.now()}.csv`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  Export CSV
                </Button>
              </div>
              <div className="relative flex items-center gap-1">
                {(hideRecording ||
                  hideZeroDuration ||
                  hideTransfer ||
                  hideConference ||
                  phonesOnly) && (
                  <button
                    onClick={() => {
                      setHideRecording(false);
                      setHideZeroDuration(false);
                      setHideTransfer(false);
                      setHideConference(false);
                      setPhonesOnly(false);
                    }}
                    className="text-muted-foreground hover:text-foreground text-xs"
                    title="Clear all filters"
                  >
                    ✕
                  </button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => setFiltersOpen(!filtersOpen)}
                >
                  Filters
                  {(hideRecording ||
                    hideZeroDuration ||
                    hideTransfer ||
                    hideConference ||
                    phonesOnly) && (
                    <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] w-4 h-4">
                      {
                        [
                          hideRecording,
                          hideZeroDuration,
                          hideTransfer,
                          hideConference,
                          phonesOnly,
                        ].filter(Boolean).length
                      }
                    </span>
                  )}
                </Button>
                {filtersOpen && (
                  <div className="absolute right-0 top-8 z-50 rounded-lg border border-border bg-popover p-3 shadow-lg space-y-2.5 w-64">
                    <label className="flex items-center justify-between cursor-pointer text-xs">
                      <span>Hide recording ({hiddenCounts.recording})</span>
                      <Switch
                        checked={hideRecording}
                        onCheckedChange={setHideRecording}
                      />
                    </label>
                    <label className="flex items-center justify-between cursor-pointer text-xs">
                      <span>Hide 0s calls ({hiddenCounts.zeroDuration})</span>
                      <Switch
                        checked={hideZeroDuration}
                        onCheckedChange={setHideZeroDuration}
                      />
                    </label>
                    <label className="flex items-center justify-between cursor-pointer text-xs">
                      <span>Hide transfers ({hiddenCounts.transfer})</span>
                      <Switch
                        checked={hideTransfer}
                        onCheckedChange={setHideTransfer}
                      />
                    </label>
                    <label className="flex items-center justify-between cursor-pointer text-xs">
                      <span>Hide conferences ({hiddenCounts.conference})</span>
                      <Switch
                        checked={hideConference}
                        onCheckedChange={setHideConference}
                      />
                    </label>
                    <label className="flex items-center justify-between cursor-pointer text-xs">
                      <span>Phones only</span>
                      <Switch
                        checked={phonesOnly}
                        onCheckedChange={setPhonesOnly}
                      />
                    </label>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="space-y-2">
            {filteredResults.map((r) => (
              <ResultRow
                key={
                  r.pkid ||
                  `${r.globalcallid_callid}:${r.globalcallid_callmanagerid}`
                }
                result={r}
                starred={
                  !!starredMap[
                    `${r.globalcallid_callid}:${r.globalcallid_callmanagerid}`
                  ]
                }
                onToggleStar={handleToggleStar}
              />
            ))}
          </div>
          {!showStarredOnly && results.length >= limit && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setLimit((l) => l + 100)}
            >
              Load more
            </Button>
          )}
        </div>
      )}
      {!displayLoading && displayResults.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          {showStarredOnly
            ? "No starred calls yet. Star a call from the detail page or search results."
            : "No calls found in the selected time range."}
        </div>
      )}
    </div>
  );
}
