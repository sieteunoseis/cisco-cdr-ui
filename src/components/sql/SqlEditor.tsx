import { useRef, useCallback } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import { format } from "sql-formatter";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/useTheme";

interface SqlEditorProps {
  value: string;
  onChange: (value: string) => void;
  onRun: () => void;
  onSave: () => void;
  loading?: boolean;
}

export function SqlEditor({
  value,
  onChange,
  onRun,
  onSave,
  loading,
}: SqlEditorProps) {
  const editorRef = useRef<any>(null);
  const { theme } = useTheme();

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, onRun);
  };

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
