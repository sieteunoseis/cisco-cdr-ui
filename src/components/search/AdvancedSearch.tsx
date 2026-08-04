import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface AdvancedSearchParams {
  calling?: string;
  called?: string;
  device?: string;
  cause?: string;
  start?: string;
  end?: string;
  last?: string;
  limit?: string;
}

interface AdvancedSearchProps {
  onSearch: (params: AdvancedSearchParams) => void;
  loading?: boolean;
  defaultLast?: string;
}

export function AdvancedSearch({
  onSearch,
  loading,
  defaultLast = "24h",
}: AdvancedSearchProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [open, setOpen] = useState(() => {
    // Auto-open if URL has advanced params
    return !!(
      searchParams.get("calling") ||
      searchParams.get("called") ||
      searchParams.get("device") ||
      searchParams.get("cause") ||
      searchParams.get("start") ||
      searchParams.get("end")
    );
  });
  const [calling, setCalling] = useState(searchParams.get("calling") || "");
  const [called, setCalled] = useState(searchParams.get("called") || "");
  const [device, setDevice] = useState(searchParams.get("device") || "");
  const [cause, setCause] = useState(searchParams.get("cause") || "");
  const [copied, setCopied] = useState(false);

  const toLocalDatetime = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const [start, setStart] = useState(() => {
    const sp = searchParams.get("start");
    return sp ? toLocalDatetime(new Date(sp)) : "";
  });
  const [end, setEnd] = useState(() => {
    const sp = searchParams.get("end");
    return sp ? toLocalDatetime(new Date(sp)) : "";
  });

  // Auto-search on mount if URL has advanced params
  useEffect(() => {
    if (
      open &&
      (searchParams.get("calling") ||
        searchParams.get("called") ||
        searchParams.get("device") ||
        searchParams.get("start"))
    ) {
      const params: AdvancedSearchParams = {};
      if (calling.trim()) params.calling = calling.trim();
      if (called.trim()) params.called = called.trim();
      if (device.trim()) params.device = device.trim();
      if (cause.trim()) params.cause = cause.trim();
      if (start) params.start = new Date(start).toISOString();
      if (end) params.end = new Date(end).toISOString();
      if (!start && !end) params.last = defaultLast;
      params.limit = "200";
      onSearch(params);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params: AdvancedSearchParams = {};
    if (calling.trim()) params.calling = calling.trim();
    if (called.trim()) params.called = called.trim();
    if (device.trim()) params.device = device.trim();
    if (cause.trim()) params.cause = cause.trim();
    if (start) params.start = new Date(start).toISOString();
    if (end) params.end = new Date(end).toISOString();
    if (!start && !end) params.last = defaultLast;
    params.limit = "200";

    // Sync to URL for sharing
    const urlParams: Record<string, string> = {};
    if (calling.trim()) urlParams.calling = calling.trim();
    if (called.trim()) urlParams.called = called.trim();
    if (device.trim()) urlParams.device = device.trim();
    if (cause.trim()) urlParams.cause = cause.trim();
    if (start) urlParams.start = new Date(start).toISOString();
    if (end) urlParams.end = new Date(end).toISOString();
    setSearchParams(urlParams, { replace: true });

    onSearch(params);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    setCalling("");
    setCalled("");
    setDevice("");
    setCause("");
    setStart("");
    setEnd("");
  };

  if (!open) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        Advanced Search
      </Button>
    );
  }

  return (
    <div className="rounded-lg border border-border p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Advanced Search</h3>
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Close
        </Button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Calling Number (from)
            </label>
            <Input
              placeholder=""
              value={calling}
              onChange={(e) => setCalling(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Called Number (to)
            </label>
            <Input
              placeholder=""
              value={called}
              onChange={(e) => setCalled(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Device Name
            </label>
            <Input
              placeholder="e.g. SEPxxxxxxxxxxxx"
              value={device}
              onChange={(e) => setDevice(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Cause Code
            </label>
            <Input
              placeholder="e.g. 16"
              value={cause}
              onChange={(e) => setCause(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Start Time
            </label>
            <Input
              type="datetime-local"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              End Time
            </label>
            <Input
              type="datetime-local"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button type="submit" disabled={loading}>
            {loading ? "Searching..." : "Search"}
          </Button>
          <Button type="button" variant="outline" onClick={handleClear}>
            Clear
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCopyLink}
          >
            {copied ? "Link Copied!" : "Copy Link"}
          </Button>
          <span className="text-xs text-muted-foreground ml-auto">
            Leave times blank to use the selected time range
          </span>
        </div>
      </form>
    </div>
  );
}
