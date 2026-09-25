# AGENT.md: How AI was used

I built this with Claude Code (Claude Opus 5.5) as the implementer. I set the direction, made the decisions and reviewed the output. The step-by-step record is in [`notes/ai-log.md`](notes/ai-log.md).

## How I ran it

- **Plan first.** The agent proposed architecture, data model, API contracts and a commit plan. It wrote no code until I approved the plan.
- **Small, gated steps.** Each step had to pass tests, lint and typecheck before one Conventional Commit and one AI-log entry.
- **Ask, don't guess.** When something was ambiguous, the agent asked and I chose.
- **Verify for real.** Containers were built and run, the UI was checked at desktop and mobile widths, and contrast ratios were computed.

I wrote the Meta correctness requirements into the brief: raw-body HMAC with a constant-time compare, IDs-only payloads, retries and batching, and IDs kept as strings.

## Where I overrode the agent

| Agent proposed                                                               | My call                            | Why                                                                     |
| ---------------------------------------------------------------------------- | ---------------------------------- | ----------------------------------------------------------------------- |
| Next.js backend-for-frontend + API                                           | **Vite SPA + one Express 5 API**   | Two servers for one domain isn't justified. All the rules live in one place. |
| Fastify                                                                      | **Express 5**                      | Native async error handling, and familiar to any reviewer               |
| Mock Graph API                                                               | **Real Meta only, tests included** | Mocks hide the failures that matter. Tests create real leads via `test_leads`. |
| Password auth                                                                | **No auth, risk documented**       | Outside the brief. An `X-Actor` header covers attribution.              |
| Keyset pagination, shared package, `If-Match`, rate limiting, reconciliation | **Cut (KISS)**                     | Not needed at this scale. Deferred as documented future work.           |
| Plain `pg`                                                                   | **Prisma**                         | Typed data layer, with one `$queryRaw` for `SKIP LOCKED`                |
| Railway                                                                      | **$0: Render + Vercel + Supabase** | Cold starts are absorbed by UI retries and Meta's own retries.          |

I also specified `PATCH /leads/:id`: editable fields only, `status` rejected, the same optimistic locking, a field-level diff in the audit record, and no activity on no-op writes.

## Core architecture

- **Postgres as the queue (inbox pattern).** Ack Meta fast and own the retries, without Redis.
- **Graph fetch inside the worker transaction.** A crash leaves nothing half-done.
- **Idempotency enforced by the database** through unique constraints, not app logic.
- **Each change and its audit record in one transaction.** An append-only trigger protects the audit table.
- **Optimistic locking** with `version` in the request body.
- **Lossless parsing** of Meta's numeric IDs.
- **RLS on with no policies** in Supabase.

Full trade-offs: [README](README.md#design-decisions-and-trade-offs).

## What review caught

- **A commit went in with a failing test.** It was chained on a `grep` that masked the exit code. After that, commits were gated on real exit codes.
- **A stale closure.** Mutation hooks captured the actor at creation, so the first save had no actor. The fix passes the actor with each call.
- **LIKE injection in search.** Prisma's `contains` doesn't escape `%`.
- **Only running it showed these:** Prisma emitted `.ts` import paths in Docker, and `vite preview` hit EACCES as the non-root user.
- **A layering violation.** A feature module imported from the app layer. It was moved before commit.
- **An AI-default palette.** It was replaced with zinc neutrals and one emerald accent.

## Test coverage

- **Against a real DB:** signature verification, idempotency (redeliveries, batches, concurrency), the status workflow, optimistic locking, atomicity (by injecting a DB failure), and retry/backoff/dead-lettering using real Graph errors.
- **Against the real Graph API:** `*.meta.test.ts`. These need credentials and fail loudly without them.
- **Not unit-tested:** web mutation hooks, which follows from the no-mocks decision. The API tests cover their server behaviour, and the flows were exercised end to end.
