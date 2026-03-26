# cucm-cdr-dashboard Design Spec

## Overview

A standalone React SPA for searching, analyzing, and querying Cisco CUCM CDR data. Connects to the [cisco-cucm-cdr](https://github.com/sieteunoseis/cisco-cucm-cdr) backend REST API. Deployed as a separate Docker container — users who don't need a UI don't deploy it.

## Architecture

```
Browser → nginx (port 8080) → static React app
                                    ↓ fetch()
                          cisco-cucm-cdr API (port 3000)
```

- **Frontend:** Vite + React + TypeScript + Tailwind CSS + shadcn/ui + Monaco editor
- **Backend:** Existing cisco-cucm-cdr Express API (two additions needed: CORS + SQL endpoint)
- **No frontend backend** — pure static files served by nginx
- **API URL** configurable via `VITE_API_URL` env var (build time) and runtime injection via `window.__ENV__` for Docker

## Theme

- Dark mode by default, matching UC tooling aesthetic
- Light mode available via toggle in header
- Respects system preference on first visit (`prefers-color-scheme`)
- Persists user choice in localStorage
- Uses shadcn/ui theming (CSS variables for colors, Tailwind `dark:` variant)

## Pages

### 1. Search Page (default route: `/`)

The primary interface. Search-first design — not a dense spreadsheet.

**Search bar:**

- Single input accepting phone numbers, device names, or user IDs
- Debounced (300ms), hits `GET /api/v1/cdr/search`
- Passes input as `calling` and `called` params simultaneously (search both directions)

**Time range:**

- Preset buttons: 1h, 4h, 24h, 7d, 30d
- Custom date/time range picker (shadcn DatePicker)
- Defaults to last 24h

**Filter chips:**

- Appear above results after first search
- Available filters: cluster, call status (connected/failed), quality grade, cause code
- Removable chips, cumulative filtering
- Filters narrow the existing result set client-side where possible, re-query for time changes

**Results list:**

- Condensed rows (not a full 20-column table). Each row shows:
  - Caller number → Called number (with arrow icon)
  - Device descriptions from enrichment in smaller muted text below numbers
  - Duration (human readable: "2m 30s")
  - Start time (relative: "5 min ago" with full timestamp on hover)
  - Status badge: green "Connected" or red cause code description
  - Quality badge: "Good" (green) / "Fair" (yellow) / "Poor" (red) / "Ungraded" (gray) — derived from MOS score in CMR if available
- Click a row → navigates to `/call/:callId`
- Pagination: "Load more" button at bottom (increases limit param)
- Result count shown: "Showing 100 of 312 results"

### 2. Call Detail Page (route: `/call/:callId`)

Full detail view for a single call. Uses `GET /api/v1/cdr/trace/:callId`.

**Header:**

- Back button to search results
- Caller → Called (large text)
- Duration, start time → end time
- Status badge, quality badge

**Enrichment card:**

- Two columns: Originating / Destination
- Each shows: device name, description, device pool, location, user ID
- Grayed out fields if not enriched

**Call Path accordion:**

- Chains CDR legs from the trace endpoint by `globalcallid_callid`
- Each leg shown as a step: `Device A → Device B`
- Shows: cause code, routing reason, timestamps per leg
- Visual vertical flow (not a table)

**Quality card (from CMR):**

- MOS score as a large number with color (green >3.5, yellow 3.0-3.5, red <3.0)
- Jitter, latency, packet loss metrics
- Only shown if CMR data exists for this call

**Collect Logs section:**

- Displays the `sdl_trace_command` from the trace endpoint
- Copy-to-clipboard button
- Explanation text: "Run this command with cisco-dime to collect SDL/SDI traces"

**Raw CDR accordion:**

- Collapsible section at the bottom
- Full CDR record as a key-value table (all 133+ fields)
- Searchable/filterable within the accordion

### 3. SQL Page (route: `/sql`)

Free-form SQL query interface for power users.

**Query editor:**

- Monaco editor (same engine as VS Code)
- SQL syntax highlighting and autocomplete for table/view names
- Dark/light theme matches app theme
- "Run" button (also Cmd+Enter / Ctrl+Enter keyboard shortcut)
- "Format" button — prettifies SQL using `sql-formatter` library (runs client-side)
- "Clear" button

**Results area:**

- Auto-generated data table from query results
- Column headers from result set
- Sortable columns (client-side)
- Row count shown
- Export to CSV button
- Error display if query fails (syntax error, timeout, etc.)

**Saved queries sidebar:**

- Collapsible panel on the left
- Stored in localStorage as JSON array of `{ name, query, createdAt }`
- Save current query (prompts for name)
- Click to load, rename, delete
- Pre-loaded defaults on first visit:
  - "Calls by hour (last 24h)" — `SELECT date_trunc('hour', datetimeorigination) AS hour, count(*) FROM cdr_basic WHERE datetimeorigination > now() - interval '24 hours' GROUP BY hour ORDER BY hour`
  - "Top callers today" — `SELECT callingpartynumber, count(*) AS calls FROM cdr_basic WHERE datetimeorigination > now() - interval '24 hours' GROUP BY callingpartynumber ORDER BY calls DESC LIMIT 20`
  - "Poor quality calls" — `SELECT origdevicename, destdevicename, callingpartynumber, finalcalledpartynumber FROM cdr_augmented WHERE destcause != 'Normal call clearing' AND datetimeorigination > now() - interval '24 hours'`
  - "Enriched devices" — `SELECT origdevicename, orig_device_description, orig_device_pool, orig_device_location FROM cdr_basic WHERE enriched_at IS NOT NULL AND orig_device_description != '' LIMIT 50`

## Backend Changes (cisco-cucm-cdr repo)

### 1. CORS Headers

Add CORS middleware to `src/api/rest-server.js`. Allow all origins in development, configurable `CORS_ORIGIN` env var for production.

### 2. SQL Query Endpoint

`POST /api/v1/cdr/sql`

Request body:

```json
{
  "query": "SELECT * FROM cdr_basic LIMIT 10"
}
```

Response:

```json
{
  "columns": ["pkid", "callingpartynumber", ...],
  "rows": [...],
  "count": 10,
  "duration_ms": 45
}
```

**Validation (server-side):**

1. Strip SQL comments (`--`, `/* */`)
2. Trim whitespace
3. Verify the first keyword is `SELECT` (case-insensitive)
4. Reject if statement contains: `INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, `TRUNCATE`, `CREATE`, `GRANT`, `REVOKE`, `EXECUTE`, `EXEC` as standalone keywords
5. Enforce a query timeout (30 seconds)
6. Enforce a result limit (max 10,000 rows, append `LIMIT 10000` if no LIMIT clause present)

**Error responses:**

- 400: "Only SELECT queries are allowed"
- 400: "Query contains prohibited keywords"
- 408: "Query timed out (30s limit)"
- 500: Postgres error message

## Docker

**Dockerfile:** Multi-stage build

1. Stage 1: `node:20-alpine` — install deps, build Vite app
2. Stage 2: `nginx:alpine` — copy built static files, nginx config

**nginx config:**

- Serves static files from `/usr/share/nginx/html`
- SPA fallback: all routes → `index.html`
- No API proxying (frontend calls backend directly via CORS)

**Runtime env injection:**

- Entrypoint script replaces `__VITE_API_URL__` placeholder in built JS with actual `API_URL` env var at container start
- This allows the same Docker image to point at different backends without rebuilding

**docker-compose.yml (for standalone dev):**

```yaml
services:
  dashboard:
    build: .
    ports:
      - "8080:80"
    environment:
      - API_URL=http://localhost:3000
```

**docker-compose.with-backend.yml (full stack example):**

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
    # ... existing backend config
```

## Project Structure

```
cucm-cdr-dashboard/
├── src/
│   ├── main.tsx                    # Entry point
│   ├── App.tsx                     # Router + layout
│   ├── api/
│   │   └── client.ts              # API client (fetch wrapper, base URL config)
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx          # App header with nav tabs + theme toggle
│   │   │   └── Layout.tsx          # Shell layout
│   │   ├── search/
│   │   │   ├── SearchBar.tsx       # Main search input
│   │   │   ├── TimeRange.tsx       # Time range presets + custom picker
│   │   │   ├── FilterChips.tsx     # Active filter chips
│   │   │   └── ResultRow.tsx       # Single result row component
│   │   ├── detail/
│   │   │   ├── CallHeader.tsx      # Call summary header
│   │   │   ├── EnrichmentCard.tsx  # Orig/dest device enrichment
│   │   │   ├── CallPath.tsx        # Call path accordion
│   │   │   ├── QualityCard.tsx     # CMR quality metrics
│   │   │   ├── CollectLogs.tsx     # DIME command display
│   │   │   └── RawCdr.tsx          # Full CDR key-value table
│   │   └── sql/
│   │       ├── SqlEditor.tsx       # Monaco editor wrapper
│   │       ├── SqlResults.tsx      # Auto-generated results table
│   │       └── SavedQueries.tsx    # localStorage saved queries sidebar
│   ├── hooks/
│   │   ├── useSearch.ts            # Search state + API calls
│   │   ├── useCallDetail.ts       # Trace API call
│   │   ├── useSqlQuery.ts         # SQL execution + state
│   │   └── useSavedQueries.ts     # localStorage CRUD for saved queries
│   ├── lib/
│   │   ├── utils.ts               # shadcn utility (cn function)
│   │   ├── format.ts              # Duration, timestamp, phone number formatting
│   │   └── quality.ts             # MOS score → quality grade/color mapping
│   └── pages/
│       ├── SearchPage.tsx          # Search page composition
│       ├── CallDetailPage.tsx      # Call detail page composition
│       └── SqlPage.tsx             # SQL page composition
├── public/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
├── components.json                 # shadcn/ui config
├── Dockerfile
├── nginx.conf
├── docker-entrypoint.sh            # Runtime env injection
├── .env.example
├── .gitignore
└── README.md
```

## README Notes

The README should clearly state:

- This is an optional frontend for [cisco-cucm-cdr](https://github.com/sieteunoseis/cisco-cucm-cdr)
- Works with cisco-cucm-cdr v1.1.5+
- Can be deployed standalone (just point at any cisco-cucm-cdr backend URL)
- No backend of its own — pure static files
- Development requires a running cisco-cucm-cdr instance (or point at prod)

## Not In v1

- Stats/analytics dashboards (volume charts, top callers)
- SIP ladder visualization
- Full call routing analysis (DNA-style config walking via AXL)
- Server-side saved queries (shared across users)
- Authentication/authorization
- WebSocket for real-time CDR streaming
