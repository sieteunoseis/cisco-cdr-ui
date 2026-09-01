import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  useLabelRules,
  type LabelField,
  type LabelRule,
  type PaletteKey,
} from "@/hooks/useLabelRules";
import { BADGE_PALETTE, parseImportedRules } from "@/lib/labelRules";

const FIELD_OPTIONS: { value: LabelField; label: string }[] = [
  { value: "calling", label: "Calling Number" },
  { value: "called", label: "Called Number" },
  { value: "origDevice", label: "Orig Device" },
  { value: "destDevice", label: "Dest Device" },
];

const COLOR_OPTIONS: PaletteKey[] = [
  "gray",
  "blue",
  "orange",
  "green",
  "red",
  "purple",
  "yellow",
];

interface RuleFormState {
  label: string;
  color: PaletteKey;
  fields: LabelField[];
  pattern: string;
}

const EMPTY_FORM: RuleFormState = {
  label: "",
  color: "blue",
  fields: [],
  pattern: "",
};

function isValidPattern(pattern: string): boolean {
  try {
    new RegExp(pattern, "i");
    return true;
  } catch {
    return false;
  }
}

export function SettingsPage() {
  const { rules, loading, error, add, update, remove, toggle, reset, importRules } =
    useLabelRules();
  const [form, setForm] = useState<RuleFormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const patternValid =
    form.pattern.trim() === "" || isValidPattern(form.pattern);
  const canSave =
    form.label.trim() !== "" &&
    form.fields.length > 0 &&
    form.pattern.trim() !== "" &&
    patternValid;

  const startEdit = (rule: LabelRule) => {
    setEditingId(rule.id);
    setForm({
      label: rule.label,
      color: rule.color,
      fields: rule.fields,
      pattern: rule.pattern,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleSave = () => {
    if (!canSave) return;
    const action = editingId
      ? update(editingId, { ...form })
      : add({ ...form, enabled: true });
    action
      .then(() => {
        setImportError(null);
        cancelEdit();
      })
      .catch((err) =>
        setImportError(err instanceof Error ? err.message : "Save failed."),
      );
  };

  const toggleField = (field: LabelField) => {
    setForm((f) => ({
      ...f,
      fields: f.fields.includes(field)
        ? f.fields.filter((x) => x !== field)
        : [...f.fields, field],
    }));
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(rules, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cdr-label-rules-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (file: File) => {
    file
      .text()
      .then((text) => {
        const parsed = parseImportedRules(text);
        if (!parsed || parsed.length === 0) {
          setImportError("File doesn't contain a valid rule list.");
          return;
        }
        return importRules(parsed).then(() => setImportError(null));
      })
      .catch((err) =>
        setImportError(
          err instanceof Error ? err.message : "Could not read file.",
        ),
      );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Custom Label Rules</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            Export Rules
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            Import Rules
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImportFile(file);
              e.target.value = "";
            }}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              reset().catch((err) =>
                setImportError(
                  err instanceof Error ? err.message : "Reset failed.",
                ),
              )
            }
          >
            Reset to Defaults
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 p-3 text-destructive text-sm">
          Couldn't load label rules from the server: {error}
        </div>
      )}

      {importError && (
        <div className="rounded-lg bg-destructive/10 p-3 text-destructive text-sm">
          {importError}
        </div>
      )}

      <div className="rounded-lg border border-border p-4 space-y-3">
        <h3 className="text-sm font-semibold">
          {editingId ? "Edit Rule" : "Add Rule"}
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Label
            </label>
            <Input
              value={form.label}
              onChange={(e) =>
                setForm((f) => ({ ...f, label: e.target.value }))
              }
              placeholder="e.g. Internal"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Color
            </label>
            <div className="flex items-center gap-1.5">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, color: c }))}
                  className={`h-6 w-6 rounded-full border-2 ${BADGE_PALETTE[c]} ${
                    form.color === c
                      ? "border-foreground"
                      : "border-transparent"
                  }`}
                  title={c}
                />
              ))}
            </div>
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">
            Match fields
          </label>
          <div className="flex flex-wrap gap-3">
            {FIELD_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="flex items-center gap-1.5 text-sm cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={form.fields.includes(opt.value)}
                  onChange={() => toggleField(opt.value)}
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">
            Regex Pattern
          </label>
          <Input
            value={form.pattern}
            onChange={(e) =>
              setForm((f) => ({ ...f, pattern: e.target.value }))
            }
            placeholder="e.g. ^(ATA|AN[0-9A-F])"
            aria-invalid={!patternValid}
          />
          {!patternValid && (
            <p className="text-xs text-destructive mt-1">
              Invalid regular expression.
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" disabled={!canSave} onClick={handleSave}>
            {editingId ? "Save Changes" : "Add Rule"}
          </Button>
          {editingId && (
            <Button variant="outline" size="sm" onClick={cancelEdit}>
              Cancel
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading rules…</p>
      ) : (
        <div className="space-y-2">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className="flex items-center justify-between rounded-lg border border-border p-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Switch
                  checked={rule.enabled}
                  onCheckedChange={() =>
                    toggle(rule.id).catch((err) =>
                      setImportError(
                        err instanceof Error ? err.message : "Update failed.",
                      ),
                    )
                  }
                />
                <span
                  className={`text-xs px-2 py-0.5 rounded-full border ${BADGE_PALETTE[rule.color]}`}
                >
                  {rule.label}
                </span>
                <span className="text-xs text-muted-foreground truncate">
                  {rule.fields.join(", ")} · <code>{rule.pattern}</code>
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => startEdit(rule)}
                >
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    remove(rule.id)
                      .then(() => {
                        if (editingId === rule.id) cancelEdit();
                      })
                      .catch((err) =>
                        setImportError(
                          err instanceof Error ? err.message : "Delete failed.",
                        ),
                      );
                  }}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
          {rules.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No label rules yet. Add one above — for example, an "Internal"
              rule matching your own trunk or gateway device-name convention.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
