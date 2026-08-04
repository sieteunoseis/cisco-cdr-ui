import type { CdrResult } from "@/hooks/useSearch";
import type { LabelField, LabelRule, PaletteKey } from "@/hooks/useLabelRules";

const FIELD_MAP: Record<LabelField, keyof CdrResult> = {
  calling: "callingpartynumber",
  called: "finalcalledpartynumber",
  origDevice: "origdevicename",
  destDevice: "destdevicename",
};

// Tailwind v4 JIT needs full literal class strings — do not interpolate.
export const BADGE_PALETTE: Record<PaletteKey, string> = {
  gray: "bg-gray-500/15 text-gray-400 border-gray-500/25",
  blue: "bg-blue-500/15 text-blue-400 border-blue-500/25",
  orange: "bg-orange-500/15 text-orange-400 border-orange-500/25",
  green: "bg-green-500/15 text-green-400 border-green-500/25",
  red: "bg-red-500/15 text-red-400 border-red-500/25",
  purple: "bg-purple-500/15 text-purple-400 border-purple-500/25",
  yellow: "bg-yellow-500/15 text-yellow-400 border-yellow-500/25",
};

export function matchLabelRules(
  record: CdrResult,
  rules: LabelRule[],
): LabelRule[] {
  return rules.filter((rule) => {
    let re: RegExp;
    try {
      re = new RegExp(rule.pattern, "i");
    } catch {
      return false; // invalid user regex — skip, don't throw
    }
    return rule.fields.some((field) =>
      re.test(String(record[FIELD_MAP[field]] ?? "")),
    );
  });
}

const VALID_FIELDS: readonly string[] = [
  "calling",
  "called",
  "origDevice",
  "destDevice",
];
const VALID_COLORS: readonly string[] = [
  "gray",
  "blue",
  "orange",
  "green",
  "red",
  "purple",
  "yellow",
];

function isImportedRuleShape(
  item: unknown,
): item is Omit<LabelRule, "id" | "createdAt"> {
  if (typeof item !== "object" || item === null) return false;
  const r = item as Record<string, unknown>;
  return (
    typeof r.label === "string" &&
    typeof r.pattern === "string" &&
    typeof r.enabled === "boolean" &&
    typeof r.color === "string" &&
    VALID_COLORS.includes(r.color) &&
    Array.isArray(r.fields) &&
    r.fields.length > 0 &&
    r.fields.every((f) => typeof f === "string" && VALID_FIELDS.includes(f))
  );
}

export function parseImportedRules(
  json: string,
): Omit<LabelRule, "id" | "createdAt">[] | null {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return null;
  }
  if (!Array.isArray(data)) return null;
  return data.filter(isImportedRuleShape);
}
