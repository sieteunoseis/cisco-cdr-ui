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

interface SearchState {
  results: CdrResult[];
  count: number;
  loading: boolean;
  error: string | null;
}

export function useSearch() {
  const [state, setState] = useState<SearchState>({
    results: [],
    count: 0,
    loading: false,
    error: null,
  });

  const requestIdRef = useRef(0);

  const search = useCallback(async (params: Record<string, string>) => {
    const requestId = ++requestIdRef.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await searchCdr(params);
      if (requestId !== requestIdRef.current) return; // superseded by a newer search
      setState({
        results: data.results,
        count: data.count,
        loading: false,
        error: null,
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

  return { ...state, search };
}
