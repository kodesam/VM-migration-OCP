# MTV Migration Template (Backstage-integrated)

This template provides a minimal, production-lean starting point for automating VM migrations to Red Hat OpenShift Virtualization (CNV) using Red Hat Migration Toolkit for Virtualization (MTV/Forklift). It exposes a small REST API (intended to be wired into Backstage as a plugin backend), YAML templates for Forklift `Plan` and `Migration` CRs, and a barebones dashboard that can be embedded in Backstage or run standalone for testing.

## Capabilities

- Fetch VM inventory from vROps to pre-populate MTV input parameters
- Create Jira issues for tenant alignment and approval tracking
- Create Helix ITSM change requests and poll for approval
- Send email notifications to tenant distribution lists
- Trigger MTV migrations (render Forklift CRs and apply to cluster)
- Report migration status and allow failed-log downloads
- Gate the trigger button on the dashboard until Jira is approved, CR is approved, notifications are sent, and the current time matches the CR schedule

## Directory layout

- `backend/`: Node.js TypeScript service exposing REST endpoints
- `templates/`: Mustache templates for Forklift `Plan` and `Migration` CRs
- `frontend/`: Simple static dashboard for testing the flows
- `k8s/tekton/` (optional): Example Tekton pipeline you can use instead of direct CR apply

## Quick start

1. Set environment variables (see below). For local development you can copy `.env.example` to `.env` and fill values.
2. Install and run:

```bash
cd backend
npm install
npm run build
npm start
```

3. Open the test dashboard:

```bash
# from repo root
python3 -m http.server 8080 -d frontend
# then open http://localhost:8080/
```

> Tip: Set `MOCK=true` to run the API without real integrations. This returns deterministic mock data to exercise the UI and flow.

## Environment variables

- `PORT`: API port (default 7007)
- `MOCK`: `true|false` toggle to use mocked responses

vROps
- `VROPS_BASE_URL`
- `VROPS_TOKEN`

Jira
- `JIRA_BASE_URL` (e.g. `https://your-domain.atlassian.net`)
- `JIRA_EMAIL`
- `JIRA_API_TOKEN`
- `JIRA_PROJECT_KEY`

Helix ITSM
- `HELIX_BASE_URL`
- `HELIX_API_TOKEN` (or use username/password adaptation in code)

Email (SMTP)
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE` (optional, default `false`)
- `SMTP_USER`
- `SMTP_PASS`
- `EMAIL_FROM`

Kubernetes / MTV
- `KUBECONFIG` (path if running out-of-cluster)
- `MTV_NAMESPACE` (default `forklift`)
- `MTV_PLAN_TEMPLATE` (path override)
- `MTV_MIGRATION_TEMPLATE` (path override)

## REST API (high level)

- `GET /api/vrops/vms` → inventory with MTV fields
- `POST /api/jira/tickets` → { vms: [...], tenants: [...], ... } → { key }
- `POST /api/helix/changes` → { summary, when, type, jiraKey } → { changeId, scheduledStart, scheduledEnd }
- `GET /api/helix/changes/:id` → approval/status
- `POST /api/notify/email` → { recipients: [], subject, body, changeId } → { ok }
- `POST /api/mtv/migrate` → { plan } or { selectedVmIds, mappings, targetCluster, changeId, jiraKey } → { migrationName }
- `GET /api/mtv/migrations/:name/status` → { phase, conditions, logsUrl? }
- `GET /api/mtv/migrations/:name/logs` → raw log download

## Backstage wiring (outline)

- Add the backend service as a Backstage backend plugin or as a standalone service referenced from your Backstage plugin frontend.
- The dashboard demonstrates the gating logic and can be ported into Backstage UI components.

## Security & secrets

- Never hardcode tokens. Use environment variables or a secret manager (Vault, Kubernetes secrets).
- Least privilege: the Kubernetes credentials should only allow creating/updating Forklift `Plan`/`Migration` in the target namespaces.

## Notes

- This is a template. Adapt API payloads and endpoints to your organization’s Jira/Helix/vROps/SMTP specifics.
- For production, add persistence (e.g., Postgres) for request state instead of the in-memory store used here.