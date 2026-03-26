# cucm-cdr-dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a React SPA dashboard for searching, analyzing, and querying CUCM CDR data from the cisco-cucm-cdr backend API.

**Architecture:** Vite-built React SPA served by nginx in Docker. Three pages (Search, Call Detail, SQL) consume the cisco-cucm-cdr REST API via fetch. No backend — pure static files with runtime API URL injection.

**Tech Stack:** Vite, React 19, TypeScript, Tailwind CSS 4, shadcn/ui, React Router, Monaco Editor, sql-formatter

---

## File Map

| File                                       | Action | Responsibility                        |
| ------------------------------------------ | ------ | ------------------------------------- |
| `package.json`                             | Create | Dependencies and scripts              |
| `vite.config.ts`                           | Create | Vite config with proxy for dev        |
| `tailwind.config.ts`                       | Create | Tailwind + shadcn theme config        |
| `tsconfig.json`                            | Create | TypeScript config                     |
| `components.json`                          | Create | shadcn/ui CLI config                  |
| `index.html`                               | Create | HTML entry point                      |
| `src/main.tsx`                             | Create | React entry + theme init              |
| `src/App.tsx`                              | Create | Router + layout shell                 |
| `src/globals.css`                          | Create | Tailwind directives + CSS vars        |
| `src/api/client.ts`                        | Create | Fetch wrapper with base URL           |
| `src/lib/utils.ts`                         | Create | shadcn cn() utility                   |
| `src/lib/format.ts`                        | Create | Duration, timestamp, phone formatters |
| `src/lib/quality.ts`                       | Create | MOS → quality grade mapping           |
| `src/hooks/useTheme.ts`                    | Create | Dark/light mode with localStorage     |
| `src/hooks/useSearch.ts`                   | Create | Search state + API integration        |
| `src/hooks/useCallDetail.ts`               | Create | Trace API call                        |
| `src/hooks/useSqlQuery.ts`                 | Create | SQL execution state                   |
| `src/hooks/useSavedQueries.ts`             | Create | localStorage CRUD for queries         |
| `src/components/layout/Header.tsx`         | Create | Nav tabs + theme toggle               |
| `src/components/layout/Layout.tsx`         | Create | Shell layout wrapper                  |
| `src/components/search/SearchBar.tsx`      | Create | Debounced search input                |
| `src/components/search/TimeRange.tsx`      | Create | Preset buttons + custom picker        |
| `src/components/search/FilterChips.tsx`    | Create | Active filter chips                   |
| `src/components/search/ResultRow.tsx`      | Create | Single CDR result row                 |
| `src/components/detail/CallHeader.tsx`     | Create | Call summary header                   |
| `src/components/detail/EnrichmentCard.tsx` | Create | Orig/dest device info                 |
| `src/components/detail/CallPath.tsx`       | Create | Call legs accordion                   |
| `src/components/detail/QualityCard.tsx`    | Create | CMR quality metrics                   |
| `src/components/detail/CollectLogs.tsx`    | Create | DIME command display                  |
| `src/components/detail/RawCdr.tsx`         | Create | Full CDR key-value table              |
| `src/components/sql/SqlEditor.tsx`         | Create | Monaco editor wrapper                 |
| `src/components/sql/SqlResults.tsx`        | Create | Auto-generated results table          |
| `src/components/sql/SavedQueries.tsx`      | Create | Saved queries sidebar                 |
| `src/pages/SearchPage.tsx`                 | Create | Search page composition               |
| `src/pages/CallDetailPage.tsx`             | Create | Call detail composition               |
| `src/pages/SqlPage.tsx`                    | Create | SQL page composition                  |
| `Dockerfile`                               | Create | Multi-stage build                     |
| `nginx.conf`                               | Create | SPA serving config                    |
| `docker-entrypoint.sh`                     | Create | Runtime env injection                 |
| `.env.example`                             | Create | Environment template                  |
| `.gitignore`                               | Create | Git ignore rules                      |
| `README.md`                                | Create | Documentation                         |

---

### Task 1: Project Scaffolding

**Files:**

- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/globals.css`, `src/vite-env.d.ts`, `components.json`, `.gitignore`, `.env`, `.env.example`

- [ ] **Step 1: Initialize git repo**

```bash
cd /Users/wordenj/Developer/cucm-cdr-dashboard
git init
```

- [ ] **Step 2: Create the project with Vite**

```bash
cd /Users/wordenj/Developer/cucm-cdr-dashboard
npm create vite@latest . -- --template react-ts
```

Select "Ignore files and continue" if prompted about existing directory.

- [ ] **Step 3: Install core dependencies**

```bash
npm install react-router-dom @monaco-editor/react sql-formatter
npm install -D tailwindcss @tailwindcss/vite
```

- [ ] **Step 4: Configure Tailwind**

Replace `src/index.css` (rename to `src/globals.css`):

```css
@import "tailwindcss";

@custom-variant dark (&:is(.dark *));

:root {
  --background: 0 0% 100%;
  --foreground: 240 10% 3.9%;
  --card: 0 0% 100%;
  --card-foreground: 240 10% 3.9%;
  --popover: 0 0% 100%;
  --popover-foreground: 240 10% 3.9%;
  --primary: 240 5.9% 10%;
  --primary-foreground: 0 0% 98%;
  --secondary: 240 4.8% 95.9%;
  --secondary-foreground: 240 5.9% 10%;
  --muted: 240 4.8% 95.9%;
  --muted-foreground: 240 3.8% 46.1%;
  --accent: 240 4.8% 95.9%;
  --accent-foreground: 240 5.9% 10%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 0 0% 98%;
  --border: 240 5.9% 90%;
  --input: 240 5.9% 90%;
  --ring: 240 5.9% 10%;
  --radius: 0.5rem;
}

.dark {
  --background: 240 10% 3.9%;
  --foreground: 0 0% 98%;
  --card: 240 10% 3.9%;
  --card-foreground: 0 0% 98%;
  --popover: 240 10% 3.9%;
  --popover-foreground: 0 0% 98%;
  --primary: 0 0% 98%;
  --primary-foreground: 240 5.9% 10%;
  --secondary: 240 3.7% 15.9%;
  --secondary-foreground: 0 0% 98%;
  --muted: 240 3.7% 15.9%;
  --muted-foreground: 240 5% 64.9%;
  --accent: 240 3.7% 15.9%;
  --accent-foreground: 0 0% 98%;
  --destructive: 0 62.8% 30.6%;
  --destructive-foreground: 0 0% 98%;
  --border: 240 3.7% 15.9%;
  --input: 240 3.7% 15.9%;
  --ring: 240 4.9% 83.9%;
}

* {
  border-color: hsl(var(--border));
}

body {
  background-color: hsl(var(--background));
  color: hsl(var(--foreground));
  font-family:
    system-ui,
    -apple-system,
    sans-serif;
}
```

- [ ] **Step 5: Update vite.config.ts**

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: process.env.VITE_API_URL || "https://cucm-cdr.tuce.ohsu.edu",
        changeOrigin: true,
      },
    },
  },
});
```

- [ ] **Step 6: Configure shadcn/ui**

```bash
npx shadcn@latest init
```

When prompted:

- Style: Default
- Base color: Zinc
- CSS file: src/globals.css
- CSS variables: yes
- Tailwind config: tailwind.config.ts (if asked)
- Components alias: @/components
- Utils alias: @/lib/utils

Then install the components we need:

```bash
npx shadcn@latest add button input badge tabs accordion card separator scroll-area tooltip dialog dropdown-menu
```

- [ ] **Step 7: Create .env and .env.example**

`.env`:

```
VITE_API_URL=https://cucm-cdr.tuce.ohsu.edu
```

`.env.example`:

```
VITE_API_URL=https://cucm-cdr.tuce.ohsu.edu
```

- [ ] **Step 8: Update .gitignore**

```
node_modules/
dist/
.env
*.log
.DS_Store
```

- [ ] **Step 9: Create src/main.tsx**

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./globals.css";

// Apply theme before render to prevent flash
const stored = localStorage.getItem("theme");
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
if (stored === "dark" || (!stored && prefersDark)) {
  document.documentElement.classList.add("dark");
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
```

- [ ] **Step 10: Create src/App.tsx (minimal shell)**

```tsx
import { Routes, Route } from "react-router-dom";

function App() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border px-6 py-4">
        <h1 className="text-xl font-semibold">CDR Dashboard</h1>
      </header>
      <main className="p-6">
        <Routes>
          <Route path="/" element={<p>Search page coming soon</p>} />
          <Route
            path="/call/:callId"
            element={<p>Call detail coming soon</p>}
          />
          <Route path="/sql" element={<p>SQL page coming soon</p>} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
```

- [ ] **Step 11: Verify dev server starts**

```bash
npm run dev
```

Open http://localhost:5173 — should show "CDR Dashboard" header with dark background and "Search page coming soon" text.

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "feat: project scaffolding with Vite, React, Tailwind, shadcn/ui"
```

---

### Task 2: API Client, Utilities, and Theme Hook

**Files:**

- Create: `src/api/client.ts`, `src/lib/format.ts`, `src/lib/quality.ts`, `src/hooks/useTheme.ts`

- [ ] **Step 1: Create API client**

`src/api/client.ts`:

```typescript
const BASE_URL =
  (window as any).__ENV__?.API_URL || import.meta.env.VITE_API_URL || "";

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `API error: ${res.status}`);
  }
  return res.json();
}

export function searchCdr(params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  return apiFetch<{ count: number; results: any[] }>(
    `/api/v1/cdr/search?${qs}`,
  );
}

export function traceCdr(callId: string, callManagerId?: string) {
  const qs = callManagerId ? `?callmanager_id=${callManagerId}` : "";
  return apiFetch<{ cdr: any[]; cmr: any[]; sdl_trace_command: string | null }>(
    `/api/v1/cdr/trace/${callId}${qs}`,
  );
}

export function qualityCdr(params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  return apiFetch<{ count: number; results: any[] }>(
    `/api/v1/cdr/quality?${qs}`,
  );
}

export function executeSql(query: string) {
  return apiFetch<{
    columns: string[];
    rows: any[];
    count: number;
    duration_ms: number;
  }>("/api/v1/cdr/sql", { method: "POST", body: JSON.stringify({ query }) });
}

export function healthCheck() {
  return apiFetch<any>("/api/v1/health");
}
```

- [ ] **Step 2: Create format utilities**

`src/lib/format.ts`:

```typescript
export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return "0s";
  const s = Math.round(seconds);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  if (m < 60) return rem ? `${m}m ${rem}s` : `${m}m`;
  const h = Math.floor(m / 60);
  const remM = m % 60;
  return `${h}h ${remM}m`;
}

export function formatDurationFromInterval(
  interval: string | null | undefined,
): string {
  if (!interval) return "0s";
  // Postgres interval format: "00:02:30" or "2 mins 30 secs" etc.
  const hms = interval.match(/^(\d{2}):(\d{2}):(\d{2})$/);
  if (hms) {
    const totalSec =
      parseInt(hms[1]) * 3600 + parseInt(hms[2]) * 60 + parseInt(hms[3]);
    return formatDuration(totalSec);
  }
  return interval;
}

export function formatTimestamp(ts: string | null | undefined): string {
  if (!ts) return "N/A";
  const d = new Date(ts);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatRelativeTime(ts: string | null | undefined): string {
  if (!ts) return "N/A";
  const d = new Date(ts);
  const now = Date.now();
  const diff = Math.floor((now - d.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function formatPhoneNumber(num: string | null | undefined): string {
  if (!num) return "N/A";
  // Strip leading + or 1 for US numbers, then format
  const digits = num.replace(/\D/g, "");
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits[0] === "1") {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return num; // Return as-is for extensions, international, etc.
}
```

- [ ] **Step 3: Create quality utilities**

`src/lib/quality.ts`:

```typescript
export type QualityGrade = "good" | "fair" | "poor" | "ungraded";

export function mosToGrade(mos: number | null | undefined): QualityGrade {
  if (mos == null) return "ungraded";
  if (mos >= 3.5) return "good";
  if (mos >= 3.0) return "fair";
  return "poor";
}

export function gradeColor(grade: QualityGrade): string {
  switch (grade) {
    case "good":
      return "text-green-500";
    case "fair":
      return "text-yellow-500";
    case "poor":
      return "text-red-500";
    case "ungraded":
      return "text-muted-foreground";
  }
}

export function gradeBadgeVariant(
  grade: QualityGrade,
): "default" | "secondary" | "destructive" | "outline" {
  switch (grade) {
    case "good":
      return "default";
    case "fair":
      return "secondary";
    case "poor":
      return "destructive";
    case "ungraded":
      return "outline";
  }
}
```

- [ ] **Step 4: Create theme hook**

`src/hooks/useTheme.ts`:

```typescript
import { useState, useEffect } from "react";

type Theme = "light" | "dark";

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem("theme") as Theme | null;
    if (stored) return stored;
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggle = () => setThemeState((t) => (t === "dark" ? "light" : "dark"));

  return { theme, toggle };
}
```

- [ ] **Step 5: Verify API client works**

Open browser console at http://localhost:5173 and run:

```javascript
fetch("https://cucm-cdr.tuce.ohsu.edu/api/v1/health")
  .then((r) => r.json())
  .then(console.log);
```

Should return health JSON (verifies CORS is working).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: API client, format utilities, quality helpers, theme hook"
```

---

### Task 3: Layout and Header with Navigation

**Files:**

- Create: `src/components/layout/Header.tsx`, `src/components/layout/Layout.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create Header component**

`src/components/layout/Header.tsx`:

```tsx
import { Link, useLocation } from "react-router-dom";
import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
  { label: "Search", path: "/" },
  { label: "SQL", path: "/sql" },
];

export function Header() {
  const location = useLocation();
  const { theme, toggle } = useTheme();

  return (
    <header className="border-b border-border bg-card">
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-8">
          <Link to="/" className="text-lg font-semibold tracking-tight">
            CDR Dashboard
          </Link>
          <nav className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const isActive =
                item.path === "/"
                  ? location.pathname === "/" ||
                    location.pathname.startsWith("/call/")
                  : location.pathname.startsWith(item.path);
              return (
                <Link key={item.path} to={item.path}>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    size="sm"
                    className="text-sm"
                  >
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </nav>
        </div>
        <Button variant="ghost" size="sm" onClick={toggle}>
          {theme === "dark" ? "☀" : "☾"}
        </Button>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Create Layout component**

`src/components/layout/Layout.tsx`:

```tsx
import { Header } from "./Header";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto max-w-7xl px-6 py-6">{children}</main>
    </div>
  );
}
```

- [ ] **Step 3: Update App.tsx with layout and routes**

`src/App.tsx`:

```tsx
import { Routes, Route } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SearchPage } from "@/pages/SearchPage";
import { CallDetailPage } from "@/pages/CallDetailPage";
import { SqlPage } from "@/pages/SqlPage";

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<SearchPage />} />
        <Route path="/call/:callId" element={<CallDetailPage />} />
        <Route path="/sql" element={<SqlPage />} />
      </Routes>
    </Layout>
  );
}

export default App;
```

- [ ] **Step 4: Create placeholder pages**

`src/pages/SearchPage.tsx`:

```tsx
export function SearchPage() {
  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">Search CDR</h2>
      <p className="text-muted-foreground">Search interface coming next.</p>
    </div>
  );
}
```

`src/pages/CallDetailPage.tsx`:

```tsx
import { useParams } from "react-router-dom";

export function CallDetailPage() {
  const { callId } = useParams();
  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">Call Detail</h2>
      <p className="text-muted-foreground">Call ID: {callId}</p>
    </div>
  );
}
```

`src/pages/SqlPage.tsx`:

```tsx
export function SqlPage() {
  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">SQL Query</h2>
      <p className="text-muted-foreground">SQL editor coming soon.</p>
    </div>
  );
}
```

- [ ] **Step 5: Verify navigation works**

```bash
npm run dev
```

Open http://localhost:5173 — header shows "CDR Dashboard" with Search and SQL tabs. Click between tabs. Theme toggle switches dark/light. Navigating to `/call/12345` shows the call ID.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: layout shell with header navigation and theme toggle"
```

---

### Task 4: Search Page — Search Bar, Time Range, and Results

**Files:**

- Create: `src/components/search/SearchBar.tsx`, `src/components/search/TimeRange.tsx`, `src/components/search/ResultRow.tsx`, `src/hooks/useSearch.ts`
- Modify: `src/pages/SearchPage.tsx`

- [ ] **Step 1: Create useSearch hook**

`src/hooks/useSearch.ts`:

```typescript
import { useState, useCallback } from "react";
import { searchCdr } from "@/api/client";

export interface CdrResult {
  pkid: string;
  globalcallid_callid: string;
  globalcallid_callmanagerid: string;
  globalcallid_clusterid: string;
  callingpartynumber: string;
  finalcalledpartynumber: string;
  originalcalledpartynumber: string;
  origdevicename: string;
  destdevicename: string;
  datetimeorigination: string;
  datetimeconnect: string | null;
  datetimedisconnect: string;
  duration: string;
  origcause_value: number;
  origcause_description: string;
  destcause_value: number;
  destcause_description: string;
  orig_device_description: string | null;
  orig_device_user: string | null;
  orig_device_pool: string | null;
  orig_device_location: string | null;
  dest_device_description: string | null;
  dest_device_user: string | null;
  dest_device_pool: string | null;
  dest_device_location: string | null;
  orig_codec_description: string | null;
  enriched_at: string | null;
  [key: string]: any;
}

interface SearchState {
  results: CdrResult[];
  count: number;
  loading: boolean;
  error: string | null;
}

export function useSearch() {
  const [state, setState] = useState<SearchState>({
    results: [],
    count: 0,
    loading: false,
    error: null,
  });

  const search = useCallback(async (params: Record<string, string>) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await searchCdr(params);
      setState({
        results: data.results,
        count: data.count,
        loading: false,
        error: null,
      });
    } catch (err: any) {
      setState((s) => ({
        ...s,
        loading: false,
        error: err.message || "Search failed",
      }));
    }
  }, []);

  return { ...state, search };
}
```

- [ ] **Step 2: Create SearchBar component**

`src/components/search/SearchBar.tsx`:

```tsx
import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";

interface SearchBarProps {
  onSearch: (query: string) => void;
  loading?: boolean;
}

export function SearchBar({ onSearch, loading }: SearchBarProps) {
  const [value, setValue] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!value.trim()) return;
    timerRef.current = setTimeout(() => onSearch(value.trim()), 300);
    return () => clearTimeout(timerRef.current);
  }, [value, onSearch]);

  return (
    <div className="relative">
      <Input
        type="text"
        placeholder="Search by phone number, device name, or user ID..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="h-12 text-lg"
      />
      {loading && (
        <div className="absolute right-3 top-3 h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create TimeRange component**

`src/components/search/TimeRange.tsx`:

```tsx
import { Button } from "@/components/ui/button";

const PRESETS = [
  { label: "1h", value: "1h" },
  { label: "4h", value: "4h" },
  { label: "24h", value: "24h" },
  { label: "7d", value: "7d" },
  { label: "30d", value: "30d" },
];

interface TimeRangeProps {
  selected: string;
  onSelect: (value: string) => void;
}

export function TimeRange({ selected, onSelect }: TimeRangeProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Time range:</span>
      {PRESETS.map((p) => (
        <Button
          key={p.value}
          variant={selected === p.value ? "secondary" : "ghost"}
          size="sm"
          onClick={() => onSelect(p.value)}
        >
          {p.label}
        </Button>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Create ResultRow component**

`src/components/search/ResultRow.tsx`:

```tsx
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import {
  formatDurationFromInterval,
  formatRelativeTime,
  formatTimestamp,
} from "@/lib/format";
import { mosToGrade, gradeBadgeVariant } from "@/lib/quality";
import type { CdrResult } from "@/hooks/useSearch";

interface ResultRowProps {
  result: CdrResult;
}

export function ResultRow({ result }: ResultRowProps) {
  const navigate = useNavigate();
  const isConnected = result.datetimeconnect != null;
  const grade = mosToGrade(null); // CMR not in search results yet

  return (
    <div
      onClick={() =>
        navigate(
          `/call/${result.globalcallid_callid}?cm=${result.globalcallid_callmanagerid}`,
        )
      }
      className="flex items-center justify-between rounded-lg border border-border p-4 hover:bg-accent cursor-pointer transition-colors"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-sm font-mono">
          <span className="font-medium">
            {result.callingpartynumber || "N/A"}
          </span>
          <span className="text-muted-foreground">→</span>
          <span className="font-medium">
            {result.finalcalledpartynumber || "N/A"}
          </span>
        </div>
        {(result.orig_device_description || result.dest_device_description) && (
          <div className="mt-1 text-xs text-muted-foreground truncate">
            {result.orig_device_description || result.origdevicename}
            {" → "}
            {result.dest_device_description || result.destdevicename}
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 ml-4 shrink-0">
        <div className="text-right">
          <div className="text-sm font-medium">
            {formatDurationFromInterval(result.duration)}
          </div>
          <div
            className="text-xs text-muted-foreground"
            title={formatTimestamp(result.datetimeorigination)}
          >
            {formatRelativeTime(result.datetimeorigination)}
          </div>
        </div>

        <Badge variant={isConnected ? "default" : "destructive"}>
          {isConnected
            ? "Connected"
            : result.destcause_description || `Cause ${result.destcause_value}`}
        </Badge>

        <Badge variant={gradeBadgeVariant(grade)}>
          {grade === "ungraded"
            ? "Ungraded"
            : grade.charAt(0).toUpperCase() + grade.slice(1)}
        </Badge>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Compose SearchPage**

`src/pages/SearchPage.tsx`:

```tsx
import { useState, useCallback } from "react";
import { SearchBar } from "@/components/search/SearchBar";
import { TimeRange } from "@/components/search/TimeRange";
import { ResultRow } from "@/components/search/ResultRow";
import { useSearch } from "@/hooks/useSearch";
import { Button } from "@/components/ui/button";

export function SearchPage() {
  const [timeRange, setTimeRange] = useState("24h");
  const [limit, setLimit] = useState(100);
  const { results, count, loading, error, search } = useSearch();

  const handleSearch = useCallback(
    (query: string) => {
      search({
        calling: query,
        called: query,
        last: timeRange,
        limit: String(limit),
      });
    },
    [search, timeRange, limit],
  );

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <SearchBar onSearch={handleSearch} loading={loading} />
        <TimeRange selected={timeRange} onSelect={setTimeRange} />
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 p-4 text-destructive text-sm">
          {error}
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Showing {results.length} of {count} results
          </p>
          <div className="space-y-2">
            {results.map((r) => (
              <ResultRow key={r.pkid} result={r} />
            ))}
          </div>
          {results.length >= limit && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setLimit((l) => l + 100)}
            >
              Load more
            </Button>
          )}
        </div>
      )}

      {!loading && results.length === 0 && count === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          Search for a phone number, device name, or user ID to get started.
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Verify search works against live backend**

```bash
npm run dev
```

Open http://localhost:5173 — type a phone number in the search bar. Results should appear from the live backend with caller→called, duration, time, status badges.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: search page with search bar, time range, and result rows"
```

---

### Task 5: Call Detail Page

**Files:**

- Create: `src/hooks/useCallDetail.ts`, `src/components/detail/CallHeader.tsx`, `src/components/detail/EnrichmentCard.tsx`, `src/components/detail/CallPath.tsx`, `src/components/detail/QualityCard.tsx`, `src/components/detail/CollectLogs.tsx`, `src/components/detail/RawCdr.tsx`
- Modify: `src/pages/CallDetailPage.tsx`

- [ ] **Step 1: Create useCallDetail hook**

`src/hooks/useCallDetail.ts`:

```typescript
import { useState, useEffect } from "react";
import { traceCdr } from "@/api/client";

interface CallDetailState {
  cdr: any[];
  cmr: any[];
  sdlTraceCommand: string | null;
  loading: boolean;
  error: string | null;
}

export function useCallDetail(callId: string, callManagerId?: string) {
  const [state, setState] = useState<CallDetailState>({
    cdr: [],
    cmr: [],
    sdlTraceCommand: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    traceCdr(callId, callManagerId)
      .then((data) => {
        if (!cancelled) {
          setState({
            cdr: data.cdr,
            cmr: data.cmr,
            sdlTraceCommand: data.sdl_trace_command,
            loading: false,
            error: null,
          });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setState((s) => ({ ...s, loading: false, error: err.message }));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [callId, callManagerId]);

  return state;
}
```

- [ ] **Step 2: Create CallHeader component**

`src/components/detail/CallHeader.tsx`:

```tsx
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDurationFromInterval, formatTimestamp } from "@/lib/format";

interface CallHeaderProps {
  cdr: any;
}

export function CallHeader({ cdr }: CallHeaderProps) {
  const navigate = useNavigate();
  const isConnected = cdr.datetimeconnect != null;

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
        ← Back
      </Button>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-mono font-bold">
            {cdr.callingpartynumber || "N/A"}
            <span className="text-muted-foreground mx-3">→</span>
            {cdr.finalcalledpartynumber || "N/A"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {formatTimestamp(cdr.datetimeorigination)} —{" "}
            {formatDurationFromInterval(cdr.duration)}
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant={isConnected ? "default" : "destructive"}>
            {isConnected ? "Connected" : `Cause ${cdr.destcause_value}`}
          </Badge>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create EnrichmentCard component**

`src/components/detail/EnrichmentCard.tsx`:

```tsx
import { Card } from "@/components/ui/card";

interface EnrichmentCardProps {
  cdr: any;
}

function DeviceInfo({
  label,
  name,
  description,
  pool,
  location,
  user,
}: {
  label: string;
  name: string;
  description: string | null;
  pool: string | null;
  location: string | null;
  user: string | null;
}) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        {label}
      </h4>
      <div className="space-y-1">
        <p className="font-mono text-sm">{name}</p>
        {description && <p className="text-sm">{description}</p>}
        {pool && (
          <p className="text-xs text-muted-foreground">
            Pool: {pool} {location && `• Location: ${location}`}
          </p>
        )}
        {user && <p className="text-xs text-muted-foreground">User: {user}</p>}
        {!description && !pool && !user && (
          <p className="text-xs text-muted-foreground italic">Not enriched</p>
        )}
      </div>
    </div>
  );
}

export function EnrichmentCard({ cdr }: EnrichmentCardProps) {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Devices</h3>
      <div className="grid grid-cols-2 gap-8">
        <DeviceInfo
          label="Originating"
          name={cdr.origdevicename}
          description={cdr.orig_device_description}
          pool={cdr.orig_device_pool}
          location={cdr.orig_device_location}
          user={cdr.orig_device_user}
        />
        <DeviceInfo
          label="Destination"
          name={cdr.destdevicename}
          description={cdr.dest_device_description}
          pool={cdr.dest_device_pool}
          location={cdr.dest_device_location}
          user={cdr.dest_device_user}
        />
      </div>
    </Card>
  );
}
```

- [ ] **Step 4: Create CallPath component**

`src/components/detail/CallPath.tsx`:

```tsx
import { Card } from "@/components/ui/card";

interface CallPathProps {
  legs: any[];
}

export function CallPath({ legs }: CallPathProps) {
  if (legs.length === 0) return null;

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Call Path</h3>
      <div className="space-y-0">
        {legs.map((leg, i) => (
          <div key={leg.pkid || i} className="flex items-start gap-4">
            <div className="flex flex-col items-center">
              <div className="h-3 w-3 rounded-full bg-primary" />
              {i < legs.length - 1 && <div className="w-0.5 h-12 bg-border" />}
            </div>
            <div className="pb-6">
              <p className="font-mono text-sm">
                {leg.origdevicename} → {leg.destdevicename}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Cause: {leg.destcause_description || leg.destcause_value}
                {leg.currentroutingreason_text &&
                  ` • Routing: ${leg.currentroutingreason_text}`}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
```

- [ ] **Step 5: Create QualityCard component**

`src/components/detail/QualityCard.tsx`:

```tsx
import { Card } from "@/components/ui/card";
import { mosToGrade, gradeColor } from "@/lib/quality";

interface QualityCardProps {
  cmr: any[];
}

export function QualityCard({ cmr }: QualityCardProps) {
  if (cmr.length === 0) return null;

  // Use the first CMR record with MOS data
  const withMos = cmr.find((c) => c.moslqk != null) || cmr[0];
  const grade = mosToGrade(withMos.moslqk);

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Quality</h3>
      <div className="grid grid-cols-4 gap-6">
        <div className="text-center">
          <p className={`text-4xl font-bold ${gradeColor(grade)}`}>
            {withMos.moslqk != null ? Number(withMos.moslqk).toFixed(1) : "N/A"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">MOS Score</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-semibold">{withMos.jitter ?? "N/A"}</p>
          <p className="text-xs text-muted-foreground mt-1">Jitter (ms)</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-semibold">{withMos.latency ?? "N/A"}</p>
          <p className="text-xs text-muted-foreground mt-1">Latency (ms)</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-semibold">
            {withMos.numberpacketslost ?? "N/A"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Packets Lost</p>
        </div>
      </div>
    </Card>
  );
}
```

- [ ] **Step 6: Create CollectLogs component**

`src/components/detail/CollectLogs.tsx`:

```tsx
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface CollectLogsProps {
  sdlTraceCommand: string | null;
}

export function CollectLogs({ sdlTraceCommand }: CollectLogsProps) {
  const [copied, setCopied] = useState(false);

  if (!sdlTraceCommand) return null;

  const copy = () => {
    navigator.clipboard.writeText(sdlTraceCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-2">Collect Logs</h3>
      <p className="text-sm text-muted-foreground mb-3">
        Run this command with cisco-dime to collect SDL/SDI traces for this
        call.
      </p>
      <div className="flex items-center gap-2">
        <code className="flex-1 rounded bg-muted px-3 py-2 text-sm font-mono break-all">
          {sdlTraceCommand}
        </code>
        <Button variant="outline" size="sm" onClick={copy}>
          {copied ? "Copied!" : "Copy"}
        </Button>
      </div>
    </Card>
  );
}
```

- [ ] **Step 7: Create RawCdr component**

`src/components/detail/RawCdr.tsx`:

```tsx
import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";

interface RawCdrProps {
  cdr: any;
}

export function RawCdr({ cdr }: RawCdrProps) {
  const [filter, setFilter] = useState("");
  const entries = Object.entries(cdr).filter(
    ([key, val]) =>
      val != null &&
      val !== "" &&
      key.toLowerCase().includes(filter.toLowerCase()),
  );

  return (
    <Accordion type="single" collapsible>
      <AccordionItem value="raw">
        <AccordionTrigger>
          Raw CDR ({Object.keys(cdr).length} fields)
        </AccordionTrigger>
        <AccordionContent>
          <Input
            placeholder="Filter fields..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="mb-3"
          />
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <tbody>
                {entries.map(([key, val]) => (
                  <tr key={key} className="border-b border-border">
                    <td className="py-1 pr-4 font-mono text-muted-foreground whitespace-nowrap">
                      {key}
                    </td>
                    <td className="py-1 font-mono break-all">{String(val)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
```

- [ ] **Step 8: Compose CallDetailPage**

`src/pages/CallDetailPage.tsx`:

```tsx
import { useParams, useSearchParams } from "react-router-dom";
import { useCallDetail } from "@/hooks/useCallDetail";
import { CallHeader } from "@/components/detail/CallHeader";
import { EnrichmentCard } from "@/components/detail/EnrichmentCard";
import { CallPath } from "@/components/detail/CallPath";
import { QualityCard } from "@/components/detail/QualityCard";
import { CollectLogs } from "@/components/detail/CollectLogs";
import { RawCdr } from "@/components/detail/RawCdr";

export function CallDetailPage() {
  const { callId } = useParams();
  const [searchParams] = useSearchParams();
  const callManagerId = searchParams.get("cm") || undefined;
  const { cdr, cmr, sdlTraceCommand, loading, error } = useCallDetail(
    callId!,
    callManagerId,
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-destructive/10 p-4 text-destructive text-sm">
        {error}
      </div>
    );
  }

  if (cdr.length === 0) {
    return (
      <p className="text-muted-foreground">
        No CDR records found for this call.
      </p>
    );
  }

  const primary = cdr[0];

  return (
    <div className="space-y-6">
      <CallHeader cdr={primary} />
      <EnrichmentCard cdr={primary} />
      <CallPath legs={cdr} />
      <QualityCard cmr={cmr} />
      <CollectLogs sdlTraceCommand={sdlTraceCommand} />
      <RawCdr cdr={primary} />
    </div>
  );
}
```

- [ ] **Step 9: Verify call detail works**

```bash
npm run dev
```

Search for a call, click a result row — should navigate to the call detail page showing header, enrichment card, call path, quality metrics, collect logs command, and raw CDR accordion.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: call detail page with enrichment, quality, call path, collect logs"
```

---

### Task 6: SQL Page — Editor, Saved Queries, Results

**Files:**

- Create: `src/hooks/useSqlQuery.ts`, `src/hooks/useSavedQueries.ts`, `src/components/sql/SqlEditor.tsx`, `src/components/sql/SqlResults.tsx`, `src/components/sql/SavedQueries.tsx`
- Modify: `src/pages/SqlPage.tsx`

- [ ] **Step 1: Create useSqlQuery hook**

`src/hooks/useSqlQuery.ts`:

```typescript
import { useState, useCallback } from "react";
import { executeSql } from "@/api/client";

interface SqlQueryState {
  columns: string[];
  rows: any[];
  count: number;
  durationMs: number;
  loading: boolean;
  error: string | null;
}

export function useSqlQuery() {
  const [state, setState] = useState<SqlQueryState>({
    columns: [],
    rows: [],
    count: 0,
    durationMs: 0,
    loading: false,
    error: null,
  });

  const execute = useCallback(async (query: string) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await executeSql(query);
      setState({
        columns: data.columns,
        rows: data.rows,
        count: data.count,
        durationMs: data.duration_ms,
        loading: false,
        error: null,
      });
    } catch (err: any) {
      setState((s) => ({
        ...s,
        loading: false,
        error: err.message || "Query failed",
      }));
    }
  }, []);

  const clear = useCallback(() => {
    setState({
      columns: [],
      rows: [],
      count: 0,
      durationMs: 0,
      loading: false,
      error: null,
    });
  }, []);

  return { ...state, execute, clear };
}
```

- [ ] **Step 2: Create useSavedQueries hook**

`src/hooks/useSavedQueries.ts`:

```typescript
import { useState, useCallback } from "react";

export interface SavedQuery {
  id: string;
  name: string;
  query: string;
  createdAt: string;
}

const STORAGE_KEY = "cdr-saved-queries";

const DEFAULT_QUERIES: SavedQuery[] = [
  {
    id: "default-1",
    name: "Calls by hour (last 24h)",
    query: `SELECT date_trunc('hour', datetimeorigination) AS hour, count(*)\nFROM cdr_basic\nWHERE datetimeorigination > now() - interval '24 hours'\nGROUP BY hour\nORDER BY hour`,
    createdAt: new Date().toISOString(),
  },
  {
    id: "default-2",
    name: "Top callers today",
    query: `SELECT callingpartynumber, count(*) AS calls\nFROM cdr_basic\nWHERE datetimeorigination > now() - interval '24 hours'\nGROUP BY callingpartynumber\nORDER BY calls DESC\nLIMIT 20`,
    createdAt: new Date().toISOString(),
  },
  {
    id: "default-3",
    name: "Failed calls today",
    query: `SELECT origdevicename, destdevicename, callingpartynumber, finalcalledpartynumber, destcause\nFROM cdr_augmented\nWHERE destcause != 'Normal call clearing'\n  AND datetimeorigination > now() - interval '24 hours'`,
    createdAt: new Date().toISOString(),
  },
  {
    id: "default-4",
    name: "Enriched devices",
    query: `SELECT origdevicename, orig_device_description, orig_device_pool, orig_device_location\nFROM cdr_basic\nWHERE enriched_at IS NOT NULL\n  AND orig_device_description != ''\nLIMIT 50`,
    createdAt: new Date().toISOString(),
  },
];

function loadQueries(): SavedQuery[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  // First visit: seed with defaults
  localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_QUERIES));
  return DEFAULT_QUERIES;
}

export function useSavedQueries() {
  const [queries, setQueries] = useState<SavedQuery[]>(loadQueries);

  const save = useCallback((name: string, query: string) => {
    const newQuery: SavedQuery = {
      id: crypto.randomUUID(),
      name,
      query,
      createdAt: new Date().toISOString(),
    };
    setQueries((prev) => {
      const updated = [newQuery, ...prev];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const remove = useCallback((id: string) => {
    setQueries((prev) => {
      const updated = prev.filter((q) => q.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const rename = useCallback((id: string, newName: string) => {
    setQueries((prev) => {
      const updated = prev.map((q) =>
        q.id === id ? { ...q, name: newName } : q,
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  return { queries, save, remove, rename };
}
```

- [ ] **Step 3: Create SqlEditor component**

`src/components/sql/SqlEditor.tsx`:

```tsx
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

  const handleMount: OnMount = (editor) => {
    editorRef.current = editor;
    editor.addCommand(
      // Cmd+Enter / Ctrl+Enter
      editor.KeyMod.CtrlCmd | editor.KeyCode.Enter,
      onRun,
    );
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
```

- [ ] **Step 4: Create SqlResults component**

`src/components/sql/SqlResults.tsx`:

```tsx
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";

interface SqlResultsProps {
  columns: string[];
  rows: any[];
  count: number;
  durationMs: number;
  error: string | null;
}

export function SqlResults({
  columns,
  rows,
  count,
  durationMs,
  error,
}: SqlResultsProps) {
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  const sorted = useMemo(() => {
    if (!sortCol) return rows;
    return [...rows].sort((a, b) => {
      const av = a[sortCol] ?? "";
      const bv = b[sortCol] ?? "";
      const cmp = String(av).localeCompare(String(bv), undefined, {
        numeric: true,
      });
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
          .map((c) => `"${String(r[c] ?? "").replace(/"/g, '""')}"`)
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

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {count} rows in {durationMs}ms
        </p>
        <Button variant="outline" size="sm" onClick={exportCsv}>
          Export CSV
        </Button>
      </div>
      <div className="rounded-lg border border-border overflow-auto max-h-[500px]">
        <table className="w-full text-sm">
          <thead className="bg-muted sticky top-0">
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
              <tr key={i} className="border-t border-border hover:bg-accent/50">
                {columns.map((col) => (
                  <td
                    key={col}
                    className="px-3 py-1.5 font-mono text-xs whitespace-nowrap"
                  >
                    {row[col] != null ? String(row[col]) : ""}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create SavedQueries component**

`src/components/sql/SavedQueries.tsx`:

```tsx
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { SavedQuery } from "@/hooks/useSavedQueries";

interface SavedQueriesProps {
  queries: SavedQuery[];
  onSelect: (query: string) => void;
  onDelete: (id: string) => void;
}

export function SavedQueries({
  queries,
  onSelect,
  onDelete,
}: SavedQueriesProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        Saved Queries
      </h3>
      <ScrollArea className="h-[600px]">
        <div className="space-y-1">
          {queries.map((q) => (
            <div
              key={q.id}
              className="group flex items-center justify-between rounded-md px-3 py-2 hover:bg-accent cursor-pointer"
              onClick={() => onSelect(q.query)}
            >
              <span className="text-sm truncate">{q.name}</span>
              <Button
                variant="ghost"
                size="sm"
                className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(q.id);
                }}
              >
                ×
              </Button>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
```

- [ ] **Step 6: Compose SqlPage**

`src/pages/SqlPage.tsx`:

```tsx
import { useState, useCallback } from "react";
import { SqlEditor } from "@/components/sql/SqlEditor";
import { SqlResults } from "@/components/sql/SqlResults";
import { SavedQueries } from "@/components/sql/SavedQueries";
import { useSqlQuery } from "@/hooks/useSqlQuery";
import { useSavedQueries } from "@/hooks/useSavedQueries";

export function SqlPage() {
  const [query, setQuery] = useState("");
  const { columns, rows, count, durationMs, loading, error, execute, clear } =
    useSqlQuery();
  const { queries, save, remove } = useSavedQueries();

  const handleRun = useCallback(() => {
    if (query.trim()) execute(query);
  }, [query, execute]);

  const handleSave = useCallback(() => {
    const name = prompt("Query name:");
    if (name) save(name, query);
  }, [query, save]);

  return (
    <div className="flex gap-6">
      <div className="w-56 shrink-0">
        <SavedQueries queries={queries} onSelect={setQuery} onDelete={remove} />
      </div>
      <div className="flex-1 space-y-4">
        <SqlEditor
          value={query}
          onChange={setQuery}
          onRun={handleRun}
          onSave={handleSave}
          loading={loading}
        />
        <SqlResults
          columns={columns}
          rows={rows}
          count={count}
          durationMs={durationMs}
          error={error}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Verify SQL page works**

```bash
npm run dev
```

Navigate to http://localhost:5173/sql — saved queries sidebar should show 4 defaults. Click one, click Run. Results table should appear with data from the live backend. Test Format button. Test Export CSV.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: SQL page with Monaco editor, saved queries, results table"
```

---

### Task 7: Docker, README, and Final Polish

**Files:**

- Create: `Dockerfile`, `nginx.conf`, `docker-entrypoint.sh`, `README.md`

- [ ] **Step 1: Create nginx.conf**

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

- [ ] **Step 2: Create docker-entrypoint.sh**

```bash
#!/bin/sh
# Replace placeholder with runtime API_URL
if [ -n "$API_URL" ]; then
  find /usr/share/nginx/html/assets -name '*.js' -exec \
    sed -i "s|__VITE_API_URL__|${API_URL}|g" {} +
fi
exec nginx -g 'daemon off;'
```

- [ ] **Step 3: Create Dockerfile**

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN VITE_API_URL=__VITE_API_URL__ npm run build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
COPY --from=build /app/dist /usr/share/nginx/html
ENTRYPOINT ["/docker-entrypoint.sh"]
```

- [ ] **Step 4: Create README.md**

````markdown
# cucm-cdr-dashboard

A web dashboard for searching, analyzing, and querying Cisco CUCM Call Detail Records.

Optional frontend for [cisco-cucm-cdr](https://github.com/sieteunoseis/cisco-cucm-cdr) (v1.2.0+).

## Features

- **Search** — Find calls by phone number, device name, or user ID with time range filters
- **Call Detail** — Full call trace with enrichment data, quality metrics, call path, and SDL trace command
- **SQL Query** — Run custom SQL queries with Monaco editor, formatting, saved queries, and CSV export

## Quick Start

### Development

Requires a running [cisco-cucm-cdr](https://github.com/sieteunoseis/cisco-cucm-cdr) backend.

```bash
cp .env.example .env
# Edit .env to point at your backend
npm install
npm run dev
```
````

### Docker

```bash
docker run -p 8080:80 -e API_URL=https://your-cdr-backend ghcr.io/sieteunoseis/cucm-cdr-dashboard:latest
```

### Docker Compose (with backend)

```yaml
services:
  dashboard:
    image: ghcr.io/sieteunoseis/cucm-cdr-dashboard:latest
    ports:
      - "8080:80"
    environment:
      - API_URL=http://cdr-processor:3000

  cdr-processor:
    image: ghcr.io/sieteunoseis/cisco-cucm-cdr:latest
    environment:
      - DATABASE_URL=postgresql://...
```

## Configuration

| Variable       | Default | Description                      |
| -------------- | ------- | -------------------------------- |
| `VITE_API_URL` | (none)  | Backend API URL (build time)     |
| `API_URL`      | (none)  | Backend API URL (Docker runtime) |

## Tech Stack

Vite, React, TypeScript, Tailwind CSS, shadcn/ui, Monaco Editor, sql-formatter

## License

MIT

````

- [ ] **Step 5: Make entrypoint executable and verify build**

```bash
chmod +x docker-entrypoint.sh
npm run build
````

Expected: `dist/` directory with built static files.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: Docker setup, nginx config, README"
```
