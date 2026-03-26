import { useState, useCallback } from "react";

export interface SavedQuery {
  id: string;
  name: string;
  query: string;
  createdAt: string;
}

const STORAGE_KEY = "cdr-saved-queries";

const DEFAULT_QUERIES: SavedQuery[] = [
  {
    id: "default-1",
    name: "Calls by hour (last 24h)",
    query:
      "SELECT date_trunc('hour', datetimeorigination) AS hour, count(*)\nFROM cdr_basic\nWHERE datetimeorigination > now() - interval '24 hours'\nGROUP BY hour\nORDER BY hour",
    createdAt: new Date().toISOString(),
  },
  {
    id: "default-2",
    name: "Top callers today",
    query:
      "SELECT callingpartynumber, count(*) AS calls\nFROM cdr_basic\nWHERE datetimeorigination > now() - interval '24 hours'\nGROUP BY callingpartynumber\nORDER BY calls DESC\nLIMIT 20",
    createdAt: new Date().toISOString(),
  },
  {
    id: "default-3",
    name: "Failed calls today",
    query:
      "SELECT origdevicename, destdevicename, callingpartynumber, finalcalledpartynumber, destcause\nFROM cdr_augmented\nWHERE destcause != 'Normal call clearing'\n  AND datetimeorigination > now() - interval '24 hours'",
    createdAt: new Date().toISOString(),
  },
  {
    id: "default-4",
    name: "Enriched devices",
    query:
      "SELECT origdevicename, orig_device_description, orig_device_pool, orig_device_location\nFROM cdr_basic\nWHERE enriched_at IS NOT NULL\n  AND orig_device_description != ''\nLIMIT 50",
    createdAt: new Date().toISOString(),
  },
];

function loadQueries(): SavedQuery[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_QUERIES));
  return DEFAULT_QUERIES;
}

export function useSavedQueries() {
  const [queries, setQueries] = useState<SavedQuery[]>(loadQueries);

  const save = useCallback((name: string, query: string) => {
    const newQuery: SavedQuery = {
      id: crypto.randomUUID(),
      name,
      query,
      createdAt: new Date().toISOString(),
    };
    setQueries((prev) => {
      const updated = [newQuery, ...prev];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const remove = useCallback((id: string) => {
    setQueries((prev) => {
      const updated = prev.filter((q) => q.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const rename = useCallback((id: string, newName: string) => {
    setQueries((prev) => {
      const updated = prev.map((q) =>
        q.id === id ? { ...q, name: newName } : q,
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  return { queries, save, remove, rename };
}
