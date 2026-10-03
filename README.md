# Email Orchestrator

[![CI](https://github.com/ranjitd-sys/email_orchestrator/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/ranjitd-sys/email_orchestrator/actions/workflows/ci.yml)

Two-part email orchestration system implementing the spec in
`docs/Email_Orchestrator_Final_State_Machine_Developer_Spec.md`.

## Layout

```
packages/shared     # enums + contract types (used by both apps)
packages/db         # migrations, schema, queries (orchestrator only)
apps/orchestrator   # Bun process: webhooks, state machine, scheduler, queue producer
apps/worker         # Cloudflare Worker: stateless email sender, queue consumer
docs/               # spec, build plan, task tracker
```

The split follows spec §11: the orchestrator owns business state and never calls an
email provider; the worker only executes sends and never chooses a sequence. They
talk through Cloudflare Queues only — there is no internal API and no Worker → 
orchestrator callback. The orchestrator publishes the full `SendPayload` and
correlates provider webhooks back to a send attempt through payload tags.

## Setup

```bash
bun install
cp .env.example .env    # then fill in values
bun run check           # typecheck both apps + run tests
```

## Local database

A `docker-compose.yml` runs `postgres:16-alpine` on `localhost:5432` with
database `email_orchestrator`, user/password `email`. Migrations live in
`packages/db/migrations` as default-export Effect programs and are applied by
`effect/sql`'s `Migrator`, which tracks applied versions in `effect_sql_migrations`.

```bash
bun run db:up          # start the container (first run pulls the image)
bun run db:migrate     # apply pending migrations (idempotent)
bun run db:psql        # shell into psql
bun run db:reset       # wipe the volume and start fresh
bun run db:down        # stop the container
```

## Commands

| Command | Purpose |
|---|---|
| `bun run check` | Typecheck both apps and run tests |
| `bun run typecheck` | Typecheck orchestrator + packages only |
| `bun run test` | Run tests |
| `bun run test:runtime` | Run the Bun-runtime tests only (what CI runs) |
| `bun run lint` | Lint the Bun-runtime sources with Biome |
| `bun run dev:orchestrator` | Start the orchestrator on :3000 |

## Continuous integration

`.github/workflows/ci.yml` runs on every push to `main`, every pull request to
`main`, on a weekly schedule, and on demand. It has a single job —
`Test (includes SAST CodeQL and SCA Dependabot)` — that checks out the repo,
calls the local composite action `.github/actions/setup` (which installs the Bun
version pinned in `.bun-version` and runs a frozen-lockfile install against a
`bun.lock`-keyed download cache), then runs typecheck, tests, and Biome lint.

CI deliberately covers the Bun runtime only. The Worker is a Cloudflare
deployment target with no local build step, so it is deployed with Alchemy
(`bun run worker:deploy`) rather than compiled here. Nothing in CI requires
PostgreSQL, network access, or secrets; all tests are hermetic.

`.github/dependabot.yml` tracks `bun`, `github-actions`, and `docker`
(the root `docker-compose.yml`) weekly.

### Security summary

The same job runs CodeQL (advanced setup, `security-and-quality` queries) and a
non-blocking `bun audit`, then writes **SAST (CodeQL)** and
**SCA (Dependabot)** cards into the run's job summary, each linking to the
Security tab. The cards render as Markdown — GitHub does not allow workflow
files to reproduce native card styling, so they are an information-equivalent
approximation.

The CodeQL card reads the code scanning API with the built-in `GITHUB_TOKEN`
(`security-events: write`); code scanning on a public repository is free and
requires no GitHub Advanced Security. The Dependabot card reads the Dependabot
alerts API, which the built-in token cannot access; add a repository secret named
`DEPENDABOT_ALERTS_TOKEN` (a classic PAT with the `security_events` scope, or a
fine-grained PAT with **Dependabot alerts: read**) to populate it. Without the
secret the card renders a short explanatory note instead of failing the job.

Because this workflow uses **advanced setup**, do not also enable CodeQL
**Default Setup** for this repository — GitHub rejects a repository that has both
for the same language.

### Worker (Cloudflare, via Alchemy)

The Worker's Cloudflare resources are declared in `apps/worker/alchemy.run.ts` —
there is no `wrangler.jsonc`. Alchemy provisions the Worker, the send queue, the
dead-letter queue, and the queue consumer.

```bash
cd apps/worker
bunx alchemy profile edit --add Cloudflare   # one-time auth
bun run plan      # preview
bun run deploy    # apply
bun run dev       # local emulation of queue + consumer
bun run destroy   # tear down
```

`bun run deploy` prints the account id and queue id; copy them into
`.env` for the orchestrator.

## Environment

See `.env.example`. The key ones:

- `DATABASE_URL` — hosted Postgres (source of truth)
- `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_QUEUE_ID`, `CLOUDFLARE_API_TOKEN` — the
  orchestrator pushes send jobs to the queue over HTTP; the token needs the
  `Queues Edit` permission
- `EMAIL_PROVIDER`, `RESEND_API_KEY`, `BREVO_API_KEY` — set on the Worker through
  Alchemy env, not read by the orchestrator

## State machine

Lead engagement lives in one XState v5 machine
(`apps/orchestrator/src/domain/transition.ts`) covering `NEW`, `NOT_OPENED`,
`OPENED`, `CLICKED`, `REPLIED` and `SUPPRESSED`. Transitions emit an ordered
action list (`CREATE_SEQUENCE`, `CANCEL_REMAINING`, `CANCEL_ALL_FUTURE`,
`SUPPRESS`, `RECORD_ONLY`) that the event processor applies in one transaction.
Event precedence (suppression → replied → clicked → opened) lives in
`apps/orchestrator/src/domain/precedence.ts`.

## Progress

Task tracking lives in `docs/Email_Orchestrator_Tasks.csv` (source of truth).
`docs/Email_Orchestrator_Schedule.csv` breaks it into 2-day sprints.
Run `bun run tasks` after editing the CSV to refresh `docs/BUILD_TASKS.md`.