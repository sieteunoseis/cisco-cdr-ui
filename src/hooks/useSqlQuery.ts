import { useState, useCallback, useRef } from "react";
import { executeSql } from "@/api/client";

interface SqlQueryState {
  columns: string[];
  rows: any[];
  count: number;
  durationMs: number;
  loading: boolean;
  error: string | null;
}

export function useSqlQuery() {
  const [state, setState] = useState<SqlQueryState>({
    columns: [],
    rows: [],
    count: 0,
    durationMs: 0,
    loading: false,
    error: null,
  });
  const controllerRef = useRef<AbortController | null>(null);

  const execute = useCallback(async (query: string) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await executeSql(query, controller.signal);
      setState({
        columns: data.columns,
        rows: data.rows,
        count: data.count,
        durationMs: data.duration_ms,
        loading: false,
        error: null,
      });
    } catch (err: any) {
      // A user-initiated cancel rejects with AbortError — leave whatever
      // results were already showing in place rather than surfacing it as
      // a failure, and don't stomp on a newer run's loading state if one
      // was already kicked off before this rejection settled.
      if (err?.name === "AbortError") {
        setState((s) =>
          controllerRef.current === controller ? { ...s, loading: false } : s,
        );
        return;
      }
      setState((s) => ({
        ...s,
        loading: false,
        error: err.message || "Query failed",
      }));
    }
  }, []);

  const cancel = useCallback(() => {
    controllerRef.current?.abort();
  }, []);

  const clear = useCallback(() => {
    controllerRef.current?.abort();
    setState({
      columns: [],
      rows: [],
      count: 0,
      durationMs: 0,
      loading: false,
      error: null,
    });
  }, []);

  return { ...state, execute, cancel, clear };
}
