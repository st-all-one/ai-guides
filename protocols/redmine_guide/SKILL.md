---
name: redmine-rest-api
description: >
  Redmine REST API (v1.0–v5.0+): issues, projects, memberships, users, time
  entries, news, relations, versions, wiki, queries, attachments, statuses,
  trackers, enumerations, categories, roles, groups, custom fields, search,
  files, account, journals. Load when automating or integrating Redmine.
category: protocols
version: "REST API v5.0+"
tags: [redmine, rest, api, issues, projects, time-entries, wiki, automation]
license: MIT
---

# Redmine REST API (v5.0+)

## Use When
- Automating Redmine operations (issues, projects, users, time, wiki)
- Integrating Redmine with other systems
- Building CLIs/web tools over Redmine
- Auditing or exporting project data

## Core Rules
- Base URL: `https://host/`. JSON in/out: `.json` suffix or `Content-Type: application/json`.
- Auth: `X-Redmine-API-Key: <key>` header preferred; Basic auth for user/password.
- Respect status codes: `200`, `201`, `204`, `404`, `422` (validation) — parse the `errors` array.
- Paginate list endpoints: `?limit=&offset=`; inspect `total_count`/`offset`/`limit`.
- Filter with `?<field>_id=`, `?status_id=open`, `?set_filter=1`, `?cf_<id>=`.
- `PUT`/`DELETE` require the object payload (e.g. `{"issue": {...}}`).
- Use `POST /issues.json` with `project_id` (or `project_key`); `GET /issues/:id.json?include=journals,attachments`.
- Set `due_date`/custom fields via their exact keys; unknown keys are ignored/rejected.
- Rate-limit clients; cache reference data (statuses, trackers, roles).
- Never log API keys; store them in secrets.

## Core Patterns
```bash
BASE=https://redmine.example.com
KEY=xxxxx
H=(-H "X-Redmine-API-Key: $KEY" -H "Content-Type: application/json")

# List open issues
curl -s "${H[@]}" "$BASE/issues.json?status_id=open&limit=50&offset=0"

# Create issue
curl -s "${H[@]}" -X POST "$BASE/issues.json" -d '{
  "issue": { "project_id": 1, "subject": "Bug",
             "tracker_id": 1, "status_id": 1, "priority_id": 2,
             "assigned_to_id": 5, "custom_fields": [{"id": 3, "value": "x"}] }
}'

# Update
curl -s "${H[@]}" -X PUT "$BASE/issues/42.json" \
  -d '{"issue":{"status_id":3,"notes":"Fixed"}}'

# Time entries
curl -s "${H[@]}" "$BASE/time_entries.json?from=2026-01-01&to=2026-01-31"
```

## File Map
| File | Content |
|---|---|
| `00-redmine API.md` | Overview, auth, versions, base patterns |
| `01-issues.md` | Issues CRUD, filters, journals |
| `02-projects.md` | Projects CRUD/settings |
| `03-project-memberships.md` | Memberships |
| `04-users.md` | Users and roles |
| `05-time-entries.md` | Time tracking |
| `06-news.md` | News |
| `07-issue-relations.md` | Relations |
| `08-versions.md` | Versions |
| `09-wiki-pages.md` | Wiki pages |
| `10-queries.md` | Saved queries |
| `11-attachments.md` | Attachments |
| `12-issue-statuses.md` | Statuses |
| `13-trackers.md` | Trackers |
| `14-enumerations.md` | Enumerations |
| `15-issue-categories.md` | Categories |
| `16-roles.md` | Roles |
| `17-groups.md` | Groups |
| `18-custom-fields.md` | Custom fields |
| `19-search.md` | Search |
| `20-files.md` | Files |
| `21-my-account.md` | Current account |
| `22-journals.md` | Journal entries |

## Read Order
`00` → the resource file you need (`01`–`22`).

## Prereqs
HTTP/JSON and a Redmine API key.
