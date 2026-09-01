import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { SpamProviderResult } from "@/api/client";

interface ScoutDataCardProps {
  data: SpamProviderResult;
}

// Human-friendly labels for Scout's raw snake_case fields. Anything Scout
// adds later that isn't listed here still renders — see FIELD_ORDER below.
const FIELD_LABELS: Record<string, string> = {
  risk_level: "Risk Level",
  risk_rating: "Risk Rating",
  operating_company_name: "Carrier",
  operating_company_type: "Carrier Type",
  line_type: "Line Type",
  ported: "Ported",
  ported_date: "Ported Date",
  location_routing_number: "LRN",
  dialcode_e164: "E.164",
  dialcode_invalid: "Invalid Number",
  dialcode_impossible: "Impossible Number",
  country: "Country",
  country_short: "Country Code",
  administrative_area_level_1: "State/Province",
  administrative_area_level_2: "County",
  administrative_area_level_3: "Administrative Area 3",
  locality: "City",
  neighborhood: "Neighborhood",
  sublocality_level_1: "Sublocality",
  point_of_interest: "Point of Interest",
  postal_code: "Postal Code",
  region: "Region",
  sub_region: "Sub-Region",
  timezone: "Timezone",
  timezone_short: "Timezone (Short)",
  timezone_utc_offset: "UTC Offset",
  lata: "LATA",
  ocn: "OCN",
  clli: "CLLI",
  switch_assignment_date: "Switch Assignment Date",
  notes: "Notes",
};

// Preferred display order; anything present but not listed here is
// appended afterward so new Scout fields still show up.
const FIELD_ORDER = Object.keys(FIELD_LABELS);

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function formatLabel(key: string): string {
  return (
    FIELD_LABELS[key] ??
    key
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ")
  );
}

export function ScoutDataCard({ data }: ScoutDataCardProps) {
  const skip = new Set(["isSpam", "error"]);
  const keys = Object.keys(data).filter((k) => !skip.has(k));
  const ordered = [
    ...FIELD_ORDER.filter((k) => keys.includes(k)),
    ...keys.filter((k) => !FIELD_ORDER.includes(k)),
  ];

  if (ordered.length === 0) return null;

  return (
    <Card size="sm" className="max-w-xl">
      <CardHeader>
        <CardTitle>Scout (IceHook) Data</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          {ordered.map((key) => (
            <div key={key} className="contents">
              <dt className="text-muted-foreground">{formatLabel(key)}</dt>
              <dd className="font-mono">{formatValue(data[key])}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
