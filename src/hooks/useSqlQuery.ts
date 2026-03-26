import { useState, useCallback } from "react";
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

  const execute = useCallback(async (query: string) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await executeSql(query);
      setState({
        columns: data.columns,
        rows: data.rows,
        count: data.count,
        durationMs: data.duration_ms,
        loading: false,
        error: null,
      });
    } catch (err: any) {
      setState((s) => ({
        ...s,
        loading: false,
        error: err.message || "Query failed",
      }));
    }
  }, []);

  const clear = useCallback(() => {
    setState({
      columns: [],
      rows: [],
      count: 0,
      durationMs: 0,
      loading: false,
      error: null,
    });
  }, []);

  return { ...state, execute, clear };
}
