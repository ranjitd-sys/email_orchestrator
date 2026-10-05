# Email Orchestrator — What We Built

*A guide for the whole team: engineers, new joiners, and leadership*

| | |
|---|---|
| **Stack** | Bun · TypeScript · Effect 4 · XState 5 · PostgreSQL 16 · Cloudflare |
| **Spec** | `docs/Email_Orchestrator_Final_State_Machine_Developer_Spec.md` |
| **Status** | Working end to end — 65 tests passing, 3 skipped |
| **Version** | 2.0 — illustrated edition |

---

## Contents

1. [At a glance](#1-at-a-glance)
2. [The story of one email](#2-the-story-of-one-email)
3. [How the system fits together](#3-how-the-system-fits-together)
4. [The scheduler flow](#4-the-scheduler-flow)
5. [Actors: logic per state and step](#5-actors-logic-per-state-and-step)
6. [One transaction per email](#6-one-transaction-per-email)
7. [The engagement state machine](#7-the-engagement-state-machine)
8. [The queue and the worker](#8-the-queue-and-the-worker)
9. [The database](#9-the-database)
10. [Running it](#10-running-it)
11. [Testing](#11-testing)
12. [What is built, what is next](#12-what-is-built-what-is-next)
13. [Glossary](#13-glossary)
14. [Design decisions and gotchas](#14-design-decisions-and-gotchas)

---

## 1. At a glance

The system sends **multi-step email sequences** that react to how each lead behaves. Someone
who never opens the first email follows a different path from someone who opens or clicks.

Two rules shape everything:

1. **The orchestrator owns business state** and decides what to send and when. It never calls
   an email provider.
2. **The worker only performs sends.** It never chooses a sequence or a step.

They communicate through a Cloudflare Queue only — no internal API, and no callback from the
worker back to the orchestrator.

![At a glance](diagrams/01-overview.png)

**The four stages, in plain words**

| Stage | What happens |
|---|---|
| **PULL** | Find an email whose send time has arrived, and lock it so nobody else takes it. |
| **DECIDE** | Ask the state machine what step this lead is on, then let that step's actor build the email. |
| **SEND** | Put the finished email on the queue and record the attempt. |
| **DELIVER** | The worker picks it up and hands it to Brevo or Resend. |

---

## 2. The story of one email

This is the easiest way to picture the whole system. Follow one lead.

![The story of one email](diagrams/03-story.png)

**Tuesday** — a lead is uploaded. The system creates a scheduled action for step `NO_1` with
a delay of zero days, so it is due immediately.

**Tuesday (later)** — the daily cron runs one tick. It finds `NO_1`, the state machine says
"this lead is in `NOT_OPENED`, on step `NO_1`", so the `NOT_OPENED` actor builds the email
and schedules `NO_2` for two days later. The payload goes on the queue.

**Wednesday** — the worker sends it through the email provider.

**Friday** — `NO_2` is now due, so the next tick sends it and schedules `NO_3` for three days
after that.

**Saturday** — the lead opens `NO_1`. The lead moves to `OPENED`, the remaining `NOT_OPENED`
steps are cancelled, and the `OPENED` sequence takes over.

**One precision detail:** a "two day" step becomes due exactly two days after the previous
one is processed, but it is actually *sent* at the next daily run. So in practice a two-day
step is **two to three days**. Running the tick hourly would tighten this — the flow is
idempotent, so a higher frequency is safe.

---

## 3. How the system fits together

![System architecture](diagrams/02-architecture.png)

### The four pieces

| Piece | Where it runs | Job |
|---|---|---|
| **Orchestrator server** | Your machine, always on | Serves `/health`, holds the database connection. Never sends. |
| **Scheduler tick** | Your machine, once a day via cron | Pulls due emails, decides, builds payloads, enqueues. Exits when done. |
| **Cloudflare Queue** | Cloudflare | Durable buffer between the two. |
| **Worker** | Cloudflare | Consumes the queue and calls the email provider. |

### Why the scheduler is a separate process

The orchestrator has to stay up for health checks and, later, webhooks. Sending is batch
work, so it runs on a timer instead. This keeps the two concerns independent: the server is
long-lived, the tick is short-lived.

### Where each piece is deployed

| Piece | Development | Production |
|---|---|---|
| PostgreSQL | `docker compose up` | Managed host (Neon, Supabase, RDS) |
| Orchestrator + cron | `bun run` on your laptop | Any Bun host: systemd, PM2, Docker, Railway, Fly |
| Queue + Worker | `bun run worker:dev` (local emulation) | Cloudflare via Alchemy |

---

## 4. The scheduler flow

Every due email goes through one machine with three stages.

![The scheduler flow](diagrams/04-flow.png)

### PULLED

The flow loads the due row with a lock:

```sql
where sa.id = $1
for update of sa skip locked
```

- **No row** — another run already took it. Skip quietly.
- **Stale** — the lead has moved on (for example the action is a `NOT_OPENED` step but the
  lead is now `OPENED`). Cancel it and send nothing.

### DECIDED — where the interesting work happens

`DECIDED` is a **compound state that mirrors the engagement state machine**, so every state
and every step is its own node.

![DECIDED compound state](diagrams/06-compound.png)

The substates are generated from `STEP_SEQUENCE` in `transition.ts`, which means both
machines share one list of steps. Add a step there and a node appears here automatically.

Each leaf node carries a hint saying which actor handles it. The machine names the actor;
the driver calls it.

### SENT

Three things happen, in this order, inside one transaction:

1. `publisher.push(payload)` — put the email on the queue.
2. `insertSendAttempt(...)` — record the attempt and mint its id.
3. `markActionQueued(...)` — flip the action to `QUEUED`.

Because they share a transaction, the queue push and the database state cannot drift apart
silently.

### What happens to the action status

![Action lifecycle](diagrams/10-status.png)

Two guarantees are worth remembering:

- Only `SCHEDULED` rows whose `execute_at` has passed are swept, and the row lock means two
  runs can never process the same action.
- A partial unique index stops the same lead, sequence and step being scheduled twice while
  it is still in progress.

---

## 5. Actors: logic per state and step

Each state and step can own its own logic. That is how a different email, subject or delay
gets built for `NO_1` versus `O_2`.

![Actors](diagrams/07-actors.png)

```ts
registerStepActor("NO_1", no1Actor);        // highest priority
registerStateActor("OPENED", openedActor);  // applies to all O_* steps
```

An actor does exactly three things:

1. **Builds the payload** for its own step.
2. **Creates the next step** at `now + delay_days`.
3. **Returns both**, so `SENT` can enqueue without knowing anything about the step's logic.

`defaultActor` does all three generically, so a fresh step works with no extra code.

Registering a custom actor for a single step:

```ts
registerStepActor("NO_1", {
  name: "no1Actor",
  decide: (row, result) =>
    Effect.gen(function* () {
      const sendAttemptId = crypto.randomUUID();
      const payload = { ...buildSendPayload(row, sendAttemptId), subject: "First touch" };
      const nextStepCode = yield* persistNextStep(row, result);
      return { actor: "no1Actor", result, payload, sendAttemptId, nextStepCode };
    }),
});
```

---

## 6. One transaction per email

This section explains a real bug we hit, because it is the easiest mistake to make again.

![Transaction](diagrams/08-transaction.png)

The first version asked XState to invoke the actors directly with `fromPromise`. **Every
integration test timed out at five seconds.**

**Why:** in Effect 4, `SqlClient.withTransaction` hands the reserved database connection to
the work through the *fiber context*. A `fromPromise` actor body runs on a brand new root
fiber, which does not inherit it. Its queries therefore take a *different* connection from
the pool — outside the transaction — and then block forever waiting for a row lock that the
outer transaction is still holding.

**The rule we settled on:** the state picks the actor, the driver runs it, on the same fiber.

```
  machine state        driver, same fiber              database
  -------------        ------------------              --------
  PULLED   ──►         pullStage()              ──►    SELECT … FOR UPDATE SKIP LOCKED
  DECIDED  ──►         actorFor(...).decide()    ──►    INSERT scheduled_actions
  SENT     ──►         sendStage()              ──►    INSERT send_attempts
                                                     UPDATE … → QUEUED
                                                     COMMIT
```

If any stage fails, the machine records the failure **and** the effect re-fails, so the
transaction rolls back. Nothing half-sent survives.

---

## 7. The engagement state machine

`domain/transition.ts` is pure decision logic. It does no I/O — it just answers "given where
this lead is and what just happened, what happens next?"

![Engagement state machine](diagrams/05-engagement.png)

It returns the new position plus an ordered list of actions:

| Action | Meaning |
|---|---|
| `CREATE_STEP` | Schedule the next outbound step of this sequence. |
| `COMPLETE_SEQUENCE` | The last step finished; mark the sequence done. |
| `CANCEL_REMAINING` | A better sequence started; cancel the old one. |
| `CANCEL_ALL_FUTURE` | A terminal event arrived (replied); stop everything. |
| `SUPPRESS` | Never contact this lead again. |
| `RECORD_ONLY` | Noted, but nothing changes. |

### When several events arrive at once

Events are applied in a fixed order so the strongest signal wins:

```
1.  suppression      HARD_BOUNCE · SPAM · UNSUBSCRIBED · INVALID_EMAIL · DO_NOT_CONTACT
2.  REPLIED
3.  CLICKED
4.  OPENED / UNIQUE_OPENED
5.  DELIVERED
6.  SENT
7.  everything else
```

---

## 8. The queue and the worker

![The queue](diagrams/09-queue.png)

The queue is the only link between the two processes. The orchestrator pushes a fully formed
payload; the worker consumes it and decides what to do on failure:

| Outcome | What the worker does |
|---|---|
| Sent | `ack()` the message |
| Transient failure (`429` or `5xx`) | `retry()` — the queue redelivers |
| Permanent failure (anything else) | `ack()` and record it as failed |

Messages that exhaust their retries land in the dead-letter queue for inspection.

### Which publisher is used

If the Cloudflare environment variables are present, the real queue is used. Otherwise the
system falls back to an in-memory queue.

> **Gotcha:** the in-memory queue lives in process memory, and the cron tick exits right
> after it runs. Anything queued locally is lost. Real sending needs the Cloudflare values.

### Choosing the email provider

One environment variable on the worker decides which provider is used:

| `EMAIL_PROVIDER` | Behaviour |
|---|---|
| `brevo` | Calls the Brevo send API. |
| `resend` | Calls the Resend send API. |
| `mock` | Pretends to send — for staging and tests. |

---

## 9. The database

![Data model](diagrams/11-er.png)

PostgreSQL is the single source of truth for both state and timing.

### The two tables that matter most

- **`scheduled_actions`** — the unit of work. One lead, one step, one send time, one status.
- **`leads`** — the person, plus `engagement_state`, which is the lead's position in the state
  machine.

### The rest

| Table | Purpose |
|---|---|
| `sequences` / `sequence_steps` | The ordered steps per sequence, with `delay_days`. |
| `templates` | The subject and body text for each step. |
| `campaigns` / `datasets` | Grouping and configuration. |
| `domains` / `mailboxes` | Sending identity and per-day limits. |
| `send_attempts` | One row per send attempt, correlated by provider message id. |
| `email_events`, `job_transitions`, `suppression_list` | Reserved for the pending webhook work — nothing writes them yet. |

---

## 10. Running it

### First-time setup

```bash
bun install
cp .env.example .env      # fill in DATABASE_URL and the Cloudflare values
```

### The database

```bash
bun run db:up        # start Postgres in Docker
bun run db:migrate   # apply migrations (safe to re-run)
bun run db:seed      # optional demo campaign, templates and a test lead
bun run db:psql      # open a database shell
```

### The orchestrator (stays up)

```bash
bun run dev:orchestrator        # http://localhost:3000/health
```

### The scheduler (once a day)

Run it by hand whenever you like:

```bash
bun run scheduler:tick
```

Then let cron do it — add this with `crontab -e`:

```cron
0 9 * * * cd /home/ranjit/Documents/deepecom/Email && /home/ranjit/.bun/bin/bun run scheduler:tick >> /tmp/email-scheduler.log 2>&1
```

The `cd` matters: Bun loads the `.env` file from the current directory.

### The worker

```bash
cd apps/worker
bunx alchemy profile edit --add Cloudflare   # one-time sign-in
bun run plan        # preview what will be created
bun run deploy      # create it, then copy the printed ids into .env
bun run dev         # run it locally instead
```

---

## 11. Testing

```bash
bun run check        # typecheck everything, then run every test
bun run lint         # code style
bun run typecheck    # types only
```

**Current result: 65 passing, 3 skipped, 0 failing.**

| Test file | What it proves |
|---|---|
| `transition.test.ts` | Engagement transitions and the actions they emit. |
| `precedence.test.ts` | Events are ranked in the right order. |
| `branch-switch.test.ts` | Switching between NOT_OPENED, OPENED and CLICKED. |
| `orchestrator-machine.test.ts` | The three stages, per-step routing, skip and failure routes. |
| `actors.test.ts` | Step beats state beats default; next-step creation. |
| `flow-payload.test.ts` | Row to payload mapping. |
| `flow.integration.test.ts` | Real Postgres: enrol, send, schedule the next step, cancel on interrupt. |
| `apps/worker/test/send.test.ts` | Provider adapters and retry-versus-fail classification. |

The database tests only run when both variables are set:

```bash
DATABASE_URL="postgresql://email:email@localhost:5432/email_orchestrator" \
RUN_DB_TESTS=1 bun test apps/orchestrator/tests/flow.integration.test.ts
```

We also verified it live: forcing a due step and running the tick produced
`NO_1 QUEUED | NO_2 QUEUED | NO_3 SCHEDULED`.

---

## 12. What is built, what is next

### Working today

- The full database schema, migrations, and a repeatable demo seed.
- The engagement state machine with nested steps, plus event precedence.
- The `PULLED → DECIDED → SENT` flow, with per-step routing inside `DECIDED`.
- A per-step actor registry with state-level and default fallbacks.
- Transaction-safe execution: all flow work commits or rolls back as one unit.
- The queue publisher, the worker, three provider adapters, a dead-letter queue.
- A daily cron entrypoint, with the orchestrator kept separate and always on.
- 65 unit tests and 3 database integration tests, all green.

### Still open

| Item | Why it matters |
|---|---|
| **Event processor** | Provider webhooks do not yet change lead state. This is the biggest gap: opens, clicks and replies are not fed back in yet. |
| **Sequence completion** | The machine emits "sequence complete" but nothing writes it. |
| **Real credentials** | Cloudflare queue, an email provider key, and hosted Postgres. |
| **Real templates** | The demo copy is placeholders. |
| **Delivery and open tracking** | Not enabled; the correlation loop is not closed. |

The queries these features need are already written in `packages/db/src/queries.ts` — they
just have no caller yet.

---

## 13. Glossary

| Term | Meaning |
|---|---|
| **Lead** | A person we are emailing. |
| **Engagement state** | Where the lead sits: `NEW`, `NOT_OPENED`, `OPENED`, `CLICKED`, `REPLIED`, `SUPPRESSED`. |
| **Sequence** | A track of emails for one behaviour, e.g. "they never opened it". |
| **Step** | One email inside a sequence, e.g. `NO_2`, with its own delay and template. |
| **Scheduled action** | The unit of work: one lead, one step, one send time. |
| **Actor** | The piece of logic for one state or step that builds an email. |
| **Tick** | One run of the scheduler: find everything due, process it, exit. |
| **Payload** | The finished email, ready to hand to a provider. |
| **Send attempt** | A record of one delivery, used to match provider webhooks back to us. |
| **Suppression** | A permanent "never contact this person" flag. |

---

## 14. Design decisions and gotchas

1. **Everything lives in `domain/`.** The scheduler used to sit in
   `apps/orchestrator/src/scheduler/`. It was moved next to the machine it consumes so the
   flow and the transition logic read as one unit. That directory no longer exists.

2. **One flow, not a pipeline of stages.** `PULLED → DECIDED → SENT` replaced an earlier
   five-state machine. The actor does the building, so a separate build stage was not needed.

3. **`DECIDED` mirrors the engagement machine on purpose.** Substates are generated from
   `STEP_SEQUENCE`, so the two machines can never drift apart.

4. **Actors run on the transaction fiber, never in an async invoke.** See section 6 — this
   is the easiest way to break the flow.

5. **A daily cron means day-level granularity.** See section 2. Running the tick more often
   tightens it, and the flow is safe to run repeatedly.

6. **`REPLIED` is modelled in code but not in the database.** The shared types include a
   `REPLIED` sequence type, and the machine tracks `R_1` to `R_3` with a no-outbound default.
   However the `sequences` table only allows `NOT_OPENED`, `OPENED` and `CLICKED`, so a
   `REPLIED` sequence row would be rejected until that constraint is widened.

7. **Cancelling interrupted steps happens on the scheduler side.** If a lead's state no longer
   matches the action, the action is cancelled when it is picked up. The event that *causes*
   the interrupt still has to arrive through the pending webhook work.

8. **The in-memory queue is not a production queue.** It is an array in a process that exits
   immediately.