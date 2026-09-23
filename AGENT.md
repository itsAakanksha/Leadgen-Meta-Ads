# AGENT.md: How AI was used to build this project

This project was built with an AI coding agent working under close human direction. This file covers:

- which tools were used
- the prompts that shaped the work
- who decided what
- which parts were AI-generated or written by hand
- the mistakes the AI made and how they were caught

The detailed, step-by-step record is in [`notes/ai-log.md`](notes/ai-log.md). It was written as the work happened, one entry per commit.

---

## Tools

| Tool                                                                                                                      | Used for                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Claude Code** (Claude Opus 5.5), in VS Code                                                                             | Planning, all code, tests, config, docs, running commands and checks, visual checks (headless Chrome screenshots) |
| **Design skills** installed in `.agents/skills/`: `ui-ux-pro-max`, `design-taste-frontend`, `vercel-react-best-practices` | Frontend design system, anti-"AI default" design checks, React performance rules                                  |
| **`ui-ux-pro-max` search tool** (`search.py --design-system`, `--stack shadcn`)                                           | Generating and cross-checking the design system                                                                   |
| **shadcn/ui CLI**                                                                                                         | Generating the component primitives (Radix base)                                                                  |
| **Meta for Developers docs** (fetched by the agent)                                                                       | Webhook, lead retrieval and test-lead behaviour; permissions; Development vs Live mode                            |

---

## How the work was run

The human set the process in the first prompt, and it was followed for every step:

1. **Plan before code.** The agent proposed architecture, data model, API contracts, folder structure and a commit plan. **No code was written until the human approved the plan.**
2. **Build in small steps.** After each step the agent ran tests, lint and typecheck, wrote one Conventional Commit, and appended an entry to `notes/ai-log.md`.
3. **Ask rather than guess.** Where a requirement was ambiguous, the agent asked multiple-choice questions and the human chose.
4. **Prefer simple, reasoned solutions.** Anything added had to be explained.

**Verification discipline:**

- Commits were gated on passing tests. One exception, described under "Mistakes", was caught and fixed in a follow-up commit.
- Containers were built and actually run.
- The UI was checked with screenshots at desktop and mobile widths.
- Contrast ratios were computed rather than assumed.

---

## Key prompts

**Initial brief (abridged):**

> You are a senior full-stack engineer. Build a take-home assignment… Build a Lead Intake Service. A Meta Ads webhook sends leads to our system. The app must receive, store, audit and display them. [endpoints, frontend views, audit trail, stack, deliverables]
>
> Facts about Meta Lead Ads webhooks (get these right): [GET handshake, X-Hub-Signature-256 over raw bytes with constant-time compare, IDs-only payload, Graph API fetch with a Page token, retries and batching, keep IDs as strings…]
>
> Quality bar: idempotent ingestion; each change and its audit record written atomically; no-op changes create no activity; status workflow with validation; handle concurrent edits; no secrets or PII in logs; filtering/search/pagination with loading/empty/error states, responsive and accessible; tests that cover the risky parts; one-command local run.
>
> How to work: propose first and wait for approval; build in small steps; after each, run tests/lint/typecheck, suggest a commit, append to `notes/ai-log.md`; ask instead of guessing.

**Prompts that changed the direction (paraphrased):**

- "Can we use Express?"
- "Why use Next.js _and_ Express? Which should we use and why?"
- "Why are we using login? The assignment didn't ask for it."
- "Check what is overly complicated in our docs. Also, we want direct real Meta data, no mock data."
- "I want you to use Prisma."
- "Explore the Meta docs thoroughly. Make sure we fetch all the important lead data, and look for anything we're missing."
- "Verify whether you're following industry-recommended folder structures."
- "Check you used good names and followed KISS."
- "Use shadcn for reusable components, and use the ui-ux-pro-max, vercel-react-best-practices and taste design skills" (in `.agents/skills/`).

---

## Who decided what

The agent proposed options with trade-offs; the human decided. Human decisions that changed the agent's proposals:

| Area           | Agent proposed                                                                                     | Human decided                                                                                                           | Effect                                                                                                        |
| -------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Backend        | Fastify                                                                                            | **Express**                                                                                                             | Express 5 (native async errors)                                                                               |
| Frontend       | Next.js as a backend-for-frontend                                                                  | Asked why two servers were needed; agreed to **Vite React SPA + one Express backend**                                   | All rules in one backend; same-origin proxy                                                                   |
| Auth           | Password login                                                                                     | **No auth** (not in scope)                                                                                              | `X-Actor` display name for attribution; the risk is documented in the README                                  |
| Meta data      | A mock Graph API so the flow works without Meta                                                    | **Real Meta only, no mocks, including tests**                                                                           | Tests create real leads through `POST /{form_id}/test_leads`; failure paths use real Graph errors             |
| Scope          | Keyset pagination, shared package, `If-Match`, rate limiting, form-label fetch, reconciliation job | **Simplify (KISS)**                                                                                                     | Offset pagination, `allowedTransitions` from the API, `version` in the body; the rest deferred to future work |
| Hosting        | Railway                                                                                            | **$0 hosting** → Render free                                                                                            | Cold starts, handled by UI retries and Meta's own retries                                                     |
| ORM            | Plain `pg`                                                                                         | **Prisma**                                                                                                              | Prisma 7 with a driver adapter; one `$queryRaw` for `SKIP LOCKED`                                             |
| Structure      | Initial folder layout                                                                              | **Check it against industry references, then apply KISS and naming**                                                    | Business modules plus flat role-suffixed files (API); Bulletproof React (web); one name per concept           |
| Extra endpoint | —                                                                                                  | **Add `PATCH /leads/:id` with explicit rules** (editable fields only, reject `status`, same locking, field diff, no-op) | Real `LEAD_UPDATED` events                                                                                    |
| UI             | Hand-rolled components, warm-paper palette                                                         | **shadcn/ui plus three design skills**                                                                                  | Rebuilt on shadcn; palette replaced (see below)                                                               |

**Architecture decisions and their rationale** are summarised in the README's [Design decisions and trade-offs](README.md#design-decisions-and-trade-offs) and in the plan entry of the AI log. The main ones:

- **Inbox pattern (Postgres as the queue):** acknowledge Meta fast and own the retries, without Redis.
- **The Graph fetch runs inside the worker transaction,** so a crash leaves nothing half-done.
- **Database-enforced idempotency** through unique constraints.
- **One transaction per change and its audit record,** plus an append-only trigger on the audit table.
- **Optimistic locking** with `version` in the request.
- **Lossless ID parsing** for Meta's numeric IDs.
- **RLS on with no policies** in Supabase.

---

## AI-generated vs. hand-written

**AI-generated (reviewed and directed by the human):**

- all application code (API and web), SQL migrations, Prisma schema
- all tests
- Dockerfiles, docker-compose, CI workflow, Render and Vercel config
- README and this file (drafted from the AI log)
- shadcn/ui primitives in `apps/web/src/components/ui/`, generated by the shadcn CLI and then adjusted (tokens, icons, no `next-themes`)

**Done by the human:**

- The brief, the process, and every architectural and scope decision above.
- Plan reviews that caught over-complication and pushed toward KISS, real Meta data, and industry folder structure.
- Meta app setup: Business app, webhook subscription, Page token, test and demo forms, Live mode.
- Supabase, Render and Vercel accounts and deployment.
- _Human: list any code or doc edits you made by hand here._

---

## Mistakes the AI made, and how they were caught

Recorded honestly because they show where human review and verification mattered.

- **Chose a banned palette.** The first UI palette (warm paper + near-black ink) is on the taste skill's list of AI-default palettes. It was replaced with zinc neutrals and one emerald accent.
- **Hard-coded the developer's personal email** into the privacy page. The agent caught this itself and moved it to a build-time variable before committing.
- **Committed with a failing test.** A step-12 commit was chained on a `grep` that succeeded even though one test had failed. That test hit a 10 s Graph timeout on a slow network. The agent confirmed it was not a regression and fixed the test in a separate commit. After that, commits were gated on test exit codes.
- **Reformatted the human's skill files.** `pnpm format` rewrote whitespace in the untracked `.agents/skills/*.md` files, which can't be restored from git. The human was told, and `.agents/` was added to the Prettier and ESLint ignore lists.
- **Broke the one-way import rule.** A feature module imported from the app layer (route preloading). It was moved to `app/lazy-routes.ts` before commit.
- **Stale closure bug.** The mutation hooks captured the display name when they were created, so the first save after entering a name would have had no actor. Fixed by passing the actor with each call.
- **Bugs found only by running the real thing:**
  - Prisma emitted `.ts` import paths inside Docker (the client is generated before `tsconfig.json` is copied in), so the container crashed. Fixed by pinning the generator options.
  - `vite preview` got EACCES as the non-root user.
  - Search treated `%` as a wildcard: Prisma's `contains` doesn't escape LIKE patterns.
  - An accessible name read "Acting asSam". Found by a test.
- **Misread generated code.** The agent assumed `import { cn } from "cn"` in shadcn's output was broken; it is shadcn's own package. The resulting change was harmless.

---

## What the tests prove (and don't)

- **Proven against a real database:**
  - signature verification
  - idempotency: redeliveries, batches and concurrent deliveries
  - the status workflow
  - optimistic locking across both PATCH endpoints
  - atomicity, by injecting a real DB failure
  - retry, backoff and dead-lettering, using real Graph errors
- **The full pipeline against the real Graph API** (`*.meta.test.ts`) needs Meta credentials. These tests fail loudly if the credentials are missing.
  - _Human: note here when they were first run green with your credentials._
- **The web mutation hooks are not unit-tested with a mocked API,** consistent with the no-mocks decision. Their server behaviour is covered by the API tests, and the flows were exercised end to end through the real stack.
