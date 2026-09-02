import { useState, useCallback, useEffect } from "react";
import {
  getSavedQueries,
  createSavedQuery,
  updateSavedQuery,
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
    return createSavedQuery(name, query).then((res) => {
      setQueries((prev) => [...prev, res.query]);
      setError(null);
      return res.query;
    });
  }, []);

  const update = useCallback((id: string, query: string) => {
    return updateSavedQuery(id, { query }).then((res) => {
      setQueries((prev) =>
        prev.map((q) => (q.id === id ? res.query : q)),
      );
      setError(null);
      return res.query;
    });
  }, []);

  const remove = useCallback((id: string) => {
    return deleteSavedQuery(id).then(() => {
      setQueries((prev) => prev.filter((q) => q.id !== id));
      setError(null);
    });
  }, []);

  return { queries, loading, error, save, update, remove, setError };
}
