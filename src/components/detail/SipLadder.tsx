import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { sipLadder, getSnapshot } from "@/api/client";

interface SipLadderProps {
  callId: string;
  callManagerId?: string;
  cdrLegs?: any[];
}

interface SipMessage {
  timestamp: string;
  direction: "incoming" | "outgoing";
  type: "request" | "response";
  method: string | null;
  statusCode: number | null;
  reasonPhrase: string | null;
  summary: string;
  callId: string;
  fromNumber: string | null;
  toNumber: string | null;
  from: string | null;
  to: string | null;
  cseq: string | null;
  remoteIp: string;
  remotePort: number;
  raw: string;
}

function formatTime(ts: string): string {
  const match = ts.match(/(\d{2}:\d{2}:\d{2}\.\d{3})/);
  return match ? match[1] : ts;
}

function messageColor(msg: SipMessage): string {
  if (msg.type === "response") {
    if (!msg.statusCode) return "text-muted-foreground";
    if (msg.statusCode >= 200 && msg.statusCode < 300) return "text-green-400";
    if (msg.statusCode >= 100 && msg.statusCode < 200) return "text-blue-400";
    if (msg.statusCode >= 300 && msg.statusCode < 400) return "text-yellow-400";
    if (msg.statusCode >= 400) return "text-red-400";
    return "text-muted-foreground";
  }
  switch (msg.method) {
    case "INVITE":
      return "text-green-400";
    case "BYE":
      return "text-red-400";
    case "CANCEL":
      return "text-orange-400";
    case "ACK":
      return "text-blue-400";
    case "REFER":
      return "text-purple-400";
    case "UPDATE":
      return "text-yellow-400";
    default:
      return "text-muted-foreground";
  }
}

function messageLabel(msg: SipMessage): string {
  if (msg.type === "request") return msg.method || "";
  return msg.summary || `${msg.statusCode}`;
}

function cacheKey(callId: string, callManagerId?: string): string {
  return `sip-ladder:${callId}:${callManagerId || ""}`;
}

function reverseIp(ip: string): string {
  return ip.split(".").reverse().join(".");
}

function buildIpLabels(cdrLegs: any[]): Map<string, string> {
  const map = new Map<string, string>();
  function add(ip: string, label: string) {
    // CDR stores IPs in reversed byte order, so map both forms
    if (!map.has(ip)) map.set(ip, label);
    const rev = reverseIp(ip);
    if (!map.has(rev)) map.set(rev, label);
  }
  for (const leg of cdrLegs) {
    if (leg.origipaddr) {
      add(
        leg.origipaddr,
        leg.orig_device_description || leg.origdevicename || leg.origipaddr,
      );
    }
    if (leg.destipaddr) {
      add(
        leg.destipaddr,
        leg.dest_device_description || leg.destdevicename || leg.destipaddr,
      );
    }
  }
  return map;
}

export function SipLadder({
  callId,
  callManagerId,
  cdrLegs = [],
}: SipLadderProps) {
  // Restore from sessionStorage on mount
  const cached = (() => {
    try {
      const raw = sessionStorage.getItem(cacheKey(callId, callManagerId));
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();

  const [messages, setMessages] = useState<SipMessage[]>(
    cached?.messages || [],
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [fetched, setFetched] = useState(!!cached);
  const [meta, setMeta] = useState<{
    count: number;
    files_searched: number;
  } | null>(cached?.meta || null);

  const [cucmNode, setCucmNode] = useState<{
    hostname: string;
    ip: string | null;
  } | null>(cached?.cucmNode || null);
  const [ipDns, setIpDns] = useState<Record<string, string>>(
    cached?.ipDns || {},
  );
  const [fromSnapshot, setFromSnapshot] = useState(false);
  const [progress, setProgress] = useState<{
    status: string;
    filesTotal: number;
    filesDownloaded: number;
    node: string;
    elapsed: number;
  } | null>(null);

  // Check for saved snapshot on mount
  useEffect(() => {
    if (fetched || !callManagerId) return;
    getSnapshot(callId, callManagerId, "sip-trace")
      .then((data) => {
        if (data && data.messages && data.messages.length > 0) {
          setMessages(data.messages);
          setMeta({
            count: data.count,
            files_searched: data.files_searched,
          });
          if (data.cucmNode) setCucmNode(data.cucmNode);
          if (data.ipDns) setIpDns(data.ipDns);
          setFetched(true);
          setFromSnapshot(true);
        }
      })
      .catch(() => {}); // No snapshot — that's fine
  }, [callId, callManagerId]);

  const handleFetch = async () => {
    setFromSnapshot(false);
    setLoading(true);
    setError(null);
    setProgress(null);
    try {
      const data = await sipLadder(callId, callManagerId, (status) => {
        setProgress({
          status: status.status,
          filesTotal: status.progress.filesTotal,
          filesDownloaded: status.progress.filesDownloaded,
          node: status.progress.node,
          elapsed: status.elapsed || 0,
        });
      });
      setMessages(data.messages);
      const newMeta = {
        count: data.count,
        files_searched: data.files_searched,
      };
      if (data.cucmNode) setCucmNode(data.cucmNode);
      if (data.ipDns) setIpDns(data.ipDns);
      setMeta(newMeta);
      setFetched(true);
      setProgress(null);
      try {
        sessionStorage.setItem(
          cacheKey(callId, callManagerId),
          JSON.stringify({
            messages: data.messages,
            meta: newMeta,
            cucmNode: data.cucmNode,
            ipDns: data.ipDns,
          }),
        );
      } catch {
        // sessionStorage full or unavailable — ignore
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setProgress(null);
    }
  };

  const filtered = messages.filter(
    (m) =>
      m.method !== "REGISTER" &&
      m.method !== "NOTIFY" &&
      m.method !== "SUBSCRIBE" &&
      !(m.cseq && /REGISTER|NOTIFY|SUBSCRIBE/i.test(m.cseq)),
  );

  const remoteIps = [...new Set(filtered.map((m) => m.remoteIp))];
  const ipLabels = buildIpLabels(cdrLegs);
  const baseColumns = ["CUCM", ...remoteIps];

  // Drag-and-drop column reordering
  const [columnOrder, setColumnOrder] = useState<number[]>([]);
  const dragIdx = useRef<number | null>(null);
  const dragOverIdx = useRef<number | null>(null);

  // Reset column order when columns change
  useEffect(() => {
    setColumnOrder(baseColumns.map((_, i) => i));
  }, [baseColumns.length]);

  const columns =
    columnOrder.length === baseColumns.length
      ? columnOrder.map((i) => baseColumns[i])
      : baseColumns;

  // Build a mapping from baseColumns index to display index
  const displayOrder =
    columnOrder.length === baseColumns.length
      ? columnOrder
      : baseColumns.map((_col, idx) => idx);
  const baseToDisplay = new Map<number, number>();
  displayOrder.forEach((baseIdx, displayIdx) => {
    baseToDisplay.set(baseIdx, displayIdx);
  });

  const columnLabels = columns.map((col) => {
    if (col === "CUCM") {
      if (cucmNode) {
        return cucmNode.ip
          ? `${cucmNode.hostname}\n${cucmNode.ip}`
          : cucmNode.hostname;
      }
      return col;
    }
    // Try CDR label first, then DNS, then just IP
    const cdrLabel = ipLabels.get(col);
    const dnsLabel = ipDns[col];
    const name = cdrLabel && cdrLabel !== col ? cdrLabel : dnsLabel || null;
    return name ? `${name}\n${col}` : col;
  });
  const colWidth = 100 / columns.length;

  const handleDragStart = (displayIndex: number) => {
    dragIdx.current = displayIndex;
  };

  const handleDragOver = (e: React.DragEvent, displayIndex: number) => {
    e.preventDefault();
    dragOverIdx.current = displayIndex;
  };

  const handleDrop = (displayIndex: number) => {
    if (dragIdx.current === null || dragIdx.current === displayIndex) return;
    const newOrder = [...displayOrder];
    const [moved] = newOrder.splice(dragIdx.current, 1);
    newOrder.splice(displayIndex, 0, moved);
    setColumnOrder(newOrder);
    dragIdx.current = null;
    dragOverIdx.current = null;
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">SIP Ladder</h3>
          {fromSnapshot && (
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
              cached
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {fromSnapshot && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleFetch}
              disabled={loading}
            >
              {loading ? "Refreshing..." : "Refresh from CUCM"}
            </Button>
          )}
          {!fetched && (
            <Button onClick={handleFetch} disabled={loading}>
              {loading ? "Fetching traces..." : "Load SIP Trace"}
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded bg-destructive/10 p-3 text-destructive text-sm">
          {error}
        </div>
      )}

      {loading && (
        <div className="space-y-2 py-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
            {progress ? (
              <span>
                {progress.status === "downloading" && progress.node
                  ? `Querying ${progress.node}...`
                  : progress.status === "parsing" && progress.filesTotal > 0
                    ? `Parsing traces: ${progress.filesDownloaded}/${progress.filesTotal} files`
                    : "Starting trace download..."}
                {progress.elapsed > 0 && (
                  <span className="text-xs ml-2">({progress.elapsed}s)</span>
                )}
              </span>
            ) : (
              "Starting trace download..."
            )}
          </div>
          {progress && progress.filesTotal > 0 && (
            <div className="ml-6 w-64 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{
                  width: `${Math.round((progress.filesDownloaded / progress.filesTotal) * 100)}%`,
                }}
              />
            </div>
          )}
          <p className="text-xs text-muted-foreground/60 ml-6">
            You can navigate away — the download continues in the background.
          </p>
        </div>
      )}

      {fetched && filtered.length === 0 && (
        <div className="text-sm text-muted-foreground space-y-1">
          <p>
            No call signaling found in {meta?.files_searched} trace files
            {messages.length > 0 &&
              ` (${messages.length} BLF/presence messages filtered)`}
            .
          </p>
          <p className="text-xs">
            The call may have been processed on a different CUCM node. Try
            collecting traces with --all-nodes.
          </p>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="overflow-x-auto">
          <p className="text-xs text-muted-foreground mb-4">
            {filtered.length} SIP messages from {meta?.files_searched} trace
            files
            {columns.length > 0 && ` \u2022 ${columns.length} endpoints`}
          </p>

          <div style={{ minWidth: `${Math.max(600, columns.length * 180)}px` }}>
            {/* Column headers — draggable */}
            <div className="flex text-xs mb-1">
              <div className="w-28 shrink-0" />
              <div className="flex-1 flex">
                {columnLabels.map((label, i) => (
                  <div
                    key={i}
                    draggable
                    onDragStart={() => handleDragStart(i)}
                    onDragOver={(e) => handleDragOver(e, i)}
                    onDrop={() => handleDrop(i)}
                    onDragEnd={() => {
                      dragIdx.current = null;
                      dragOverIdx.current = null;
                    }}
                    className="flex-1 text-center text-muted-foreground px-1 font-medium whitespace-pre-line leading-tight cursor-grab active:cursor-grabbing select-none hover:bg-accent/30 rounded transition-colors"
                  >
                    {label.split("\n").map((line, j) => (
                      <div
                        key={j}
                        className={
                          j === 0
                            ? "font-semibold text-foreground/80 truncate"
                            : "font-mono text-[10px] text-muted-foreground/60 truncate"
                        }
                      >
                        {line}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Header separator dots on vertical lines */}
            <div className="flex">
              <div className="w-28 shrink-0" />
              <div className="flex-1 relative" style={{ height: "8px" }}>
                {columns.map((_, ci) => (
                  <div
                    key={ci}
                    className="absolute top-0 bottom-0 border-l-2 border-muted-foreground/30"
                    style={{
                      left: `${ci * colWidth + colWidth / 2}%`,
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Message rows */}
            {filtered.map((msg, i) => {
              const isExpanded = expanded === i;
              // Map from base column index to current display position
              const baseRemoteIdx = remoteIps.indexOf(msg.remoteIp) + 1;
              const baseCucmIdx = 0;
              const remoteDisplayIdx =
                baseToDisplay.get(baseRemoteIdx) ?? baseRemoteIdx;
              const cucmDisplayIdx =
                baseToDisplay.get(baseCucmIdx) ?? baseCucmIdx;
              const srcIdx =
                msg.direction === "outgoing"
                  ? cucmDisplayIdx
                  : remoteDisplayIdx;
              const dstIdx =
                msg.direction === "outgoing"
                  ? remoteDisplayIdx
                  : cucmDisplayIdx;
              const leftIdx = Math.min(srcIdx, dstIdx);
              const rightIdx = Math.max(srcIdx, dstIdx);
              const goingRight = dstIdx > srcIdx;
              const color = messageColor(msg);
              const label = messageLabel(msg);

              const leftPct = leftIdx * colWidth + colWidth / 2;
              const rightPct = rightIdx * colWidth + colWidth / 2;
              const widthPct = rightPct - leftPct;

              return (
                <div key={i}>
                  <div
                    onClick={() => setExpanded(isExpanded ? null : i)}
                    className="flex cursor-pointer hover:bg-accent/50 transition-colors rounded"
                    style={{ height: "36px" }}
                  >
                    {/* Timestamp */}
                    <div className="w-28 shrink-0 flex items-center font-mono text-xs text-muted-foreground pl-2">
                      {formatTime(msg.timestamp)}
                    </div>

                    {/* Ladder area */}
                    <div className="flex-1 relative">
                      {/* Vertical lines */}
                      {columns.map((_, ci) => (
                        <div
                          key={ci}
                          className="absolute top-0 bottom-0 border-l border-dashed border-muted-foreground/20"
                          style={{
                            left: `${ci * colWidth + colWidth / 2}%`,
                          }}
                        />
                      ))}

                      {/* Arrow container */}
                      <div
                        className={`absolute top-1/2 ${color}`}
                        style={{
                          left: `${leftPct}%`,
                          width: `${widthPct}%`,
                        }}
                      >
                        {/* Arrow line */}
                        <div className="absolute top-0 left-0 right-0 h-px bg-current" />

                        {/* Label centered above the line */}
                        <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-[11px] font-mono whitespace-nowrap font-medium">
                          {label}
                        </span>

                        {/* Arrowhead */}
                        {goingRight ? (
                          <div
                            className="absolute right-0"
                            style={{
                              top: "-4px",
                              width: 0,
                              height: 0,
                              borderTop: "4px solid transparent",
                              borderBottom: "4px solid transparent",
                              borderLeft: "7px solid currentColor",
                            }}
                          />
                        ) : (
                          <div
                            className="absolute left-0"
                            style={{
                              top: "-4px",
                              width: 0,
                              height: 0,
                              borderTop: "4px solid transparent",
                              borderBottom: "4px solid transparent",
                              borderRight: "7px solid currentColor",
                            }}
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded raw SIP message */}
                  {isExpanded && (
                    <pre className="ml-28 mr-4 my-1 p-3 rounded bg-muted text-xs overflow-x-auto max-h-96 whitespace-pre-wrap">
                      {msg.raw}
                    </pre>
                  )}
                </div>
              );
            })}

            {/* Bottom cap for vertical lines */}
            <div className="flex">
              <div className="w-28 shrink-0" />
              <div className="flex-1 relative" style={{ height: "8px" }}>
                {columns.map((_, ci) => (
                  <div
                    key={ci}
                    className="absolute top-0 bottom-0 border-l-2 border-muted-foreground/30"
                    style={{
                      left: `${ci * colWidth + colWidth / 2}%`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
