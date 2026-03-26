import { useState, useCallback } from "react";
import { SearchBar } from "@/components/search/SearchBar";
import { TimeRange } from "@/components/search/TimeRange";
import { ResultRow } from "@/components/search/ResultRow";
import { useSearch } from "@/hooks/useSearch";
import { Button } from "@/components/ui/button";

export function SearchPage() {
  const [timeRange, setTimeRange] = useState("24h");
  const [limit, setLimit] = useState(100);
  const { results, count, loading, error, search } = useSearch();

  const handleSearch = useCallback(
    (query: string) => {
      search({
        number: query,
        last: timeRange,
        limit: String(limit),
      });
    },
    [search, timeRange, limit],
  );

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <SearchBar onSearch={handleSearch} loading={loading} />
        <TimeRange selected={timeRange} onSelect={setTimeRange} />
      </div>
      {error && (
        <div className="rounded-lg bg-destructive/10 p-4 text-destructive text-sm">
          {error}
        </div>
      )}
      {results.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Showing {results.length} of {count} results
          </p>
          <div className="space-y-2">
            {results.map((r) => (
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
      {!loading && results.length === 0 && count === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          Search for a phone number, device name, or user ID to get started.
        </div>
      )}
    </div>
  );
}
