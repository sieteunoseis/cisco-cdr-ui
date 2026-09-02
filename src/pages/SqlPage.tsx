import { useState, useCallback, useRef } from "react";
import { SqlEditor } from "@/components/sql/SqlEditor";
import { SqlResults } from "@/components/sql/SqlResults";
import { SqlVariables } from "@/components/sql/SqlVariables";
import { SavedQueries } from "@/components/sql/SavedQueries";
import { useSqlQuery } from "@/hooks/useSqlQuery";
import { useSavedQueries } from "@/hooks/useSavedQueries";
import type { SavedQuery } from "@/hooks/useSavedQueries";

export function SqlPage() {
  const [query, setQuery] = useState("");
  const [loadedQueryId, setLoadedQueryId] = useState<string | null>(null);
  const resolvedRef = useRef(query);
  const { columns, rows, count, durationMs, loading, error, execute, cancel } =
    useSqlQuery();
  const {
    queries,
    error: savedQueriesError,
    save,
    update,
    remove,
    setError: setSavedQueriesError,
  } = useSavedQueries();

  const loadedQuery = queries.find((q) => q.id === loadedQueryId) ?? null;

  const handleResolvedQuery = useCallback((resolved: string) => {
    resolvedRef.current = resolved;
  }, []);

  const handleRun = useCallback(() => {
    const q = resolvedRef.current || query;
    if (q.trim()) execute(q);
  }, [query, execute]);

  const handleSelect = useCallback((q: SavedQuery) => {
    setQuery(q.query);
    setLoadedQueryId(q.id);
  }, []);

  const handleClear = useCallback(() => {
    setQuery("");
    setLoadedQueryId(null);
  }, []);

  const handleSave = useCallback(() => {
    const name = prompt("Query name:");
    if (!name) return;
    save(name, query)
      .then((created) => setLoadedQueryId(created.id))
      .catch((err) =>
        setSavedQueriesError(err instanceof Error ? err.message : String(err)),
      );
  }, [query, save, setSavedQueriesError]);

  const handleUpdate = useCallback(() => {
    if (!loadedQueryId) return;
    update(loadedQueryId, query).catch((err) =>
      setSavedQueriesError(err instanceof Error ? err.message : String(err)),
    );
  }, [loadedQueryId, query, update, setSavedQueriesError]);

  const handleDelete = useCallback(
    (id: string) => {
      remove(id)
        .then(() => {
          if (id === loadedQueryId) setLoadedQueryId(null);
        })
        .catch((err) =>
          setSavedQueriesError(
            err instanceof Error ? err.message : String(err),
          ),
        );
    },
    [remove, loadedQueryId, setSavedQueriesError],
  );

  return (
    <div className="flex gap-6">
      <div className="w-56 shrink-0">
        {savedQueriesError && (
          <p className="text-xs text-destructive mb-2">
            {savedQueriesError}
          </p>
        )}
        <SavedQueries
          queries={queries}
          selectedId={loadedQueryId}
          onSelect={handleSelect}
          onDelete={handleDelete}
        />
      </div>
      <div className="flex-1 min-w-0 space-y-4">
        <SqlEditor
          value={query}
          onChange={setQuery}
          onRun={handleRun}
          onCancel={cancel}
          onSave={handleSave}
          onUpdate={loadedQuery ? handleUpdate : undefined}
          onClear={handleClear}
          loadedQueryName={loadedQuery?.name}
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
