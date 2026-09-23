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
