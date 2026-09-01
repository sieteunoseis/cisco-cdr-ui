# Feature Backlog

## Caller Management

- [x] Caller ID lookup (CNAM via Twilio)
- [ ] Add number to spam blacklist via Cisco CUCM API
- [ ] Add number to spam whitelist via Cisco CUCM API

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
- [ ] More advanced search fields (cause code ranges, codec, device pool, location)
- [ ] Saved search filters (like saved SQL queries but for main search)
- [ ] Bulk number search (paste a list of DNs, get all calls)
- [ ] Time-of-day heatmap (when do most calls happen for a DN)
- [x] Fix filters. Example if i wanted to hide 0s calls and show just Analog labels. i would have to hide all the other labels. This is not intuitive. I should be able to just select the labels i want to see and hide the rest. This is a UX issue. — Replaced with a single show-all-by-default, select-chips-to-narrow model (all quick filters + labels as chips, union across selections).
- [x] Migrate the hardcoded "Recording"/"Phones only" filters to real labels — isRecordingLeg/hasPhoneDevice removed from ResultRow.tsx; Recording and Phone Device are now ordinary labels (seeded by default going forward), matched via matchLabelRules like any other label. Transfer/Conference stay hardcoded (they match numeric on-behalf-of CDR fields, not the string fields label_rules currently supports).

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
- [ ] Translation Pattern matches?

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
- [ ] Legacy DB support — query netdb02-1.ohsu.edu:19491/netinfo for historical CDR (2025-03-29 to 2026-03-25, 70M rows, timestamp format vs our epoch bigint)
- [ ] Drag-and-drop SIP ladder column reordering


# DN Map
- [ ] Map DN to user (CUCM LDAP, AD, HR DB)? DeviceNumPlanMapEndUserMap? EndUserDeviceMap?
- [x] Device name to CUCM admin?
- [x] Filters? Used/Unused? etc
- [x] Count of calls per DN (last 24h, last 7d, last 30d)? Link to CDR records
- [x] Show regex match? or how it was matched?


# Anomaly Detection
- [x] Detect call spikes (volume, failure rate, etc)
- [x] Scope volume_spike/failure_rate rules to a label (optional filter, reuse label_volume's match mechanism)
- [x] Volume drop / device-down detection (inverse of volume_spike, direction toggle)
- [ ] Quality degradation alert type (MOS/jitter from CMR, ties into "Quality alerts" below)
- [ ] After-hours/time-of-day scoping for rules (classic toll-fraud signature)

# Documentation Updates
- [x] Update README with new features (MCP, Twilio etc)
- [x] Link frontend to backend in readme to easily find and vice versa. Optional frontend for cisco-cucm-cdr (v1.3.0+).....this has been renamed