import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";

function formatInterval(obj: any): string {
  if (
    obj.years ||
    obj.months ||
    obj.days ||
    obj.hours ||
    obj.minutes != null ||
    obj.seconds != null
  ) {
    const h = String(obj.hours || 0).padStart(2, "0");
    const m = String(obj.minutes || 0).padStart(2, "0");
    const s = String(obj.seconds || 0).padStart(2, "0");
    if (obj.days) return `${obj.days}d ${h}:${m}:${s}`;
    return `${h}:${m}:${s}`;
  }
  return JSON.stringify(obj);
}

function formatValue(val: any): string {
  if (val == null) return "";
  if (typeof val === "object") return formatInterval(val);
  return String(val);
}

interface SqlResultsProps {
  columns: string[];
  rows: any[];
  count: number;
  durationMs: number;
  totalMs?: number;
  error: string | null;
}

export function SqlResults({
  columns,
  rows,
  count,
  durationMs,
  totalMs,
  error,
}: SqlResultsProps) {
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  const sorted = useMemo(() => {
    if (!sortCol) return rows;
    return [...rows].sort((a, b) => {
      const av = a[sortCol] ?? "";
      const bv = b[sortCol] ?? "";
      const sa = formatValue(av);
      const sb = formatValue(bv);
      const cmp = sa.localeCompare(sb, undefined, { numeric: true });
      return sortAsc ? cmp : -cmp;
    });
  }, [rows, sortCol, sortAsc]);

  const handleSort = (col: string) => {
    if (sortCol === col) {
      setSortAsc(!sortAsc);
    } else {
      setSortCol(col);
      setSortAsc(true);
    }
  };

  const exportCsv = () => {
    const header = columns.join(",");
    const body = rows
      .map((r) =>
        columns
          .map((c) => {
            return `"${formatValue(r[c]).replace(/"/g, '""')}"`;
          })
          .join(","),
      )
      .join("\n");
    const blob = new Blob([`${header}\n${body}`], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cdr-query-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (error) {
    return (
      <div className="rounded-lg bg-destructive/10 p-4 text-destructive text-sm font-mono">
        {error}
      </div>
    );
  }
  if (columns.length === 0) return null;

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        0 rows · {formatTiming(durationMs, totalMs)}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {count} rows · {formatTiming(durationMs, totalMs)}
        </p>
        <Button variant="outline" size="sm" onClick={exportCsv}>
          Export CSV
        </Button>
      </div>
      <div className="rounded-lg border border-border overflow-hidden max-w-full">
        <div className="overflow-auto max-h-[500px]">
          <table className="text-sm w-full">
            <thead className="bg-muted sticky top-0 z-10">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col}
                    className="px-3 py-2 text-left font-medium cursor-pointer hover:bg-accent whitespace-nowrap"
                    onClick={() => handleSort(col)}
                  >
                    {col}
                    {sortCol === col && (sortAsc ? " ↑" : " ↓")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((row, i) => (
                <tr
                  key={i}
                  className="border-t border-border hover:bg-accent/50"
                >
                  {columns.map((col) => {
                    const val = row[col];
                    const display = formatValue(val);
                    return (
                      <td
                        key={col}
                        className="px-3 py-1.5 font-mono text-xs whitespace-nowrap max-w-xs truncate"
                        title={display}
                      >
                        {display}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// "query" = time Postgres spent (server-reported); "total" = browser round
// trip including network/download. A big gap means the network was slow.
function formatTiming(queryMs: number, totalMs?: number) {
  const fmt = (ms: number) =>
    ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
  const q = `${fmt(queryMs)} query`;
  return totalMs ? `${q} · ${fmt(totalMs)} total` : q;
}
