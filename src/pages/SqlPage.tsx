import { useState, useCallback } from "react";
import { SqlEditor } from "@/components/sql/SqlEditor";
import { SqlResults } from "@/components/sql/SqlResults";
import { SavedQueries } from "@/components/sql/SavedQueries";
import { useSqlQuery } from "@/hooks/useSqlQuery";
import { useSavedQueries } from "@/hooks/useSavedQueries";

export function SqlPage() {
  const [query, setQuery] = useState("");
  const { columns, rows, count, durationMs, loading, error, execute } =
    useSqlQuery();
  const { queries, save, remove } = useSavedQueries();

  const handleRun = useCallback(() => {
    if (query.trim()) execute(query);
  }, [query, execute]);

  const handleSave = useCallback(() => {
    const name = prompt("Query name:");
    if (name) save(name, query);
  }, [query, save]);

  return (
    <div className="flex gap-6">
      <div className="w-56 shrink-0">
        <SavedQueries queries={queries} onSelect={setQuery} onDelete={remove} />
      </div>
      <div className="flex-1 space-y-4">
        <SqlEditor
          value={query}
          onChange={setQuery}
          onRun={handleRun}
          onSave={handleSave}
          loading={loading}
        />
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
