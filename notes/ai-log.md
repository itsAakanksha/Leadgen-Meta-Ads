# AI Log

Working notes for AGENT.md. One entry per build step: what was done, key decisions, and what the human changed.

Tool: Claude Code (Claude Opus 5.5), with the human reviewing every step.

---

## Step 0 — Planning (before any code)

**What:** The AI proposed the architecture, data model, API contracts, folder structure and a commit plan. The plan was revised through several rounds of human review before approval.

**Human changes to the AI's proposals:**

- **Backend framework:** the AI proposed Fastify. The human asked for Express.
- **Frontend:** the AI first planned Next.js as a backend-for-frontend (BFF). The human asked why both Next.js and Express were needed, and the AI then recommended a Vite React SPA with a single Express backend. The human agreed.
- **Auth:** the AI proposed a password login. The human pointed out the spec doesn't require it, so auth was dropped. The AI keeps attribution through an `X-Actor` display name, and the README will document the missing auth as a trade-off.
- **Mock data:** the AI proposed a mock Graph API so the full flow could run without a Meta account. The human rejected this: real Meta API only, with no mocks anywhere, including tests. The tests now create real leads with `POST /{form_id}/test_leads`.
- **Meta docs research:** the human asked for a deeper read of the Meta docs. That surfaced several changes:
  - Meta doesn't return all lead fields by default. We now request consents, platform, organic flag and ad/campaign names explicitly.
  - We store the full Graph response, because Meta deletes leads after 90 days.
  - IDs are parsed losslessly, because Meta's docs show them as JSON numbers.
  - Graph API pinned to v25.0.
  - Tests use the real `test_leads` API.
- **Simplifications requested by the human (KISS):**
  - offset pagination instead of keyset
  - no shared package (the API returns `allowedTransitions` instead)
  - Graph fetch inside the worker transaction, removing the "processing" state
  - `version` in the request body instead of `If-Match`
  - no rate limiting
  - no form-label fetching
  - no reconciliation job
- **Hosting:** Railway → Render free, because the human requires $0 hosting.
- **ORM:** plain `pg` → Prisma, at the human's request.
- **Structure review:** the human asked the AI to check the folder structure against industry references. Against Node.js Best Practices and Bulletproof React, the frontend turned out to be type-based rather than feature-based, and was fixed. A later KISS/naming review:
  - flattened the layer folders into role-suffixed files
  - unified names (`leadgenId`, `WebhookEvent`, Meta's own field names)
  - removed the Meta re-sync `LEAD_UPDATED` path, which dedupe had made unreachable

**Key decisions and their reasons:**

- **Inbox pattern (Postgres table as queue):** ack Meta fast and own the retries, with no Redis.
- **One transaction per lead change + its audit record:** the lead and its history can never disagree.
- **Optimistic locking with `version`:** concurrent edits return 409 instead of overwriting each other.

---

## Step 1 — Scaffold pnpm workspace

**What:**

- Root pnpm workspace (`apps/*`).
- Shared strict `tsconfig.base.json`.
- ESLint flat config (typescript-eslint, type-checked rules, Prettier-compatible).
- Prettier, `.editorconfig` and `.gitattributes` (LF).
- `apps/api` skeleton with Vitest.

**Decisions:**

- **TypeScript pinned to 6.0.x rather than the latest 7.x,** because typescript-eslint 8.x supports only TypeScript <6.1.
- **Prisma pinned to the stable 7.10 line,** because npm's `latest` tag points at an 8.0 release candidate.
- **ESM throughout, with `NodeNext` module resolution.**
- **`no-console` is an ESLint error,** so all logging must go through pino, which applies redaction.

---

## Step 2 — Prisma schema, migrations, local Postgres

**What:**

- Prisma schema for `WebhookEvent`, `Lead` and `LeadActivity`, with snake_case tables and columns via `@map`.
- Generated `init` migration.
- A hand-written second migration containing:
  - an append-only trigger on `lead_activities` that rejects UPDATE/DELETE
  - RLS enabled on all tables, with no policies
- docker-compose Postgres 17, plus a separate `lead_intake_test` database for integration tests.

**Decisions:**

- **All timestamps are `timestamptz`.** Prisma defaults to `timestamp` without a time zone; event times must be unambiguous UTC.
- **Prisma 7 config:** the connection URL lives in `prisma.config.ts`, not in the schema. It uses Node's built-in `process.loadEnvFile()` instead of adding `dotenv`. Migrations use `DIRECT_URL`, because Supabase's pooler is unsuitable for migrations.
- **pnpm install scripts:** `onlyBuiltDependencies` allow-lists only the two Prisma packages that need them.
- **Compose Postgres maps to host port 5433.** The developer machine already runs a native Postgres on 5432.
- **Verified by hand in psql:**
  - UPDATE and DELETE on `lead_activities` both raise.
  - RLS is on for all three tables.
  - `TRUNCATE` still works for test cleanup.

**Notes:**

- Prisma refuses `migrate reset` when an AI agent invokes it. The AI didn't bypass that guard; it recreated its own throwaway compose volume instead.
- The AI accidentally copied a temp file outside the repo, then noticed and moved it to its scratch directory.

---

## Step 3 — Express bootstrap

**What:**

- `lib/config.ts`: zod-validated env, and the only place that reads `process.env`.
- `lib/logger.ts`: pino plus pino-http, with `X-Request-Id` handling.
- `lib/prisma.ts`: a client factory using `@prisma/adapter-pg`.
- `lib/errors.ts`: `AppError` hierarchy, error envelope, 404 handler, and mapping for body-parser errors.
- `app.ts`: the composition root, taking explicit dependencies.
- `/health`: pings the DB and returns 503 if it's down.
- `server.ts`: graceful shutdown.
- Test support:
  - global setup runs `prisma migrate deploy` against the test DB
  - `resetDatabase` uses TRUNCATE, because the audit trigger blocks DELETE
  - a silent logger for tests

**Decisions:**

- **The HTTP log serializer emits only `id/method/path/statusCode`.** No headers, no bodies, and no query string: the Meta handshake carries the verify token in the query. A smoke run confirmed `?hub.verify_token=SECRET` never appears in logs.
- **Config errors list variable names but never values,** since a value could be a secret. A test covers this.
- **Unexpected errors return a generic 500.** Details are logged server-side only.
- **Integration tests run against real Postgres** (`lead_intake_test`), serially (`fileParallelism: false`).
- **ESLint `no-unsafe-*` rules are relaxed for test files only,** because supertest's `res.body` is typed `any`.

**Tests:** 15 passing: config, error handler, health/503, request ID.

---

## Step 4 — Meta verification handshake

**What:**

- `GET /webhook/meta-lead` accepts `hub.mode=subscribe` with a matching `hub.verify_token` and echoes `hub.challenge` as `text/plain`.
- `lib/crypto.ts` provides `safeEqual`.
- `META_VERIFY_TOKEN` is added to config (min 16 chars).

**Decisions:**

- **The verify token is compared in constant time.** Both sides are SHA-256 hashed first, so a length mismatch doesn't leak through timing or through `timingSafeEqual` throwing.
- **The challenge is echoed only if it matches `^[A-Za-z0-9_-]{1,256}$`.** Meta sends an integer, and this stops the endpoint from being used to reflect arbitrary content.
- **Failures go through `AppError`,** keeping one error path and one error envelope.
- **The composition root now takes `config`.** Tests build the app with `testConfig()`, which contains fixture values only.

**Tests:** 22 passing. The handshake tests cover the correct token, a wrong token, a prefix-of-token, the wrong mode, missing parameters, and a script-injection challenge.

---

## Step 5 — Signature verification and idempotent event storage

**What:**

- `POST /webhook/meta-lead` reads the raw body, verifies `X-Hub-Signature-256` (returning 401 on failure), parses it, stores leadgen events with `createMany({ skipDuplicates })`, and returns `200 EVENT_RECEIVED`. Nothing calls the Graph API inline.
- `webhook-signature.ts`, `webhook-payload.ts`, `webhook-events.repository.ts`, `ingestion.service.ts`.
- `META_APP_SECRET` added to config.

**Decisions:**

- **The signature is HMAC over the exact received bytes,** read with `express.raw({ type: () => true })`, so the content type doesn't matter. The header must match `^sha256=[0-9a-f]{64}$` before comparing, so `timingSafeEqual` always gets 32 bytes and can't throw. The legacy `sha1=` header is rejected.
- **IDs are parsed with a reviver that uses `context.source` (Node 22)** to keep `id`/`*_id` numbers as exact strings. Meta's own docs example uses numeric IDs. A test covers a value above 2^53.
- **Only `object: "page"` + `field: "leadgen"` is handled.** Other fields are acknowledged and ignored. Unknown keys in `value` are kept, so Meta adding fields doesn't break us.
- **Duplicates still get 200,** so Meta stops retrying. Dedupe relies on the unique index (`ON CONFLICT DO NOTHING`), which also handles duplicates inside one batch and concurrent deliveries.
- **A signed but malformed body → 400.**
- **Added `ingestion.service.ts`, which wasn't in the plan's file list,** so routes don't call the repository directly. This keeps the routes → service → repository rule. The worker will call the same service.

**Tests:** 51 passing.

- Signature: valid, uppercase hex, tampered, wrong secret, missing, no prefix, `sha1`, truncated/non-hex, re-serialised unicode.
- Payload: Meta's docs example with numeric IDs, batches, other fields ignored, non-page object, unknown keys kept, invalid shapes.
- Integration: stored, 401, redelivery dedupe, batch duplicates, 5 concurrent identical deliveries → 1 row, ID above 2^53, 400.

---

## Step 6 — Graph API client and lead field mapping

**What:**

- `lib/graph-client.ts`: a minimal Graph client (`get/post/delete`) that throws a sanitised `GraphApiError`.
- `ingestion/lead-mapping.ts`:
  - the `GRAPH_LEAD_FIELDS` list
  - a zod schema for the Graph lead response
  - a pure `mapGraphLead` that produces `CreateLeadInput`, defined in `leads/leads.schemas.ts` as the leads module's input contract
- Config: `META_PAGE_ACCESS_TOKEN` and `GRAPH_API_VERSION` (default `v25.0`).
- Real-Meta test support:
  - `requireMetaTestEnv()` fails loudly when credentials are missing
  - `recreateTestLead()` deletes any existing test lead, then calls `POST /{form_id}/test_leads`

**Decisions:**

- **The access token goes in the `Authorization: Bearer` header, not the query string,** so it can't appear in URL logs.
- **`GraphApiError` keeps only HTTP status, Meta error code, type and `fbtrace_id`.** Meta's message text is dropped, since it can echo request data, and so is the token. Network errors are rethrown without the original error, which contains the URL.
- **Requests time out after 10 seconds.**
- **Fields are requested explicitly.** Without `fields=`, Graph returns only `id/created_time/ad_id/form_id/field_data`.
- **`is_checked` is normalised:** Meta returns both `"1"/"0"` and booleans. `full_name` falls back to `first_name + last_name`, and blank answers become `null`.
- **The plan's "error classification" was dropped as unnecessary.** The worker retries every Graph error up to its maximum anyway.
- **Tests that call real Meta are named `*.meta.test.ts`.** `pnpm test` runs everything and fails loudly without credentials. `pnpm test:offline` explicitly skips them, for anyone without Meta access.

**Status:**

- The real-Graph tests (fetch a real test lead, error 100, error 190) are written but **not yet executed**. The human is still finishing the Meta app setup.
- 60 offline tests pass.

---

## Step 7 — Worker: webhook events → leads, with atomic audit and retries

**What:**

- `ingestion.service.processNextEvent()` runs in one transaction:
  1. Claim the oldest due event (`FOR UPDATE SKIP LOCKED`, via `$queryRaw`).
  2. Fetch the lead from Graph.
  3. `leads.createFromMeta`: the lead and its `LEAD_CREATED` activity in a single nested create.
  4. Mark the event done.
- On error the transaction rolls back and a separate update records the failure:
  - increment `attempts`
  - store a sanitised `lastError`
  - apply exponential backoff (30s, doubling, capped at 1h)
  - after 8 attempts, mark the event `failed`
- `webhook-events.worker.ts`: an in-process loop that drains every due event, then sleeps `WORKER_POLL_MS`. It stops gracefully on shutdown.
- Leads module:
  - `leads.repository.createFromMeta`, a no-op if the lead already exists
  - `leads.service.createFromMeta(input, tx)`, the only way ingestion writes leads (it never touches the leads repository)
- Composition root: `createServices()` wires everything once. The server shares those services with its worker, and tests use them too.
- `lib/prisma.ts`: `RunInTransaction`, so services own transaction boundaries without importing Prisma.

**Decisions:**

- **The Graph fetch happens inside the transaction.** A crash at any point leaves the event pending and unlocked, so there's no "processing" state and no stale-lock recovery. This was agreed in planning.
- **`describeError` reduces unknown errors to `name + code`.** Prisma error messages can include query arguments, which could be PII. Graph errors are already sanitised.
- **Failure bookkeeping runs outside the rolled-back transaction,** so a failed attempt is still counted.
- **TypeScript narrowing workaround:** `let claimed = null as ClaimedEvent | null`. TS doesn't see an assignment made inside a callback.

**Tests:**

- 69 passing without credentials. These include real-Meta failure paths using a deliberately invalid token, so Meta returns error 190:
  - retry and backoff, with no token in `lastError`
  - not retried early
  - `failed` after the maximum attempts
  - two concurrent workers never claim the same event
  - the worker loop
- **Written but not yet run (need credentials), in `ingestion.meta.test.ts`:**
  - full pipeline with a real test lead
  - reprocessing never duplicates the lead or activity
  - atomicity: a temporary DB trigger makes the activity insert fail, and the lead must roll back too

---

## Step 8 — List leads with filters, search and pagination

**What:**

- `GET /leads?status=&platform=&q=&page=&limit=` returns `{ data, page, limit, total }`.
- Files touched:
  - `leads.routes.ts`: HTTP only
  - `leads.service.list`
  - `leads.repository.list`
  - the zod query schema and `LeadSummary` type in `leads.schemas.ts`
- `test/support/leads.ts`: `insertLead` fixture, used for testing the lead APIs. These are DB rows, not a mocked Meta.

**Decisions:**

- **Sort by `createdAt DESC, id DESC`.** The `id` tie-breaker means pages never repeat or skip leads with identical timestamps. A test covers this.
- **The page and the total are read in one `$transaction([...])`** so they agree.
- **Search is case-insensitive on name and email, and a substring match on phone.**
- **The list returns summary fields only.** No `fieldData` or `graphResponse`, which keeps the payload small and PII-light.
- **Invalid `status`, `platform`, `page` or `limit` → 400** with the field path. `limit` is capped at 100.

**Bug caught by a test:** Prisma's `contains` doesn't escape LIKE wildcards, so searching `%` matched every lead. Fixed with `escapeLike()`, which escapes `\ % _` (Postgres' default LIKE escape is backslash). Tests cover `%` and `_`.

**Tests:** 84 passing without credentials.

---

## Step 9 — Lead detail with activity timeline and allowed transitions

**What:**

- `GET /leads/:id` returns the lead with:
  - `fieldData` (all answers)
  - consents
  - attribution
  - `notes`, `assignee`, `version`
  - `allowedTransitions`
  - chronological `activities`
- `status-workflow.ts` is a pure transition table: `allowedTransitions()` and `canTransition()`.

**Decisions:**

- **The status workflow moved into this step, earlier than planned,** because the detail response needs `allowedTransitions`. The server stays the single source of truth for which statuses a lead can move to; the UI only renders what it's given.
- **Activities are ordered `createdAt ASC, id ASC`,** so the timeline reads as history.
- **The raw `graphResponse` is not exposed by the API.** It is kept in the database for 90-day safety.
- **Invalid UUID → 400 with path `id`; unknown UUID → 404.**

**Tests:** 117 passing without credentials, including a table test over all 25 status pairs.

---

## Step 10 — Status workflow with optimistic locking and actor attribution

**What:**

- `PATCH /leads/:id/status` with body `{ status, version }` runs in one transaction:
  1. read the current state
  2. check the version → 409 `VERSION_CONFLICT`, with `currentVersion` in the details
  3. same status → return with no write and no activity
  4. check the workflow → 422 `INVALID_TRANSITION`, with the allowed next statuses
  5. `updateMany WHERE id AND version` with `version + 1`
  6. append `STATUS_CHANGED { from, to }`
- It returns the fresh lead detail.
- `lib/actor.ts`: `actorFrom(req)` turns `X-Actor` into `user:<name>`, or `user:anonymous` if absent.
- `lib/errors.ts`: `VersionConflictError` and `parseOrThrow()`. `InvalidTransitionError` lives next to the workflow.
- Repository primitives reused by step 11: `findState`, `updateIfVersion`, `addActivity`.
- `test/support/db-faults.ts`: `withFailingActivityInserts()` adds a temporary trigger so tests can prove rollback. It's reused by the ingestion atomicity test.

**Decisions:**

- **The version is checked twice.**
  - Once up front, for a clear 409 that includes the current version.
  - Again in the `UPDATE ... WHERE version = ?`, which is the real concurrency guard. Under READ COMMITTED, the second writer's UPDATE re-evaluates its WHERE after the first commits and matches 0 rows, so exactly one writer wins without explicit locks.
- **The version check comes before the no-op check.** A stale client gets a 409 even if its requested status happens to match.
- **Browsers only allow ASCII header values, so `X-Actor` is URI-encoded.** The server decodes it and validates: at most 60 chars; letters, numbers, spaces and name punctuation only. `:` is not allowed, so a user can't pose as `system:meta`.
- **The body is a `strictObject`,** so unknown keys → 400.

**Tests:** 141 passing.

- status: success with actor, non-ASCII actor, anonymous, no-op, 422, converted is terminal, stale 409, a concurrent race where exactly one wins with one activity, audit failure rolls back, 404, invalid bodies, invalid actor
- actor: unit tests

---

## Step 11 — Editable-field PATCH with a field-level diff audit

**What:**

- `PATCH /leads/:id` with body `{ version, fullName?, email?, phone?, notes?, assignee? }`, in one transaction:
  1. read the current values
  2. check the version → 409 if it's stale
  3. `diffFields` → return with no write if nothing changed
  4. `updateIfVersion` with only the changed fields
  5. append `LEAD_UPDATED { changes: { field: { from, to } } }`
- `lead-diff.ts`: a pure generic diff.
- The endpoint goes beyond the spec. The human asked for it so the audit trail has real `LEAD_UPDATED` events; the README will explain.

**Decisions:**

- **`status` in the body → 400 `STATUS_NOT_EDITABLE`,** pointing to `/status`. Every status change then goes through workflow validation and is recorded as `STATUS_CHANGED`.
- **The body is a strict object,** so Meta-sourced fields (`leadgenId`, `fieldData`, …) can't be overwritten → 400.
- **Validation:**
  - email format
  - phone pattern (digits, spaces, `()-`, optional `+`)
  - length limits
- **Text is trimmed, and an empty string clears a field (stored as `null`).** So `"  Ada  "` against `"Ada"` is a no-op.
- **Only changed fields are written and recorded,** so identical values produce no activity.
- **Email is not lowercased.** The AI first added lowercasing, then removed it: it would have treated user edits differently from Meta's data.
- **Both PATCH endpoints share the same version counter.** A concurrent status change and field edit can't both succeed; a test covers this.

**Tests:** 161 passing.

- diff: unit tests
- update: diff content, clearing fields, no-op, `STATUS_NOT_EDITABLE`, 409, concurrent edits across the two endpoints, rollback when the audit write fails, 404, invalid bodies

---

## Step 12 — Real test-lead creator and signed webhook replay

**What:**

- `scripts/meta-dev-tools.ts` holds the shared dev tooling: `sign()`, `leadgenBody()`, and `recreateTestLead()` (delete any existing test lead, then `POST /{form_id}/test_leads`). The tests reuse it rather than keep their own copies.
- `pnpm lead:create [--form] [--name] [--email] [--phone]` creates a real lead on the demo form. Meta then delivers the real signed webhook.
- `pnpm webhook:replay --leadgen-id <id> [--times N] [--batch] [--bad-signature] [--url]` sends Meta-shaped, correctly signed deliveries. It exists to demonstrate duplicate and batch handling, which Meta's tools can't trigger on demand.

**Decisions:**

- **The scripts use the same Graph client and signing code as the app and tests.** There's no separate "mock" path.
- **`no-console` is off for `apps/*/scripts/**` only.** The app itself must log through pino.

**Verified by running the real API locally:**

- A 3-copy batch, then 2 more deliveries of the same ID → exactly 1 stored event. Logs: `received 3 / stored 1`, then `received 1 / stored 0` twice.
- `--bad-signature` → 401.
- The server log was grepped for the app secret, the token and any `sha256=` signature: 0 matches.

---

## Fix — Real-Meta tests were sensitive to network latency

**What happened:**

- After step 12, one real-Meta retry test failed. Its call to `graph.facebook.com` hit the Graph client's 10s timeout, so the recorded error was `network error` rather than Meta's code 190. A plain `curl` from this machine to Graph took 22s, which confirms slow network latency.
- The code behaved correctly: the attempt was recorded, retried and sanitised. The test was too strict about _which_ failure it would see.
- **AI process mistake:** the step 12 commit command was chained on a `grep` that succeeded even though a test had failed, so step 12 was committed with one failing test. The AI then reran each test file separately to confirm the failure was network-related rather than a regression, and fixed it in a follow-up commit.

**Fix:**

- The retry test accepts `code 190 | network error`. Its purpose is to check that a failure is recorded and retried, and either error proves that.
- Global Vitest `testTimeout` and `hookTimeout` set to 60s, because some tests call the real Graph API. Per-test overrides removed.
- The Graph client's 10s production timeout is unchanged: a slow Meta response is exactly what the retry/backoff path is for.

---

## Step 13 — Vite React app scaffold: routing, API client, actor prompt

**What:**

- `apps/web`: React 19, Vite 8, Tailwind 4, React Router 7, TanStack Query, and a Radix Dialog. Structure follows Bulletproof React:
  - `app/` for the layout, provider, router and routes
  - shared `components/`, `hooks/` and `lib/`
- `lib/api-client.ts`:
  - `apiRequest()` against same-origin `/api`
  - `ApiError`, which carries the server's error envelope
  - `actorHeader()`, which URI-encodes the display name
- `lib/query-client.ts`: retries only network errors and 5xx (Render's free tier cold-starts in ~50s); never retries 4xx.
- `hooks/use-actor.ts`: the display name, stored in localStorage via `useSyncExternalStore`. It still works if storage throws.
- Layout:
  - header with "Acting as …" and a Change-name dialog
  - skip link
  - a `/privacy` page, because Meta requires a privacy policy and data-deletion URL before an app can go Live
- Vite dev proxy: `/api/*` → `API_PROXY_TARGET` (default `localhost:4000`), with the `/api` prefix stripped.

**Design (frontend-design skill):**

- Visual thesis: a "quiet ledger".
  - warm paper background, ink text, and one deep-teal accent for actions
  - IBM Plex Sans with Plex Mono for IDs and timestamps
  - status always shown as text
- Motion is CSS only: fade-in for dialogs and timeline entries, a flash on status change. It respects `prefers-reduced-motion`.

**Decisions:**

- **React Router 7.18 instead of 8.x.** v8 requires Node ≥22.22 and this machine runs 22.17.
- **The privacy page's contact email comes from `VITE_PRIVACY_CONTACT_EMAIL`.** The AI first hard-coded the developer's personal email, then noticed and moved it to a build-time variable, so no personal address is committed.
- **Web tests use no mocked API.**
  - Tested directly: pure logic (error mapping, retry policy, header encoding).
  - Rendered with real props and real localStorage: components.
- **ESLint:** `react-hooks` recommended rules and browser globals for `apps/web`.

**Tests:** web 11 passing. API still 161 passing offline.

---

## Step 13b — Adopt shadcn/ui and a design system (human request)

**Human request:** use shadcn/ui for reusable components, and apply three design skills the human installed in `.agents/skills/`:

- `ui-ux-pro-max`
- `vercel-react-best-practices`
- `design-taste-frontend`

**How the skills were applied:**

- **Design read** (taste skill): an internal lead-ops dashboard for sales operators, calm, dense and Linear-style. Dials: variance 3, motion 3, density 7.
- **ui-ux-pro-max `--design-system`:** its style ("Flat": no decorative shadows, 150–200 ms hovers) and its blue/green palette direction were used. Its landing-page pattern and scholarly serif typography didn't fit a dashboard and were rejected. As the skill instructs, it was re-queried: typography with `--domain`, and components with `--stack shadcn` (use Table for tabular data; use Field-based forms).
- **Taste skill corrections to the AI's own earlier work:**
  - The step-13 "warm paper + ink" palette (`#f6f4ef` / `#1c1b18`) is on the skill's banned "beige + espresso" AI-default list, so it was replaced by cool zinc neutrals with one emerald accent.
  - Phosphor icons instead of lucide.
  - Geist and Geist Mono instead of IBM Plex.
  - Purple was avoided for status colours (the "lila rule").
- **Vercel React rules:**
  - Search debounce moved from an effect into the event handler (`rerender-move-effect-to-event`), which also removed an eslint-disable.
  - Ternaries instead of `&&` for conditional rendering.
  - Versioned localStorage key (`lead-intake:actor:v1`).
  - Barrel imports were checked: Phosphor is `sideEffects: false` and Vite tree-shakes it (verified in the built bundle), so per-icon deep imports weren't needed.

**What changed:**

- shadcn (radix base, "nova" preset) with generated `button`, `dialog`, `input`, `textarea`, `label`, `select`, `badge`, `skeleton`, `table`, `sonner`, `field`, `separator` and `tooltip`.
- The hand-rolled button, dialog and skeleton were removed.
- Design tokens in `index.css`:
  - zinc neutrals, with emerald-700 as the primary accent (white text 5.45:1)
  - muted text 7.7:1
  - input borders 3.37:1, meeting WCAG 1.4.11 (contrast checked with a script)
  - one 8px radius (status badges are pills)
  - light theme only
- The `sonner` wrapper no longer uses `next-themes`, a Next.js theming library the SPA doesn't need.
- `@/` import alias across the web app.

**Mistakes made and caught:**

- The AI thought the generated `import { cn } from "cn"` was broken. It is in fact shadcn's official `cn` package. The imports were routed through `@/lib/utils` anyway, which is harmless and matches `components.json`.
- `pnpm format` reformatted the human's untracked `.agents/skills/*.md` files (whitespace and markdown formatting only; they can't be restored from git). `.agents/` is now in `.prettierignore` and the ESLint ignores, and the human was told.
- A test caught an accessibility bug: the header button's accessible name was "Acting asSam Lee", because a trailing space inside a span is dropped from the name. Fixed.

---

## Step 14 — Lead list with filters, search, pagination and UI states

**What:**

- `features/leads/`:
  - types that mirror the API
  - `useLeads`/`useLead` query hooks (`keepPreviousData`, so paging doesn't flash skeletons)
  - `leads-query.ts`: a pure mapping between URL params and the query
  - `LeadFilters`: debounced search, plus shadcn Selects for status and platform, with clear
  - `LeadsTable`: shadcn Table on desktop, a stacked list on mobile, and a skeleton of the same shape
  - `StatusBadge`
- Shared: `EmptyState`, `ErrorState` (with retry), `Pagination` ("21–40 of 45").

**Decisions:**

- **Filters, search and page live in the URL.** Views are shareable and survive reloads. Invalid values in the URL are dropped rather than sent to the API, and changing any filter resets to page 1.
- **URL updates use functional `setParams`,** so a debounced search can't overwrite a newer filter change.
- **States:**
  - skeleton, plus a "Waking up the server…" hint once a retry has happened (Render free-tier cold start)
  - error with retry
  - two empty states: no leads yet vs. no match (with clear filters)
  - dimmed content while the next page loads
- **Accessibility:**
  - the whole row is clickable through a stretched link, which stays a single labelled link for keyboard and screen-reader users
  - `role="search"`
  - an sr-only label on the search input
  - `aria-label` on the Select triggers
  - an `aria-live` result count
  - `aria-busy` while loading
- **Monospace only for data** (timestamps). Numbers use tabular figures.

**Visual verification:**

- The real API and Vite dev server were run against the local database, with sample rows inserted directly into the local DB (not committed).
- Headless Chrome screenshots were taken at 1280px (table), 500px (mobile list) and 2× zoom (font check).
- An apparent mobile overflow at 390px turned out to be headless Chrome's minimum window width; at 500px the layout fits.
- One tweak came out of review: the source label on mobile moved from mono to sans.

**Tests:** web 24 passing:

- URL query parsing and building
- table links, column headers and fallbacks
- pagination range and disabled states
- actor prompt
