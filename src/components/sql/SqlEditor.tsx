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
  onSave: () => void;
  loading?: boolean;
}

type SchemaMap = Record<string, { name: string; type: string }[]>;

export function SqlEditor({
  value,
  onChange,
  onRun,
  onSave,
  loading,
}: SqlEditorProps) {
  const editorRef = useRef<any>(null);
  const { theme } = useTheme();
  const [schema, setSchema] = useState<SchemaMap | null>(null);

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
      <div className="flex items-center gap-2">
        <Button onClick={onRun} disabled={loading || !value.trim()}>
          {loading ? "Running..." : "Run"}
        </Button>
        <Button
          variant="outline"
          onClick={handleFormat}
          disabled={!value.trim()}
        >
          Format
        </Button>
        <Button variant="outline" onClick={onSave} disabled={!value.trim()}>
          Save
        </Button>
        <Button variant="ghost" onClick={() => onChange("")}>
          Clear
        </Button>
        <span className="text-xs text-muted-foreground ml-auto">
          Ctrl+Enter to run
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
