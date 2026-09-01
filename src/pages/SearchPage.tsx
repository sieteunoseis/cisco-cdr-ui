import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import { X } from "lucide-react";
import { SearchBar } from "@/components/search/SearchBar";
import { TimeRange } from "@/components/search/TimeRange";
import {
  AdvancedSearch,
  type AdvancedSearchParams,
} from "@/components/search/AdvancedSearch";
import { ResultRow, isTransfer, isConference } from "@/components/search/ResultRow";
import { useSearch } from "@/hooks/useSearch";
import { useLabelRules } from "@/hooks/useLabelRules";
import { matchLabelRules } from "@/lib/labelRules";
import { Button } from "@/components/ui/button";
import {
  checkStarred,
  starCall,
  unstarCall,
  getStarred,
  checkSpam,
  getSpamChecked,
  type CachedSpamCheck,
} from "@/api/client";
import { isCheckableNumber } from "@/lib/spam";
import type { CdrResult } from "@/hooks/useSearch";

const REFRESH_INTERVAL = 30000;

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  // The nav bar's "Search" link points at this same route ("/"), so
  // clicking it while already here doesn't remount the component — only
  // location.key changes (it's unique per navigation, even to the same
  // path). Used below to force a reset instead of requiring a page reload.
  const location = useLocation();
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
  // Nothing selected = show every call. Selecting a chip (quick filter or
  // label) narrows to calls matching at least one selected chip — select
  // more to broaden the set, not narrow it further. Quick filters use
  // fixed synthetic ids ("zero", "transfer", "conference"); everything
  // else is a real label id — Recording/Phone Device used to be quick
  // filters too but are ordinary labels now. Old saved shape (separate
  // hide/show-only booleans) isn't migrated — the semantics changed, so a
  // stale "hide recording" flag would invert into "show only recording"
  // if carried over.
  const [selectedFilterIds, setSelectedFilterIds] = useState<string[]>(
    Array.isArray(savedFilters.selectedFilterIds)
      ? savedFilters.selectedFilterIds
      : [],
  );
  const [tagsFilterOpen, setTagsFilterOpen] = useState(false);
  const [showStarredOnly, setShowStarredOnly] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const toggleFilter = (id: string) => {
    setSelectedFilterIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  // Persist filter state to sessionStorage
  useEffect(() => {
    sessionStorage.setItem(
      "cdr-filters",
      JSON.stringify({ selectedFilterIds }),
    );
  }, [selectedFilterIds]);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const lastSearchRef = useRef<Record<string, string> | null>(null);
  const { results, count, loading, error, search } = useSearch();
  const { rules, add } = useLabelRules();
  const enabledRules = useMemo(() => rules.filter((r) => r.enabled), [rules]);

  // Prune selectedFilterIds of label ids for rules that no longer exist
  // (deleted, not just disabled) — leaves the fixed quick-filter ids alone.
  useEffect(() => {
    const validIds = new Set(rules.map((r) => r.id));
    const quickFilterIds = new Set(["zero", "transfer", "conference"]);
    setSelectedFilterIds((prev) =>
      prev.filter((id) => quickFilterIds.has(id) || validIds.has(id)),
    );
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

  // Batch-fetch already-checked spam status so ResultRow can hide the
  // "Check Spam" button (and show a verified icon) instead of re-checking
  // — each check burns a Twilio add-on credit.
  const [spamCheckedMap, setSpamCheckedMap] = useState<
    Record<string, CachedSpamCheck>
  >({});

  useEffect(() => {
    const numbers = [
      ...new Set(
        results
          .map((r) => r.callingpartynumber || "")
          .filter(isCheckableNumber),
      ),
    ];
    if (numbers.length === 0) return;
    getSpamChecked(numbers)
      .then((data) => setSpamCheckedMap((prev) => ({ ...prev, ...data.results })))
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
        const result = await checkSpam(number);
        setSpamCheckedMap((prev) => ({
          ...prev,
          [number]: { ...result, checkedAt: new Date().toISOString() },
        }));
        if (result.isSpam) {
          await add({
            label: "Spam",
            color: "red",
            fields: ["calling"],
            pattern: `^${number}$`,
            enabled: true,
            external: true,
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
      zeroDuration: 0,
      transfer: 0,
      conference: 0,
    };
    const tags: Record<string, number> = {};
    for (const r of displayResults) {
      if (
        r.duration === "00:00:00" ||
        r.duration === "0" ||
        Number(r.duration) === 0
      )
        counts.zeroDuration++;
      if (isTransfer(r)) counts.transfer++;
      if (isConference(r)) counts.conference++;
      for (const rule of matchLabelRules(r, enabledRules)) {
        tags[rule.id] = (tags[rule.id] ?? 0) + 1;
      }
    }
    // Nothing selected = show everything. Any selection narrows to calls
    // matching at least one selected chip (quick filter or label) — select
    // more chips to broaden the set, not narrow it further. Recording and
    // Phone Device used to be hardcoded checks here — they're ordinary
    // labels now, so they're covered by the matchLabelRules check below.
    if (selectedFilterIds.length > 0) {
      filtered = filtered.filter((r) => {
        if (
          selectedFilterIds.includes("zero") &&
          (r.duration === "00:00:00" ||
            r.duration === "0" ||
            Number(r.duration) === 0)
        )
          return true;
        if (selectedFilterIds.includes("transfer") && isTransfer(r))
          return true;
        if (selectedFilterIds.includes("conference") && isConference(r))
          return true;
        return matchLabelRules(r, enabledRules).some((rule) =>
          selectedFilterIds.includes(rule.id),
        );
      });
    }
    return { filteredResults: filtered, hiddenCounts: counts, tagCounts: tags };
  }, [displayResults, selectedFilterIds, enabledRules]);

  const handleSearch = useCallback(
    (query: string) => {
      setShowStarredOnly(false);
      const urlParams: Record<string, string> = { t: timeRange };
      if (query) urlParams.q = query;
      setSearchParams(urlParams, { replace: true });
      const params: Record<string, string> = {
        last: timeRange,
        limit: String(limit),
      };
      if (query) params.number = query;
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

  // Reset paging back to the default whenever the nav bar's "Search" link
  // is clicked (a fresh navigation to this route, even without a path
  // change, bumps location.key).
  useEffect(() => {
    setLimit(100);
  }, [location.key]);

  // Load calls on mount, when time range changes, and on a fresh
  // navigation back to this route (location.key) — covers the nav bar's
  // "Search" link no longer being a no-op when a search is already active.
  useEffect(() => {
    if (showStarredOnly) return;
    const params: Record<string, string> = {
      last: timeRange,
      limit: String(limit),
    };
    if (initialQuery) params.number = initialQuery;
    lastSearchRef.current = params;
    search(params);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange, location.key]);

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
          key={location.key}
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
                {selectedFilterIds.length > 0 && (
                  <button
                    onClick={() => setSelectedFilterIds([])}
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
                  {selectedFilterIds.length > 0 && (
                    <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] w-4 h-4">
                      {selectedFilterIds.length}
                    </span>
                  )}
                </Button>
                {filtersOpen && (
                  <div className="absolute right-0 top-8 z-50 rounded-lg border border-border bg-popover p-3 shadow-lg space-y-2.5 w-64">
                    <p className="text-xs text-muted-foreground">
                      Showing all calls. Select chips below to narrow to
                      calls matching any of them.
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {(
                        [
                          { key: "zero", label: "0s calls", count: hiddenCounts.zeroDuration },
                          { key: "transfer", label: "Transfers", count: hiddenCounts.transfer },
                          { key: "conference", label: "Conferences", count: hiddenCounts.conference },
                        ] as const
                      ).map((f) => {
                        const active = selectedFilterIds.includes(f.key);
                        return (
                          <button
                            key={f.key}
                            type="button"
                            onClick={() => toggleFilter(f.key)}
                            title={f.label}
                            className={`inline-flex items-center gap-1 max-w-[9rem] px-1.5 py-0.5 rounded-full border text-xs ${
                              active
                                ? "bg-primary text-primary-foreground border-primary"
                                : "text-muted-foreground border-border hover:border-foreground"
                            }`}
                          >
                            {active && <X className="size-3 shrink-0" />}
                            <span className="truncate">
                              {f.label}
                              {f.count !== null && ` (${f.count})`}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="border-t border-border pt-2 space-y-1">
                      <button
                        type="button"
                        onClick={() => setTagsFilterOpen((v) => !v)}
                        className="w-full flex items-center justify-between text-xs"
                      >
                        <span>Labels</span>
                        <span>{tagsFilterOpen ? "▴" : "▾"}</span>
                      </button>
                      {tagsFilterOpen && (
                        <div className="pl-2 max-h-40 overflow-y-auto">
                          {enabledRules.length === 0 && (
                            <p className="text-xs text-muted-foreground">
                              No custom rules defined.
                            </p>
                          )}
                          <div className="flex flex-wrap gap-1">
                            {enabledRules.map((rule) => {
                              const active = selectedFilterIds.includes(
                                rule.id,
                              );
                              return (
                                <button
                                  key={rule.id}
                                  type="button"
                                  onClick={() => toggleFilter(rule.id)}
                                  title={rule.label}
                                  className={`inline-flex items-center gap-1 max-w-[9rem] px-1.5 py-0.5 rounded-full border text-xs ${
                                    active
                                      ? "bg-primary text-primary-foreground border-primary"
                                      : "text-muted-foreground border-border hover:border-foreground"
                                  }`}
                                >
                                  {active && <X className="size-3 shrink-0" />}
                                  <span className="truncate">
                                    {rule.label} ({tagCounts[rule.id] ?? 0})
                                  </span>
                                </button>
                              );
                            })}
                          </div>
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
                spamChecked={spamCheckedMap[r.callingpartynumber || ""]}
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
