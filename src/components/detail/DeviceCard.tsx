import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getDeviceBatch,
  getPhoneWebPage,
  getPhoneLogs,
  saveSnapshot,
} from "@/api/client";

interface DeviceCardProps {
  origDevice: string;
  destDevice: string;
  clusterId?: string;
  callId?: string;
  callManagerId?: string;
}

interface DeviceInfo {
  found: boolean;
  deviceName: string;
  ip: string | null;
  status: string;
  statusReasonText: string;
  model: string;
  protocol: string;
  activeLoadId: string;
  dirNumber: string;
  description: string;
  webCapable: boolean;
  webPages: Record<string, string> | null;
}

// Safely render a value that might be an object from xml2js
function str(val: any): string {
  if (val == null) return "N/A";
  if (typeof val === "object") return JSON.stringify(val);
  return String(val);
}

function statusBadge(status: string) {
  if (status === "Registered")
    return (
      <Badge className="bg-green-500/15 text-green-400 border-green-500/25">
        Registered
      </Badge>
    );
  if (status === "UnRegistered")
    return <Badge variant="destructive">Unregistered</Badge>;
  return (
    <Badge className="bg-yellow-500/15 text-yellow-400 border-yellow-500/25">
      {status}
    </Badge>
  );
}

function DevicePanel({
  deviceName,
  info,
  clusterId,
  callId,
  callManagerId,
}: {
  deviceName: string;
  info: DeviceInfo | null;
  clusterId?: string;
  callId?: string;
  callManagerId?: string;
}) {
  const [phoneData, setPhoneData] = useState<{
    page: string;
    data?: { key: string; val: string }[];
    text?: string;
    error?: string;
  } | null>(null);
  const [webLoading, setWebLoading] = useState(false);
  const [availableLogs, setAvailableLogs] = useState<string[]>([]);

  // Fetch available log files when device has IP
  useEffect(() => {
    if (info?.found && info.ip && info.webCapable) {
      getPhoneLogs(deviceName, clusterId)
        .then((r) => setAvailableLogs(r.logs))
        .catch(() => setAvailableLogs(["messages"]));
    }
  }, [deviceName, clusterId, info?.ip]);

  const handleFetchPage = async (page: string) => {
    setWebLoading(true);
    try {
      const result = await getPhoneWebPage(deviceName, page, clusterId);
      setPhoneData({
        page,
        data: result.data,
        text: result.text,
      });
      // Auto-save snapshot if we have call context
      if (callId && callManagerId) {
        const content = result.text || JSON.stringify(result.data);
        saveSnapshot(callId, callManagerId, page, content, deviceName).catch(
          () => {},
        );
      }
    } catch (err: any) {
      setPhoneData({ page, error: err.message });
    } finally {
      setWebLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <p className="font-mono text-sm font-medium">{deviceName}</p>
      </div>

      {info && !info.found && (
        <p className="text-sm text-muted-foreground">
          Not found in RISPort — device may be offline
        </p>
      )}

      {info?.found && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              {statusBadge(info.status)}
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">IP</span>
              <span className="font-mono">{str(info.ip)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Protocol</span>
              <span>{str(info.protocol)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Firmware</span>
              <span className="font-mono text-xs">
                {str(info.activeLoadId)}
              </span>
            </div>
            <div className="col-span-2">
              <span className="text-muted-foreground text-sm">DN</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {info.dirNumber ? (
                  info.dirNumber
                    .split(",")
                    .map((dn: string) => dn.replace(/-Registered$/i, "").trim())
                    .filter(Boolean)
                    .map((dn: string, i: number) => (
                      <span
                        key={i}
                        className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded"
                      >
                        {dn}
                      </span>
                    ))
                ) : (
                  <span className="text-sm">N/A</span>
                )}
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Description</span>
              <span className="truncate ml-2">{str(info.description)}</span>
            </div>
          </div>

          {info.webCapable && info.ip && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground">Fetch:</span>
                {["network", "config", "status", ...availableLogs].map((p) => (
                  <Button
                    key={p}
                    size="sm"
                    variant="outline"
                    className="h-6 text-xs"
                    onClick={() => handleFetchPage(p)}
                    disabled={webLoading}
                  >
                    {p === "network"
                      ? "Network/CDP"
                      : p === "messages"
                        ? "Syslog"
                        : p.startsWith("messages.")
                          ? `Syslog.${p.split(".")[1]}`
                          : p.charAt(0).toUpperCase() + p.slice(1)}
                  </Button>
                ))}
                <a
                  href={`http://${info.ip}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-foreground underline ml-auto"
                >
                  Open phone web UI
                </a>
              </div>

              {webLoading && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="h-3 w-3 animate-spin rounded-full border border-muted-foreground border-t-transparent" />
                  Loading...
                </div>
              )}

              {phoneData && (
                <div className="rounded border border-border overflow-auto max-h-96">
                  <div className="flex items-center justify-between px-3 py-1.5 bg-muted text-xs text-muted-foreground border-b border-border sticky top-0">
                    <span>{phoneData.page}</span>
                    <button
                      onClick={() => setPhoneData(null)}
                      className="hover:text-foreground"
                    >
                      Close
                    </button>
                  </div>

                  {phoneData.error && (
                    <p className="p-3 text-sm text-destructive">
                      {phoneData.error}
                    </p>
                  )}

                  {phoneData.data && phoneData.data.length === 0 && (
                    <p className="p-3 text-sm text-muted-foreground">
                      No data available
                    </p>
                  )}

                  {phoneData.data && phoneData.data.length > 0 && (
                    <table className="w-full text-xs">
                      <tbody>
                        {phoneData.data.map(
                          (row: { key: string; val: string }, i: number) => (
                            <tr
                              key={i}
                              className="border-b border-border last:border-0"
                            >
                              <td className="px-3 py-1 text-muted-foreground font-medium whitespace-nowrap">
                                {row.key}
                              </td>
                              <td className="px-3 py-1 font-mono">{row.val}</td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                  )}

                  {phoneData.text && (
                    <pre className="p-3 text-xs font-mono whitespace-pre-wrap">
                      {phoneData.text}
                    </pre>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function DeviceCard({
  origDevice,
  destDevice,
  clusterId,
  callId,
  callManagerId,
}: DeviceCardProps) {
  const hasOrig = /^SEP/i.test(origDevice);
  const hasDest = /^SEP/i.test(destDevice);
  const [deviceData, setDeviceData] = useState<Record<string, DeviceInfo>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetched, setFetched] = useState(false);

  if (!hasOrig && !hasDest) return null;

  const phoneDevices = [
    ...(hasOrig ? [origDevice] : []),
    ...(hasDest && destDevice !== origDevice ? [destDevice] : []),
  ];

  const handleLookup = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getDeviceBatch(phoneDevices, clusterId);
      setDeviceData(data.devices);
      setFetched(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Device Diagnostics</h3>
        {!fetched && (
          <Button onClick={handleLookup} disabled={loading}>
            {loading
              ? "Querying RISPort..."
              : `Lookup ${phoneDevices.length} device${phoneDevices.length > 1 ? "s" : ""}`}
          </Button>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {fetched && (
        <div className="space-y-6">
          {hasOrig && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                Originating
              </p>
              <DevicePanel
                deviceName={origDevice}
                info={deviceData[origDevice] || null}
                clusterId={clusterId}
                callId={callId}
                callManagerId={callManagerId}
              />
            </div>
          )}
          {hasDest && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                Destination
              </p>
              <DevicePanel
                deviceName={destDevice}
                info={deviceData[destDevice] || null}
                clusterId={clusterId}
                callId={callId}
                callManagerId={callManagerId}
              />
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
