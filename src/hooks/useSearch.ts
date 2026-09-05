import { useState, useCallback, useRef } from "react";
import { searchCdr } from "@/api/client";

export interface CdrResult {
  pkid: string;
  globalcallid_callid: string;
  globalcallid_callmanagerid: string;
  globalcallid_clusterid: string;
  callingpartynumber: string;
  finalcalledpartynumber: string;
  originalcalledpartynumber: string;
  origdevicename: string;
  destdevicename: string;
  datetimeorigination: string;
  datetimeconnect: string | null;
  datetimedisconnect: string;
  duration: string;
  origcause_value: number;
  origcause_description: string;
  destcause_value: number;
  destcause_description: string;
  orig_device_description: string | null;
  orig_device_user: string | null;
  orig_device_pool: string | null;
  orig_device_location: string | null;
  dest_device_description: string | null;
  dest_device_user: string | null;
  dest_device_pool: string | null;
  dest_device_location: string | null;
  orig_codec_description: string | null;
  enriched_at: string | null;
  [key: string]: any;
}

interface Cursor {
  beforeTime: string;
  beforePkid: string;
}

interface SearchState {
  results: CdrResult[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
}

export function useSearch() {
  const [state, setState] = useState<SearchState>({
    results: [],
    loading: false,
    loadingMore: false,
    error: null,
    hasMore: false,
  });

  const requestIdRef = useRef(0);
  // Mirrors the cursor outside React state so loadMore can read the
  // latest value synchronously without depending on `state` (keeping both
  // callbacks stable, matching the requestId-guard pattern below).
  const cursorRef = useRef<Cursor | null>(null);

  const search = useCallback(async (params: Record<string, string>) => {
    const requestId = ++requestIdRef.current;
    // Cleared synchronously (before the await) so a loadMore fired while
    // this fresh search is in flight sees no cursor and safely no-ops,
    // instead of appending a page from whatever query was active before.
    cursorRef.current = null;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await searchCdr(params);
      if (requestId !== requestIdRef.current) return; // superseded by a newer search
      cursorRef.current = data.nextCursor ?? null;
      setState({
        results: data.results,
        loading: false,
        loadingMore: false,
        error: null,
        hasMore: !!data.nextCursor,
      });
    } catch (err: any) {
      if (requestId !== requestIdRef.current) return;
      setState((s) => ({
        ...s,
        loading: false,
        error: err.message || "Search failed",
      }));
    }
  }, []);

  // Fetches the next page via the saved cursor and appends it — never
  // re-runs the whole query with a bigger limit, so an already-rendered
  // page can't get silently swapped out by a later, differently-ordered
  // response (see the backend's keyset-pagination comment).
  const loadMore = useCallback(async (params: Record<string, string>) => {
    const cursor = cursorRef.current;
    if (!cursor) return;
    const requestId = ++requestIdRef.current;
    setState((s) => ({ ...s, loadingMore: true, error: null }));
    try {
      const data = await searchCdr({ ...params, ...cursor });
      if (requestId !== requestIdRef.current) return;
      cursorRef.current = data.nextCursor ?? null;
      setState((s) => ({
        results: [...s.results, ...data.results],
        loading: false,
        loadingMore: false,
        error: null,
        hasMore: !!data.nextCursor,
      }));
    } catch (err: any) {
      if (requestId !== requestIdRef.current) return;
      setState((s) => ({
        ...s,
        loadingMore: false,
        error: err.message || "Load more failed",
      }));
    }
  }, []);

  return { ...state, search, loadMore };
}
