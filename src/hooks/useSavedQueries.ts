import { useState, useCallback, useEffect } from "react";
import {
  getSavedQueries,
  createSavedQuery,
  deleteSavedQuery,
  type SavedQueryRecord,
} from "@/api/client";

export type SavedQuery = SavedQueryRecord;

export function useSavedQueries() {
  const [queries, setQueries] = useState<SavedQuery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getSavedQueries()
      .then((res) => {
        if (cancelled) return;
        setQueries(res.queries);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const save = useCallback((name: string, query: string) => {
    createSavedQuery(name, query)
      .then((res) => {
        setQueries((prev) => [...prev, res.query]);
        setError(null);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : String(err)),
      );
  }, []);

  const remove = useCallback((id: string) => {
    deleteSavedQuery(id)
      .then(() => {
        setQueries((prev) => prev.filter((q) => q.id !== id));
        setError(null);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : String(err)),
      );
  }, []);

  return { queries, loading, error, save, remove };
}
