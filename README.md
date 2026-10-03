# Email Orchestrator

Two-part email orchestration system implementing the spec in
`docs/Email_Orchestrator_Final_State_Machine_Developer_Spec.docx`.

## Layout

```
packages/shared     # enums + contract types (used by both apps)
packages/db         # migrations, schema, queries (orchestrator only)
apps/orchestrator   # Bun process: webhooks, state machine, scheduler, queue producer
apps/worker         # Cloudflare Worker: stateless email sender, queue consumer
docs/               # spec, build plan, task tracker
```

The split follows spec §11: the orchestrator owns business state and never calls
Brevo; the worker only executes sends and never chooses a sequence. They talk
through Cloudflare Queues, plus two internal HTTP endpoints (`claim`, `result`).

## Setup

```bash
bun install
cp .env.example .env    # then fill in values
bun run check           # typecheck both apps + run tests
```

## Local database

A `docker-compose.yml` runs `postgres:16-alpine` on `localhost:5432` with
database `email_orchestrator`, user/password `email`. Migrations are plain SQL
in `packages/db/migrations`, applied by a small Bun runner.

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
| `bun run dev:orchestrator` | Start the orchestrator on :3000 |

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
- `INTERNAL_API_SECRET` — shared secret authenticating Worker → orchestrator calls

## Progress

Task tracking lives in `docs/Email_Orchestrator_Tasks.csv` (source of truth).
`docs/Email_Orchestrator_Schedule.csv` breaks it into 2-day sprints.
Run `bun run tasks` after editing the CSV to refresh `docs/BUILD_TASKS.md`.