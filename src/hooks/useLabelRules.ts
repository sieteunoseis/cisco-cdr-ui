import { useState, useCallback } from "react";

export type LabelField = "calling" | "called" | "origDevice" | "destDevice";
export type PaletteKey =
  | "gray"
  | "blue"
  | "orange"
  | "green"
  | "red"
  | "purple"
  | "yellow";

export interface LabelRule {
  id: string;
  label: string;
  color: PaletteKey;
  fields: LabelField[];
  pattern: string;
  enabled: boolean;
  createdAt: string;
}

const STORAGE_KEY = "cdr-label-rules";

const DEFAULT_RULES: LabelRule[] = [
  {
    id: "default-analog",
    label: "Analog",
    color: "yellow",
    fields: ["origDevice", "destDevice"],
    pattern: "^(ATA|AN[0-9A-F])",
    enabled: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "default-emergency",
    label: "Emergency",
    color: "red",
    fields: ["called"],
    pattern: "^(911|112|999|000|111)$",
    enabled: true,
    createdAt: new Date().toISOString(),
  },
];

function loadRules(): LabelRule[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    // fall through to defaults
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_RULES));
  return DEFAULT_RULES;
}

function persist(rules: LabelRule[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
}

export function useLabelRules() {
  const [rules, setRules] = useState<LabelRule[]>(loadRules);

  const add = useCallback((rule: Omit<LabelRule, "id" | "createdAt">) => {
    const newRule: LabelRule = {
      ...rule,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    setRules((prev) => {
      const updated = [...prev, newRule];
      persist(updated);
      return updated;
    });
  }, []);

  const update = useCallback(
    (id: string, patch: Partial<Omit<LabelRule, "id" | "createdAt">>) => {
      setRules((prev) => {
        const updated = prev.map((r) =>
          r.id === id ? { ...r, ...patch } : r,
        );
        persist(updated);
        return updated;
      });
    },
    [],
  );

  const remove = useCallback((id: string) => {
    setRules((prev) => {
      const updated = prev.filter((r) => r.id !== id);
      persist(updated);
      return updated;
    });
  }, []);

  const toggle = useCallback((id: string) => {
    setRules((prev) => {
      const updated = prev.map((r) =>
        r.id === id ? { ...r, enabled: !r.enabled } : r,
      );
      persist(updated);
      return updated;
    });
  }, []);

  const reset = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setRules(DEFAULT_RULES);
    persist(DEFAULT_RULES);
  }, []);

  const importRules = useCallback(
    (incoming: Omit<LabelRule, "id" | "createdAt">[]) => {
      setRules((prev) => {
        const withIds: LabelRule[] = incoming.map((r) => ({
          ...r,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
        }));
        const updated = [...prev, ...withIds];
        persist(updated);
        return updated;
      });
    },
    [],
  );

  return { rules, add, update, remove, toggle, reset, importRules };
}
