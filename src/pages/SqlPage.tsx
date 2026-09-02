import { useState, useCallback, useRef } from "react";
import { SqlEditor } from "@/components/sql/SqlEditor";
import { SqlResults } from "@/components/sql/SqlResults";
import { SqlVariables } from "@/components/sql/SqlVariables";
import { SavedQueries } from "@/components/sql/SavedQueries";
import { useSqlQuery } from "@/hooks/useSqlQuery";
import { useSavedQueries } from "@/hooks/useSavedQueries";

export function SqlPage() {
  const [query, setQuery] = useState("");
  const resolvedRef = useRef(query);
  const { columns, rows, count, durationMs, loading, error, execute } =
    useSqlQuery();
  const { queries, error: savedQueriesError, save, remove } =
    useSavedQueries();

  const handleResolvedQuery = useCallback((resolved: string) => {
    resolvedRef.current = resolved;
  }, []);

  const handleRun = useCallback(() => {
    const q = resolvedRef.current || query;
    if (q.trim()) execute(q);
  }, [query, execute]);

  const handleSave = useCallback(() => {
    const name = prompt("Query name:");
    if (name) save(name, query);
  }, [query, save]);

  return (
    <div className="flex gap-6">
      <div className="w-56 shrink-0">
        {savedQueriesError && (
          <p className="text-xs text-destructive mb-2">
            {savedQueriesError}
          </p>
        )}
        <SavedQueries queries={queries} onSelect={setQuery} onDelete={remove} />
      </div>
      <div className="flex-1 min-w-0 space-y-4">
        <SqlEditor
          value={query}
          onChange={setQuery}
          onRun={handleRun}
          onSave={handleSave}
          loading={loading}
        />
        <SqlVariables query={query} onResolvedQuery={handleResolvedQuery} />
        <SqlResults
          columns={columns}
          rows={rows}
          count={count}
          durationMs={durationMs}
          error={error}
        />
      </div>
    </div>
  );
}
