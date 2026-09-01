import { useState, useCallback, useEffect } from "react";
import {
  getLabels,
  createLabel,
  updateLabel as apiUpdateLabel,
  deleteLabel,
  importLabels,
  resetLabels,
} from "@/api/client";

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
  external: boolean;
  createdAt: string;
}

export function useLabelRules() {
  const [rules, setRules] = useState<LabelRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getLabels()
      .then((res) => {
        if (cancelled) return;
        setRules(res.rules);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const add = useCallback(
    async (rule: Omit<LabelRule, "id" | "createdAt">) => {
      const res = await createLabel(rule);
      setRules((prev) => [...prev, res.rule]);
    },
    [],
  );

  const update = useCallback(
    async (
      id: string,
      patch: Partial<Omit<LabelRule, "id" | "createdAt">>,
    ) => {
      const res = await apiUpdateLabel(id, patch);
      setRules((prev) => prev.map((r) => (r.id === id ? res.rule : r)));
    },
    [],
  );

  const remove = useCallback(async (id: string) => {
    await deleteLabel(id);
    setRules((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const toggle = useCallback(
    async (id: string) => {
      const current = rules.find((r) => r.id === id);
      if (!current) return;
      const res = await apiUpdateLabel(id, { enabled: !current.enabled });
      setRules((prev) => prev.map((r) => (r.id === id ? res.rule : r)));
    },
    [rules],
  );

  const reset = useCallback(async () => {
    const res = await resetLabels();
    setRules(res.rules);
  }, []);

  const importRules = useCallback(
    async (incoming: Omit<LabelRule, "id" | "createdAt">[]) => {
      const res = await importLabels(incoming);
      setRules(res.rules);
    },
    [],
  );

  return {
    rules,
    loading,
    error,
    add,
    update,
    remove,
    toggle,
    reset,
    importRules,
  };
}
