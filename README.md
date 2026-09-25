# Lead Intake Service

Receives **Meta Lead Ads** webhooks, stores leads with an **append-only audit trail**, and gives sales a dashboard to work them.

- **Live:** https://leadgen-meta-ads-web.vercel.app · API: https://leadgen-meta-ads.onrender.com
- **Stack:** Node 22 + Express 5 + Prisma 7 + Postgres (Supabase) · React 19 + Vite + TanStack Query + shadcn/ui
- Real Meta Graph API only, no mock data.

## Architecture

```
Meta ──signed webhook──► Express API ──INSERT──► webhook_events (inbox)
                              │                          │
                              ▼                    worker (every 2s, SKIP LOCKED)
                        200 immediately                  │
                                                         ▼
                                     Graph API fetch → lead + LEAD_CREATED (1 transaction)

Browser ─► Vercel (React SPA) ─/api/*─► Render (API + worker) ─► Supabase Postgres
```

- **Webhook:** verifies `X-Hub-Signature-256` over raw bytes, stores the event (dedup on `leadgen_id`), replies 200 fast. Meta's payload holds only IDs.
- **Worker:** fetches full lead from Graph, writes lead + activity in one transaction. Failures retry with backoff, then mark `failed`.
- **Audit:** every change writes the lead and a `lead_activities` row (before/after diff) atomically. A DB trigger blocks `UPDATE`/`DELETE` on activities.
- **Concurrency:** optimistic locking via `version`; stale edit → 409.
- **Workflow:** `NEW → CONTACTED → QUALIFIED → CONVERTED`, any open status → `LOST`, `LOST → NEW`. Server returns `allowedTransitions`.

| Endpoint                                | Purpose                                          |
| --------------------------------------- | ------------------------------------------------ |
| `GET /webhook/meta-lead`                | Meta verification handshake                      |
| `POST /webhook/meta-lead`               | Receive leadgen events                           |
| `GET /leads?status=&platform=&q=&page=` | List, filter, search                             |
| `GET /leads/:id`                        | Detail + activity timeline                       |
| `PATCH /leads/:id/status`               | Change status `{ status, version }`              |
| `PATCH /leads/:id`                      | Edit contact/notes/assignee (audited field diff) |

## Setup Instructions

Requires Node ≥ 22.12, pnpm 10, Docker.

```bash
cp apps/api/.env.example apps/api/.env   # Supabase + Meta values
docker compose up --build                # web :5173, api :4000
```

Test a lead end to end without running an ad:

```bash
pnpm lead:create                                          # real test lead via Meta API
pnpm webhook:replay --leadgen-id <id> --times 3 --batch   # signed duplicate deliveries
```

**Meta:** Business app in **Live** mode → Webhooks product, subscribe Page to `leadgen` → callback `https://<api>/webhook/meta-lead` → set `META_VERIFY_TOKEN`, `META_APP_SECRET`, `META_PAGE_ACCESS_TOKEN` (long-lived Page token with `leads_retrieval`), `META_TEST_FORM_ID`, `META_DEMO_FORM_ID`.

**Tests:** `pnpm test` (real Postgres via `docker compose --profile test up -d test-db`, real Graph API; no mocks).

## Deployment Steps

1. **Supabase:** create project, use **Session pooler** URL (port 5432) for `DATABASE_URL` and `DIRECT_URL`.
2. **Render (API):** New → Blueprint → this repo (`render.yaml`). Add secrets. Migrations run on start.
3. **Vercel (web):** import repo, root `apps/web`. Rewrite in `apps/web/vercel.json` points `/api/*` to Render.
4. **Meta:** set webhook callback to the Render URL, run `pnpm lead:create`.

All free tier.

## Trade-offs

- **Postgres as queue** over Redis: store + enqueue in one atomic insert, no extra infra. Worker polls every 2 s.
- **Graph fetch inside the worker transaction:** any crash rolls back cleanly, no stale-lock recovery needed.
- **Express API + Vite SPA** over SSR: validation, workflow and audit live in one backend; dashboard needs no SSR.
- **Same-origin proxy** (Vercel rewrite / Vite proxy): no CORS to configure.
- **Offset pagination:** simple, gives "21–40 of 45"; keyset ready as next step.
- **Display name as `X-Actor`:** attribution kept lightweight, auth outside assignment scope.
- **Free-tier hosting:** Render + Vercel + Supabase, $0 to run.

## Scaling Considerations

- **Webhook bursts:** add worker instances (`SKIP LOCKED` keeps them safe) or move to SQS/Cloud Tasks.
- **Graph rate limits:** honour rate-limit headers, per-Page token bucket.
- **Large tables:** keyset pagination on `(created_at, id)`, `pg_trgm` index for search.
- **Audit volume:** partition `lead_activities` by month.
- **Independent scaling:** split worker from HTTP service.

## Future Improvements

- Authentication/SSO, actor from logged-in user.
- Reconciliation job syncing leads from Meta's form API.
- Show real form question labels.
- Send lead stages to Meta Conversions API for CRM.
- Alerts + admin requeue for `failed` events and revoked tokens.
