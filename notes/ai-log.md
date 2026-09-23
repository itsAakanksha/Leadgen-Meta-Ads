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
