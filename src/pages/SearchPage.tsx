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
import { useLabelRules } from "@/hooks/useLabelRules";
import { matchLabelRules } from "@/lib/labelRules";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  checkStarred,
  starCall,
  unstarCall,
  getStarred,
  checkSpam,
} from "@/api/client";
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
  const [hideTagIds, setHideTagIds] = useState<string[]>(
    savedFilters.hideTagIds ?? [],
  );
  const [tagsFilterOpen, setTagsFilterOpen] = useState(false);
  const [showStarredOnly, setShowStarredOnly] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const toggleHideTag = (ruleId: string) => {
    setHideTagIds((prev) =>
      prev.includes(ruleId)
        ? prev.filter((id) => id !== ruleId)
        : [...prev, ruleId],
    );
  };

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
        hideTagIds,
      }),
    );
  }, [
    hideRecording,
    hideZeroDuration,
    hideTransfer,
    hideConference,
    phonesOnly,
    hideTagIds,
  ]);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const lastSearchRef = useRef<Record<string, string> | null>(null);
  const { results, count, loading, error, search } = useSearch();
  const { rules, add } = useLabelRules();
  const enabledRules = useMemo(() => rules.filter((r) => r.enabled), [rules]);

  // Prune hideTagIds of ids for rules that no longer exist (deleted, not just disabled).
  useEffect(() => {
    const validIds = new Set(rules.map((r) => r.id));
    setHideTagIds((prev) => prev.filter((id) => validIds.has(id)));
  }, [rules]);

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

  const [spamCheckMessage, setSpamCheckMessage] = useState<string | null>(
    null,
  );

  const handleCheckSpam = useCallback(
    async (number: string) => {
      setSpamCheckMessage(`Checking ${number}…`);
      try {
        const { isSpam } = await checkSpam(number);
        if (isSpam) {
          await add({
            label: "Spam",
            color: "red",
            fields: ["calling"],
            pattern: `^${number}$`,
            enabled: true,
          });
          setSpamCheckMessage(`${number} flagged as spam.`);
        } else {
          setSpamCheckMessage(`${number} is not flagged as spam.`);
        }
      } catch (err) {
        setSpamCheckMessage(
          err instanceof Error ? err.message : "Spam check failed.",
        );
      }
    },
    [add],
  );

  const displayResults = showStarredOnly ? starredResults : results;
  const displayLoading = showStarredOnly ? starredLoading : loading;

  const { filteredResults, hiddenCounts, tagCounts } = useMemo(() => {
    let filtered = displayResults;
    const counts = {
      recording: 0,
      zeroDuration: 0,
      transfer: 0,
      conference: 0,
      noPhone: 0,
    };
    const tags: Record<string, number> = {};
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
      for (const rule of matchLabelRules(r, enabledRules)) {
        tags[rule.id] = (tags[rule.id] ?? 0) + 1;
      }
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
    if (hideTagIds.length > 0)
      filtered = filtered.filter(
        (r) =>
          !matchLabelRules(r, enabledRules).some((rule) =>
            hideTagIds.includes(rule.id),
          ),
      );
    return { filteredResults: filtered, hiddenCounts: counts, tagCounts: tags };
  }, [
    displayResults,
    hideRecording,
    hideZeroDuration,
    hideTransfer,
    hideConference,
    phonesOnly,
    hideTagIds,
    enabledRules,
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

  const handleLoadMore = useCallback(() => {
    const newLimit = limit + 100;
    setLimit(newLimit);
    const params = { ...(lastSearchRef.current ?? {}), limit: String(newLimit) };
    lastSearchRef.current = params;
    search(params);
  }, [limit, search]);

  // Load calls on mount and when time range changes
  useEffect(() => {
    if (showStarredOnly) return;
    const params: Record<string, string> = {
      last: timeRange,
      limit: String(limit),
    };
    if (initialQuery) params.number = initialQuery;
    lastSearchRef.current = params;
    search(params);
  }, [timeRange]); // eslint-disable-line react-hooks/exhaustive-deps

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
          <AdvancedSearch
            onSearch={handleAdvancedSearch}
            loading={loading}
            defaultLast={timeRange}
          />
        )}
      </div>
      {error && (
        <div className="rounded-lg bg-destructive/10 p-4 text-destructive text-sm">
          {error}
        </div>
      )}
      {spamCheckMessage && (
        <div className="rounded-lg bg-muted p-3 text-sm flex items-center justify-between">
          {spamCheckMessage}
          <button
            onClick={() => setSpamCheckMessage(null)}
            className="text-muted-foreground hover:text-foreground ml-3"
          >
            ✕
          </button>
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
                  phonesOnly ||
                  hideTagIds.length > 0) && (
                  <button
                    onClick={() => {
                      setHideRecording(false);
                      setHideZeroDuration(false);
                      setHideTransfer(false);
                      setHideConference(false);
                      setPhonesOnly(false);
                      setHideTagIds([]);
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
                    phonesOnly ||
                    hideTagIds.length > 0) && (
                    <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] w-4 h-4">
                      {
                        [
                          hideRecording,
                          hideZeroDuration,
                          hideTransfer,
                          hideConference,
                          phonesOnly,
                          hideTagIds.length > 0,
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
                    <div className="border-t border-border pt-2 space-y-1">
                      <button
                        type="button"
                        onClick={() => setTagsFilterOpen((v) => !v)}
                        className="w-full flex items-center justify-between text-xs"
                      >
                        <span>
                          Hide tags
                          {hideTagIds.length > 0 && ` (${hideTagIds.length})`}
                        </span>
                        <span>{tagsFilterOpen ? "▴" : "▾"}</span>
                      </button>
                      {tagsFilterOpen && (
                        <div className="pl-2 space-y-1 max-h-32 overflow-y-auto">
                          {enabledRules.length === 0 && (
                            <p className="text-xs text-muted-foreground">
                              No custom rules defined.
                            </p>
                          )}
                          {enabledRules.map((rule) => (
                            <label
                              key={rule.id}
                              className="flex items-center gap-2 text-xs cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={hideTagIds.includes(rule.id)}
                                onChange={() => toggleHideTag(rule.id)}
                              />
                              {rule.label} ({tagCounts[rule.id] ?? 0})
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
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
                onCheckSpam={handleCheckSpam}
                rules={enabledRules}
              />
            ))}
          </div>
          {!showStarredOnly && limit > 100 && results.length < limit && (
            <p className="text-center text-sm text-muted-foreground py-2">
              No more results.
            </p>
          )}
          {!showStarredOnly && results.length >= limit && (
            <Button
              variant="outline"
              className="w-full"
              onClick={handleLoadMore}
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
