import { useState, useEffect } from "react";

interface SqlVariablesProps {
  query: string;
  onResolvedQuery: (resolved: string) => void;
}

interface VarDef {
  name: string;
  defaultValue: string;
}

// Match :var_name or :var_name=default_value, but not ::type_casts
const VAR_REGEX = /:([a-zA-Z_][a-zA-Z0-9_]*)(?:=([^\s,)]+))?/g;

export function extractVariables(query: string): VarDef[] {
  const seen = new Set<string>();
  const vars: VarDef[] = [];
  let m;
  while ((m = VAR_REGEX.exec(query)) !== null) {
    const before = query[m.index - 1];
    if (before === ":" || before === "'") continue;
    if (seen.has(m[1])) continue;
    seen.add(m[1]);
    vars.push({ name: m[1], defaultValue: m[2] || "" });
  }
  return vars;
}

export function SqlVariables({ query, onResolvedQuery }: SqlVariablesProps) {
  const variables = extractVariables(query);
  const [values, setValues] = useState<Record<string, string>>({});

  // Initialize with defaults when variables change
  useEffect(() => {
    setValues((prev) => {
      const next: Record<string, string> = {};
      for (const v of variables) {
        next[v.name] = prev[v.name] ?? v.defaultValue;
      }
      return next;
    });
  }, [variables.map((v) => `${v.name}=${v.defaultValue}`).join(",")]);

  // Update resolved query whenever values change
  useEffect(() => {
    let resolved = query;
    for (const v of variables) {
      const val = values[v.name] || v.defaultValue;
      // Replace :name=default or :name, but not ::name
      const pattern = v.defaultValue
        ? new RegExp(
            `(?<!:):${v.name}=${v.defaultValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
            "g",
          )
        : new RegExp(`(?<!:):${v.name}\\b`, "g");
      if (!val) {
        resolved = resolved.replace(pattern, `:${v.name}`);
      } else {
        // Always wrap in single quotes — Postgres will cast as needed
        const quoted = `'${val.replace(/'/g, "''")}'`;
        resolved = resolved.replace(pattern, quoted);
      }
    }
    onResolvedQuery(resolved);
  }, [query, values, onResolvedQuery]);

  if (variables.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/50 px-4 py-3">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Variables
      </span>
      {variables.map((v) => (
        <label key={v.name} className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground font-mono">
            :{v.name}
          </span>
          <input
            type="text"
            value={values[v.name] ?? v.defaultValue}
            onChange={(e) =>
              setValues((prev) => ({ ...prev, [v.name]: e.target.value }))
            }
            placeholder={v.defaultValue || v.name}
            className="h-7 rounded border border-border bg-background px-2 text-sm font-mono w-44 focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </label>
      ))}
    </div>
  );
}
