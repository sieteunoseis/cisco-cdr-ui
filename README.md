# cisco-cdr-ui

A web dashboard for searching, analyzing, and querying Cisco CUCM Call Detail Records.

Optional frontend for [cisco-cdr-processor](https://github.com/sieteunoseis/cisco-cdr-processor) — that repo was previously named `cisco-cucm-cdr`.

## Features

- **Search** — Find calls by phone number, device name, or user ID with time range filters, saved starred calls, and CSV export
- **Call Detail** — Full call trace with enrichment data, quality metrics, call path, SIP ladder diagram, and SDL trace collection
- **Labels** — Shared, regex-based classification rules (e.g. Analog, Emergency, Spam) applied across search and call detail
- **Spam / Carrier Check** — Look up a calling number via the backend's Twilio integration (Nomorobo, IceHook Scout carrier/porting data), with results cached so repeat visits don't re-spend add-on credits
- **DN Map** — Browse a label's number range against CUCM: configured vs. unconfigured DNs, assigned devices (with a direct CUCM admin link), and recent call volume per DN
- **Diagnostic Snapshots** — Capture RISPort, phone logs, CDP, and config state for a starred call, for incident follow-up
- **SQL Query** — Run custom SQL queries with Monaco editor, formatting, saved queries, and CSV export
- **Dark/Light Mode** — System preference detection with manual toggle

## Quick Start

### Development

Requires a running [cisco-cdr-processor](https://github.com/sieteunoseis/cisco-cdr-processor) backend.

```bash
cp .env.example .env
# Edit .env to point at your backend
npm install
npm run dev
```

### Docker

```bash
docker run -p 8080:80 -e API_URL=https://your-cdr-backend ghcr.io/sieteunoseis/cisco-cdr-ui:latest
```

### Docker Compose (with backend)

```yaml
services:
  dashboard:
    image: ghcr.io/sieteunoseis/cisco-cdr-ui:main
    ports:
      - "8080:80"
    environment:
      - API_URL=http://cdr-processor:3000

  cdr-processor:
    image: ghcr.io/sieteunoseis/cisco-cdr-processor:latest
    environment:
      - DATABASE_URL=postgresql://cdr:cdr_password@postgres:5432/callmanager
      - AXL_HOST_1=cucm-pub.example.com
      - AXL_USERNAME_1=axl-user
      - AXL_PASSWORD_1=axl-password
      - AXL_CLUSTER_ID_1=myCUCMcluster
      - CORS_ORIGIN=http://localhost:8080
```

## Configuration

| Variable       | Default | Description                      |
| -------------- | ------- | -------------------------------- |
| `VITE_API_URL` | (none)  | Backend API URL (build time)     |
| `API_URL`      | (none)  | Backend API URL (Docker runtime) |

## Backend API Requirements

This dashboard requires [cisco-cdr-processor](https://github.com/sieteunoseis/cisco-cdr-processor), which provides:

- `GET /api/v1/cdr/search`, `/trace/:callId`, `/quality`, `/related/:callId`, `/stats/:type` — search, trace, and quality/volume stats
- `POST /api/v1/cdr/sql`, `GET /api/v1/cdr/sql/schema` — read-only SQL query execution
- `POST /api/v1/cdr/logs/collect`, `POST /api/v1/cdr/logs/sip-ladder` — SDL/SDI trace and SIP ladder collection via DIME
- `GET/POST/PUT/DELETE /api/v1/labels` — shared label rules
- `GET /api/v1/numplan/seats`, `/devices`, `/call-counts` — DN Map
- `GET /api/v1/spam/checked`, `POST /api/v1/spam/check` — spam/carrier check (requires Twilio configured on the backend)
- `GET/POST/DELETE /api/v1/starred`, `GET/POST /api/v1/snapshots` — starred calls and diagnostic snapshots
- `GET /health` — health check

See that repo's README for the full API reference. CORS must be enabled on the backend (`CORS_ORIGIN` env var, set to this dashboard's URL).

## Grafana Dashboard

Labels — the regex-based tags you create on the **Settings** page (e.g. "Analog", "UCCE", a device-based label matching a SIP trunk) — aren't just a Search/Alerts feature. A sample Grafana dashboard, included in the backend repo at [`cisco-cdr-processor/docs/grafana-dashboard.json`](https://github.com/sieteunoseis/cisco-cdr-processor/blob/main/docs/grafana-dashboard.json), reads `label_rules` live and turns every label you define here into a selectable filter across 16 panels (call volume, failure rate, top numbers, quality trends, and more) — no export or sync step. Create a label here, and it's immediately in that dashboard's **Label** dropdown.

See [cisco-cdr-processor's README](https://github.com/sieteunoseis/cisco-cdr-processor#grafana-dashboard) for the full setup: creating a read-only Postgres role, adding the datasource in Grafana, and importing the dashboard. One setting is specific to this app: when importing, the dashboard prompts for a **CDR UI base URL** (`cdr_ui_url`) variable — set that to wherever this app is deployed, since the dashboard's "Search this number in CDR" links (on the Top Calling/Top Called panels) navigate straight to this app's Search page (`/?q=<number>`).

## Tech Stack

Vite, React 19, TypeScript, Tailwind CSS 4, shadcn/ui, Monaco Editor, sql-formatter, React Router

## Related Projects

[cisco-cdr-processor](https://github.com/sieteunoseis/cisco-cdr-processor) — the backend this dashboard talks to. Collects, parses, and enriches CUCM CDR/CMR data, and exposes both the REST API this app uses and an MCP server for AI agent access.

## License

MIT
