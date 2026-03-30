# Feature Backlog

## Caller Management

- [ ] Caller ID lookup (CNAM via Twilio/OpenCNAM)
- [ ] Add number to spam blacklist
- [ ] Add number to spam whitelist
- [ ] Add number to contacts

## Call Analysis

- [x] Snapshot device state with starred calls (RISPort, phone logs, CDP, config)
- [x] SIP ladder diagram with columns and arrows
- [x] Star/save calls from search and detail pages
- [x] Filter starred calls
- [ ] Export SIP ladder as image/PDF for tickets
- [ ] Call flow diagram (visual path across CUCM nodes)
- [ ] Compare two calls side-by-side
- [ ] Annotation/notes on a call (e.g. "INC12345 — user reported static")
- [ ] Export call detail to PDF for incident reports

## Search & Filtering

- [x] Search filters (recording, 0s, transfer, conference, phones only)
- [x] Filters dropdown with persist across navigation
- [x] CSV export from search results
- [x] Time range re-runs search automatically
- [ ] Saved search filters (like saved SQL queries but for main search)
- [ ] Bulk number search (paste a list of DNs, get all calls)
- [ ] Time-of-day heatmap (when do most calls happen for a DN)

## Quality & Monitoring

- [x] Codec in Quality card
- [ ] Quality alerts — flag calls with MOS below threshold
- [ ] Codec mismatch detection (orig vs dest codec differ)
- [ ] Dashboard view — call volume, failure rate, top destinations (last 24h)

## SQL

- [x] Variables with :var=default syntax
- [x] Autocomplete for tables and columns
- [x] Saved query reset button
- [ ] Shared saved SQL queries (backend-stored, team-visible)

## Device Diagnostics

- [x] RISPort device lookup (batch, cached)
- [x] Phone web scraping (network/CDP, config, status, syslog)
- [x] Dynamic syslog buttons based on available log files
- [x] Third-party phone detection (hide web buttons)
- [ ] Link to phone page in CUCM admin (from device name)
- [ ] JTAPI/CTI live call monitoring

## Infrastructure

- [x] All-nodes SIP trace collection
- [x] Snapshot storage on disk with DB pointers
- [x] Docker Hub CI auth
- [x] Skip Docker build for markdown changes
- [ ] cisco-risport Docker container fix (issue #3)
