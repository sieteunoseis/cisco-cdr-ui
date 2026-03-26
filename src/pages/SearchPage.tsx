import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { SearchBar } from "@/components/search/SearchBar";
import { TimeRange } from "@/components/search/TimeRange";
import {
  AdvancedSearch,
  type AdvancedSearchParams,
} from "@/components/search/AdvancedSearch";
import { ResultRow, isRecordingLeg } from "@/components/search/ResultRow";
import { useSearch } from "@/hooks/useSearch";
import { Button } from "@/components/ui/button";

const REFRESH_INTERVAL = 30000;

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const initialTimeRange = searchParams.get("t") || "24h";

  const [timeRange, setTimeRange] = useState(initialTimeRange);
  const [limit, setLimit] = useState(100);
  const [hideRecording, setHideRecording] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const lastSearchRef = useRef<Record<string, string> | null>(null);
  const { results, count, loading, error, search } = useSearch();

  const filteredResults = useMemo(() => {
    if (!hideRecording) return results;
    return results.filter((r) => !isRecordingLeg(r));
  }, [results, hideRecording]);

  const recordingCount = useMemo(
    () => results.filter((r) => isRecordingLeg(r)).length,
    [results],
  );

  const handleSearch = useCallback(
    (query: string) => {
      setSearchParams({ q: query, t: timeRange }, { replace: true });
      const params = { number: query, last: timeRange, limit: String(limit) };
      lastSearchRef.current = params;
      search(params);
    },
    [search, timeRange, limit, setSearchParams],
  );

  const handleAdvancedSearch = useCallback(
    (params: AdvancedSearchParams) => {
      const clean: Record<string, string> = {};
      for (const [k, v] of Object.entries(params)) {
        if (v) clean[k] = v;
      }
      lastSearchRef.current = clean;
      search(clean);
    },
    [search],
  );

  // Re-run search when returning via back button
  useEffect(() => {
    if (initialQuery && results.length === 0 && !loading) {
      const params = {
        number: initialQuery,
        last: initialTimeRange,
        limit: String(limit),
      };
      lastSearchRef.current = params;
      search(params);
    }
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
          <TimeRange selected={timeRange} onSelect={setTimeRange} />
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
        <AdvancedSearch onSearch={handleAdvancedSearch} loading={loading} />
      </div>
      {error && (
        <div className="rounded-lg bg-destructive/10 p-4 text-destructive text-sm">
          {error}
        </div>
      )}
      {results.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {filteredResults.length} of {count} results
              {hideRecording && recordingCount > 0 && (
                <span className="ml-1">
                  ({recordingCount} recording legs hidden)
                </span>
              )}
            </p>
            {recordingCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setHideRecording(!hideRecording)}
              >
                {hideRecording ? "Show" : "Hide"} recording legs (
                {recordingCount})
              </Button>
            )}
          </div>
          <div className="space-y-2">
            {filteredResults.map((r) => (
              <ResultRow key={r.pkid} result={r} />
            ))}
          </div>
          {results.length >= limit && (
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
      {!loading && results.length === 0 && count === 0 && !initialQuery && (
        <div className="text-center py-12 text-muted-foreground">
          Search for a phone number, device name, or user ID to get started.
        </div>
      )}
    </div>
  );
}
