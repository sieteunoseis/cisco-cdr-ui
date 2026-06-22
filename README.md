# cucm-cdr-dashboard

A web dashboard for searching, analyzing, and querying Cisco CUCM Call Detail Records.

Optional frontend for [cisco-cucm-cdr](https://github.com/sieteunoseis/cisco-cucm-cdr) (v1.3.0+).

## Features

- **Search** — Find calls by phone number, device name, or user ID with time range filters
- **Call Detail** — Full call trace with enrichment data, quality metrics, call path, and SDL trace collection
- **SQL Query** — Run custom SQL queries with Monaco editor, formatting, saved queries, and CSV export
- **Dark/Light Mode** — System preference detection with manual toggle

## Quick Start

### Development

Requires a running [cisco-cucm-cdr](https://github.com/sieteunoseis/cisco-cucm-cdr) backend (v1.3.0+).

```bash
cp .env.example .env
# Edit .env to point at your backend
npm install
npm run dev
```

### Docker

```bash
docker run -p 8080:80 -e API_URL=https://your-cdr-backend ghcr.io/sieteunoseis/cucm-cdr-dashboard:latest
```

### Docker Compose (with backend)

```yaml
services:
  dashboard:
    image: ghcr.io/sieteunoseis/cucm-cdr-dashboard:main
    ports:
      - "8080:80"
    environment:
      - API_URL=http://cdr-processor:3000

  cdr-processor:
    image: ghcr.io/sieteunoseis/cisco-cucm-cdr:latest
    environment:
      - DATABASE_URL=postgresql://cdr:cdr_password@postgres:5432/callmanager
      - AXL_HOST_1=cucm-pub.example.com
      - AXL_USERNAME_1=axl-user
      - AXL_PASSWORD_1=axl-password
      - AXL_CLUSTER_ID_1=myCUCMcluster
```

## Configuration

| Variable       | Default | Description                      |
| -------------- | ------- | -------------------------------- |
| `VITE_API_URL` | (none)  | Backend API URL (build time)     |
| `API_URL`      | (none)  | Backend API URL (Docker runtime) |

## Backend API Requirements

This dashboard requires [cisco-cucm-cdr](https://github.com/sieteunoseis/cisco-cucm-cdr) v1.3.0+ which provides:

- `GET /api/v1/cdr/search` — CDR search with enrichment data
- `GET /api/v1/cdr/trace/:callId` — Full call trace with CDR + CMR
- `POST /api/v1/cdr/sql` — Read-only SQL query execution
- `POST /api/v1/cdr/logs/collect` — SDL/SDI trace collection via DIME
- `GET /api/v1/health` — Health check

CORS must be enabled on the backend (`CORS_ORIGIN` env var).

## Tech Stack

Vite, React 19, TypeScript, Tailwind CSS 4, shadcn/ui, Monaco Editor, sql-formatter, React Router

## License

MIT
