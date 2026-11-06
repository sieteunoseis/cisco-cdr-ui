import { useRef, useCallback, useEffect, useState } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import { format } from "sql-formatter";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/useTheme";
import { sqlSchema } from "@/api/client";

interface SqlEditorProps {
  value: string;
  onChange: (value: string) => void;
  onRun: () => void;
  onCancel?: () => void;
  onSave: () => void;
  onUpdate?: () => void;
  onClear?: () => void;
  loadedQueryName?: string | null;
  loading?: boolean;
  runId?: number;
}

type SchemaMap = Record<string, { name: string; type: string }[]>;

// Must match QUERY_TIMEOUT_MS in cisco-cdr-processor src/api/routes/sql.js
const QUERY_TIMEOUT_S = 30;

// Postgres can't report progress for a SELECT, so this shows elapsed time
// against the server's timeout rather than a real percent-complete.
function useElapsed(running?: boolean, runId?: number) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!running) return;
    const start = Date.now();
    const tick = () => setElapsed((Date.now() - start) / 1000);
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 100);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [running, runId]);
  return running ? elapsed : 0;
}

export function SqlEditor({
  value,
  onChange,
  onRun,
  onCancel,
  onSave,
  onUpdate,
  onClear,
  loadedQueryName,
  loading,
  runId,
}: SqlEditorProps) {
  const editorRef = useRef<any>(null);
  const { theme } = useTheme();
  const [schema, setSchema] = useState<SchemaMap | null>(null);
  const elapsed = useElapsed(loading, runId);
  const pct = Math.min(100, (elapsed / QUERY_TIMEOUT_S) * 100);

  // Fetch schema once for autocomplete
  useEffect(() => {
    sqlSchema()
      .then((data) => setSchema(data.tables))
      .catch(() => {});
  }, []);

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, onRun);

    // Register autocomplete provider if schema is loaded
    if (schema) {
      registerCompletions(monaco, schema);
    }
  };

  // Re-register completions when schema loads after mount
  useEffect(() => {
    if (schema && editorRef.current) {
      const monaco = (window as any).monaco;
      if (monaco) registerCompletions(monaco, schema);
    }
  }, [schema]);

  const handleFormat = useCallback(() => {
    try {
      const formatted = format(value, { language: "postgresql" });
      onChange(formatted);
    } catch {}
  }, [value, onChange]);

  return (
    <div className="space-y-2">
      <div className="rounded-lg border border-border overflow-hidden">
        <Editor
          height="250px"
          language="sql"
          theme={theme === "dark" ? "vs-dark" : "light"}
          value={value}
          onChange={(v) => onChange(v || "")}
          onMount={handleMount}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            wordWrap: "on",
            padding: { top: 12 },
            guides: { indentation: false, bracketPairs: false },
            folding: false,
            renderLineHighlight: "none",
            quickSuggestions: true,
            suggestOnTriggerCharacters: true,
          }}
        />
      </div>
      {loading && (
        <div className="h-1 w-full rounded bg-muted overflow-hidden">
          <div
            className={`h-full transition-[width] duration-100 ${
              pct > 80 ? "bg-destructive" : "bg-primary"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      <div className="flex items-center gap-2">
        {loading ? (
          <Button variant="destructive" onClick={onCancel} disabled={!onCancel}>
            Cancel
          </Button>
        ) : (
          <Button onClick={onRun} disabled={!value.trim()}>
            Run
          </Button>
        )}
        <Button
          variant="outline"
          onClick={handleFormat}
          disabled={!value.trim() || loading}
        >
          Format
        </Button>
        {onUpdate && (
          <Button
            variant="outline"
            onClick={onUpdate}
            disabled={!value.trim() || loading}
            title={`Overwrite "${loadedQueryName}" with the current text`}
          >
            Update
          </Button>
        )}
        <Button
          variant="outline"
          onClick={onSave}
          disabled={!value.trim() || loading}
        >
          {onUpdate ? "Save As New" : "Save"}
        </Button>
        <Button
          variant="ghost"
          onClick={onClear ?? (() => onChange(""))}
          disabled={loading}
        >
          Clear
        </Button>
        <span className="text-xs text-muted-foreground ml-auto">
          {loading
            ? elapsed <= QUERY_TIMEOUT_S
              ? `Running… ${elapsed.toFixed(1)}s / ${QUERY_TIMEOUT_S}s query limit`
              : // The 30s limit is database time only; past it, the query has
                // finished or been cancelled and we're waiting on the network.
                `Receiving results… ${elapsed.toFixed(1)}s (query limit is ${QUERY_TIMEOUT_S}s; download time isn't limited)`
            : "Ctrl+Enter to run"}
        </span>
      </div>
    </div>
  );
}

let completionRegistered = false;

function registerCompletions(monaco: any, schema: SchemaMap) {
  if (completionRegistered) return;
  completionRegistered = true;

  monaco.languages.registerCompletionItemProvider("sql", {
    provideCompletionItems(model: any, position: any) {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      // Check if we're after a dot (table.column)
      const lineContent = model.getLineContent(position.lineNumber);
      const beforeCursor = lineContent.substring(0, word.startColumn - 1);
      const dotMatch = beforeCursor.match(/(\w+)\.\s*$/);

      if (dotMatch) {
        const tableName = dotMatch[1].toLowerCase();
        const columns = schema[tableName];
        if (columns) {
          return {
            suggestions: columns.map((col) => ({
              label: col.name,
              kind: monaco.languages.CompletionItemKind.Field,
              detail: col.type,
              insertText: col.name,
              range,
            })),
          };
        }
      }

      // Table names
      const tableSuggestions = Object.keys(schema).map((table) => ({
        label: table,
        kind: monaco.languages.CompletionItemKind.Struct,
        detail: `${schema[table].length} columns`,
        insertText: table,
        range,
      }));

      // All column names (flat)
      const columnSuggestions: any[] = [];
      const seen = new Set<string>();
      for (const [table, columns] of Object.entries(schema)) {
        for (const col of columns) {
          if (seen.has(col.name)) continue;
          seen.add(col.name);
          columnSuggestions.push({
            label: col.name,
            kind: monaco.languages.CompletionItemKind.Field,
            detail: `${col.type} (${table})`,
            insertText: col.name,
            range,
          });
        }
      }

      return { suggestions: [...tableSuggestions, ...columnSuggestions] };
    },
  });
}
