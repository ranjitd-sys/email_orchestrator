# Email Orchestrator — Build Plan

**Source of truth:** `Email_Orchestrator_Tasks.csv` · **Schedule:** `Email_Orchestrator_Schedule.csv`
Regenerate this file: `bun run tasks`

| | |
|---|---|
| Sprints | 15 × 2 days |
| Working days | 30 |
| Total effort | 190 h |
| Tasks | 76 |
| Status | 34 done · 0 in progress · 28 todo |

**Legend** — `[ ]` todo · `[~]` in progress · `[x]` done · `[!]` blocked · `[-]` skipped

### How this is organised

| Column | Meaning |
|---|---|
| `sprint` | Which 2-day sprint the task belongs to |
| `why` | Plain-language reason the task exists |
| `spec_ref` | Section of the spec docx this satisfies |
| `acceptance_tests` | Which of T01–T15 it verifies |
| `blocked_by` | Task ids that must finish first |
| `estimate_h` | Estimated hours |

---

## Roadmap at a glance

| Sprint | Dates | Phase | Tasks | Hours |
|---|---|---|---|---|
| 1 | 2026-10-05 → 2026-10-06 | Scaffold + Schema | 7 | 12 h |
| 2 | 2026-10-07 → 2026-10-08 | Schema | 7 | 12 h |
| 3 | 2026-10-09 → 2026-10-12 | Schema | 7 | 12 h |
| 4 | 2026-10-13 → 2026-10-14 | Schema + Domain engine + Event processor + Scaffold | 13 | 25 h |
| 5 | 2026-10-15 → 2026-10-16 | Domain engine + Event processor | 7 | 22 h |
| 6 | 2026-10-19 → 2026-10-20 | Event processor | 5 | 12 h |
| 7 | 2026-10-21 → 2026-10-22 | Event processor | 5 | 10 h |
| 8 | 2026-10-23 → 2026-10-26 | Event processor | 2 | 11 h |
| 9 | 2026-10-27 → 2026-10-28 | Scheduler + sequences | 3 | 10 h |
| 10 | 2026-10-29 → 2026-10-30 | Scheduler + sequences | 3 | 11 h |
| 11 | 2026-11-02 → 2026-11-03 | Queue producer + internal API | 3 | 11 h |
| 12 | 2026-11-04 → 2026-11-05 | Queue producer + internal API + CF Worker | 4 | 10 h |
| 13 | 2026-11-06 → 2026-11-09 | CF Worker | 4 | 12 h |
| 14 | 2026-11-10 → 2026-11-11 | CF Worker + Hardening | 3 | 9 h |
| 15 | 2026-11-12 → 2026-11-13 | Hardening | 3 | 11 h |

---

## Sprints in detail

### Sprint 1 — 2026-10-05 → 2026-10-06

_Phase 0 - Scaffold → Phase 1 - Schema · 7 tasks · 12 h_

- [x] **1** Init Bun workspaces (packages/* apps/*)
  <sub>Everything else lives in a workspace · spec P0 · **critical** · 2 h</sub>
- [x] **2** Add deps: alchemy typescript @types/bun wrangler
  <sub>Orchestrator needs a Postgres driver · spec P0 · **critical** · 1 h · needs 1 (Init Bun workspaces (packages/* apps/*))</sub>
  > Orchestrator: effect@4, @effect/sql-pg, @effect/platform-node, xstate@5. Worker: alchemy@2.0.0-beta.80. porsager postgres was dropped once @effect/sql-pg landed.
- [x] **3** Create .env.example (DATABASE_URL CLOUDFLARE_ACCOUNT_ID CLOUDFLARE_QUEUE_ID CLOUDFLARE_API_TOKEN EMAIL_PROVIDER RESEND_API_KEY BREVO_API_KEY PORT)
  <sub>Secrets must never be committed · spec P0 · **critical** · 1 h · needs 2 (Add deps: alchemy typescript @types/bun )</sub>
  > INTERNAL_API_SECRET removed with the callback architecture; worker is callback-free.
- [x] **4** Add bun test and typecheck scripts
  <sub>Catch type errors before they compound · spec P0 · high · 1 h · needs 2 (Add deps: alchemy typescript @types/bun )</sub>
- [!] **5** Provision hosted Postgres database
  <sub>Source of truth for all 15 tables · spec P0 · **critical** · 4 h</sub>
  > Local Docker Postgres running (docker-compose.yml, port 5432); hosted still pending
- [x] **6** Migration: leads (engagement state contact identity suppression)
  <sub>Holds the engagement state (spec 2) · spec §9 · T08, T09, T10 · **critical** · 2 h · needs 5 (Provision hosted Postgres database)</sub>
  > packages/db/migrations/0001_init.sql (all 14 tables in one migration)
- [x] **7** Migration: datasets
  <sub>spec §9 · T14 · high · 1 h · needs 5 (Provision hosted Postgres database)</sub>
  > packages/db/migrations/0001_init.sql (all 14 tables in one migration)

### Sprint 2 — 2026-10-07 → 2026-10-08

_Phase 1 - Schema · 7 tasks · 12 h_

- [x] **8** Migration: campaigns
  <sub>spec §9 · T01, T15 · high · 1 h · needs 5 (Provision hosted Postgres database)</sub>
  > packages/db/migrations/0001_init.sql (all 14 tables in one migration)
- [x] **9** Migration: sequences
  <sub>spec §7 · high · 1 h · needs 5 (Provision hosted Postgres database)</sub>
  > packages/db/migrations/0001_init.sql (all 14 tables in one migration)
- [x] **10** Migration: sequence_steps (order N_DAYS delay template conditions)
  <sub>Defines N_DAYS delays per step · spec §7 · T01, T02, T15, T14 · **critical** · 2 h · needs 5 (Provision hosted Postgres database)</sub>
  > packages/db/migrations/0001_init.sql (all 14 tables in one migration)
- [x] **11** Migration: templates
  <sub>spec §9 · T14 · high · 1 h · needs 5 (Provision hosted Postgres database)</sub>
  > packages/db/migrations/0001_init.sql (all 14 tables in one migration)
- [x] **12** Migration: scheduled_actions (lifecycle status)
  <sub>The schedule itself (spec 6) · spec §6 · T01, T02, T11 · **critical** · 3 h · needs 5 (Provision hosted Postgres database)</sub>
  > packages/db/migrations/0001_init.sql (all 14 tables in one migration)
- [x] **13** Migration: send_attempts (immutable provider correlation)
  <sub>One row per outbound attempt · spec §9 · T12, T14, T10 · **critical** · 2 h · needs 5 (Provision hosted Postgres database)</sub>
  > packages/db/migrations/0001_init.sql (all 14 tables in one migration)
- [x] **14** Migration: email_events (immutable normalized provider events)
  <sub>Immutable provider history · spec §5 · T03, T12 · **critical** · 2 h · needs 5 (Provision hosted Postgres database)</sub>
  > packages/db/migrations/0001_init.sql (all 14 tables in one migration)

### Sprint 3 — 2026-10-09 → 2026-10-12

_Phase 1 - Schema · 7 tasks · 12 h_

- [x] **15** Migration: job_transitions (audit trail)
  <sub>Audit trail for every transition · spec §5 · T14 · **critical** · 2 h · needs 5 (Provision hosted Postgres database)</sub>
  > packages/db/migrations/0001_init.sql (all 14 tables in one migration)
- [x] **16** Migration: suppression_list
  <sub>spec §9 · T08, T09, T10 · high · 1 h · needs 5 (Provision hosted Postgres database)</sub>
  > packages/db/migrations/0001_init.sql (all 14 tables in one migration)
- [x] **17** Migration: domains
  <sub>spec §9 · T14 · medium · 1 h · needs 5 (Provision hosted Postgres database)</sub>
  > packages/db/migrations/0001_init.sql (all 14 tables in one migration)
- [x] **18** Migration: mailboxes
  <sub>spec §9 · T14 · medium · 1 h · needs 5 (Provision hosted Postgres database)</sub>
  > packages/db/migrations/0001_init.sql (all 14 tables in one migration)
- [x] **19** Migration: experiments (optional A/B)
  <sub>spec §9 · low · 2 h · needs 5 (Provision hosted Postgres database)</sub>
  > packages/db/migrations/0001_init.sql (all 14 tables in one migration)
- [x] **20** Attribution FKs on scheduled_actions and send_attempts
  <sub>Answers 'which dataset sent this' · spec §10 · T14 · **critical** · 4 h · needs 6 (Migration: leads (engagement state conta), 7 (Migration: datasets), 8 (Migration: campaigns), 9 (Migration: sequences), 10 (Migration: sequence_steps (order N_DAYS ), 11 (Migration: templates), 17 (Migration: domains), 18 (Migration: mailboxes)</sub>
  > dataset_id/lead_id/campaign_id/sequence_id/step_id FKs present in 0001_init
- [x] **21** Constraint UNIQUE(provider_event_id)
  <sub>Blocks duplicate OPENED/CLICKED · spec §12 · T03, T12 · **critical** · 1 h · needs 14 (Migration: email_events (immutable norma)</sub>
  > email_events.provider_event_id UNIQUE present in 0001_init

### Sprint 4 — 2026-10-13 → 2026-10-14

_Phase 1 - Schema → Phase 2 - Domain engine → Phase 3 - Event processor → Phase 0 - Scaffold · 13 tasks · 25 h_

- [-] **22** Constraint UNIQUE(send_attempt_id)
  <sub>spec §12 · T12 · **critical** · 1 h · needs 13 (Migration: send_attempts (immutable prov), 14 (Migration: email_events (immutable norma)</sub>
  > Kept non-unique on purpose: one attempt legitimately emits many opens/clicks. Per-attempt dedupe comes from UNIQUE(provider_event_id) + event precedence. Revisit only if spec S12 changes.
- [ ] **23** Idempotency key against duplicate first-step creation
  <sub>Guarantees only one O_1 / C_1 · spec §12 · T03, T04, T05 · **critical** · 3 h · needs 12 (Migration: scheduled_actions (lifecycle ), 20 (Attribution FKs on scheduled_actions and), 21 (Constraint UNIQUE(provider_event_id))</sub>
  > Partially done: the Resend adapter sends Idempotency-Key = sendAttemptId. Still missing: DB-level guard so a replayed first-step event cannot create a duplicate O_1/C_1 action.
- [x] **24** Enums: EngagementState (NEW NOT_OPENED OPENED CLICKED REPLIED SUPPRESSED)
  <sub>spec §2 · high · 1 h · needs 6 (Migration: leads (engagement state conta)</sub>
  > ENGAGEMENT_STATES in packages/shared/src/index.ts
- [x] **25** Enums: event types (SEND OPENED UNIQUE_OPENED CLICKED REPLIED HARD_BOUNCE SPAM UNSUBSCRIBED INVALID_EMAIL DELIVERED SENT)
  <sub>spec §3 · high · 1 h · needs 6 (Migration: leads (engagement state conta)</sub>
  > DOMAIN_EVENTS + SUPPRESSION_EVENTS + PROMOTING_EVENTS in packages/shared/src/index.ts
- [x] **26** Enums: sequence types (NOT_OPENED OPENED CLICKED REPLIED SUPPRESSED)
  <sub>spec §7 · high · 1 h · needs 9 (Migration: sequences)</sub>
  > Decision: only NOT_OPENED/OPENED/CLICKED are sequences. REPLIED and SUPPRESSED are terminal states with no sequence rows. See SEQUENCE_TYPES.
- [x] **27** Enums: scheduled action status (SCHEDULED QUEUED PROCESSING SENT RETRY_SCHEDULED CANCELLED FAILED COMPLETED)
  <sub>spec §6 · high · 1 h · needs 12 (Migration: scheduled_actions (lifecycle )</sub>
  > ACTION_STATUSES in packages/shared/src/index.ts
- [-] **28** Pure transition() encoding section 3 exact rules
  <sub>Core of the whole system (spec 3) · spec §3 · **critical** · 4 h · needs 24 (Enums: EngagementState (NEW NOT_OPENED O), 25 (Enums: event types (SEND OPENED UNIQUE_O)</sub>
  > Superseded by 69: transitions now live in an XState v5 machine, not a hand-rolled switch.
- [x] **69** XState v5 machine for lead engagement states (NEW/NOT_OPENED/OPENED/CLICKED/REPLIED/SUPPRESSED)
  <sub>Single declarative source of truth for section 3 transitions and emitted actions · spec §3 · **critical** · 3 h · needs 24 (Enums: EngagementState (NEW NOT_OPENED O), 25 (Enums: event types (SEND OPENED UNIQUE_O)</sub>
  > apps/orchestrator/src/domain/transition.ts uses setup/createMachine; transition() drives it with createActor + machine.resolveState
- [x] **70** Transition-table, precedence and branch-switch tests over the XState machine
  <sub>Proves no downgrade, no sequence restart, suppression from every state · spec §3, §4, §8 · T03, T04, T05, T06 · **critical** · 2 h · needs 69 (XState v5 machine for lead engagement st)</sub>
  > 26 orchestrator tests; root suite is 39 pass
- [x] **71** Effect SQL migrator (Migrator.fromRecord + @effect/sql-pg) replacing the plain SQL runner
  <sub>One Effect-native migration path instead of a bespoke runner · spec §10 · high · 3 h · needs 14 (Migration: email_events (immutable norma)</sub>
  > 0001_init.ts default Effect migration; tracks in effect_sql_migrations; rerun is a no-op; postgres driver removed from root
- [x] **72** Orchestrator Effect boot: app-scope PgClient pool plus Bun.serve /health with DB ping
  <sub>Proves the Effect runtime and DB wiring before adding webhook routes · spec §11 · high · 2 h · needs 71 (Effect SQL migrator (Migrator.fromRecord)</sub>
  > Single Layer.build scope held for the process lifetime; /health returns db:true against local Postgres
- [x] **75** Fix per-package tsconfig extends and wire orchestrator typecheck into root check
  <sub>A self-referencing tsconfig made the orchestrator project unloadable and its typecheck never ran · spec P0 · high · 1 h</sub>
  > apps/orchestrator/tsconfig.json extended itself; root check now runs all three tsc passes
- [ ] **76** Wire SendPayload tags into the Cloudflare Queues publisher envelope
  <sub>Webhooks correlate back to a send attempt only if the tags survive the queue round trip · spec §11 · high · 2 h · needs 51 (Cloudflare Queues HTTP publisher POST ac)</sub>
  > Decision: no callbacks, tags are the only correlation channel; verify Resend echoes them on webhook events

### Sprint 5 — 2026-10-15 → 2026-10-16

_Phase 2 - Domain engine → Phase 3 - Event processor · 7 tasks · 22 h_

- [-] **29** Event precedence section 4 + never downgrade
  <sub>Late events must not downgrade · spec §4 · T06 · **critical** · 2 h · needs 28 (Pure transition() encoding section 3 exa)</sub>
  > Superseded by 69/70: precedence.ts still applies ranking, but the transition rules come from the machine.
- [-] **30** Unit tests: full section 3 transition table (all rows)
  <sub>Proves every rule row by row · spec §3 · **critical** · 3 h · needs 28 (Pure transition() encoding section 3 exa)</sub>
  > Superseded by 70: transition.test.ts covers the same table against the XState machine.
- [-] **31** Unit tests: precedence and no-downgrade cases
  <sub>spec §4 · T06 · **critical** · 2 h · needs 29 (Event precedence section 4 + never downg)</sub>
  > Superseded by 70: precedence.test.ts covers ranking and no-downgrade.
- [-] **32** Unit tests: branch-switch scenario from spec
  <sub>spec §8 · T04, T05, T07 · high · 2 h · needs 29 (Event precedence section 4 + never downg), 30 (Unit tests: full section 3 transition ta)</sub>
  > Superseded by 70: branch-switch.test.ts covers NOT_OPENED -> OPENED -> CLICKED -> REPLIED.
- [-] **33** Webhook route POST /webhooks/brevo
  <sub>Entry point for Brevo events · spec §5 · **critical** · 3 h · needs 28 (Pure transition() encoding section 3 exa), 29 (Event precedence section 4 + never downg), 30 (Unit tests: full section 3 transition ta)</sub>
  > Deferred: Resend webhook path lands first (73). Brevo route follows the same normalizer.
- [ ] **73** Resend webhook normalization to DomainEvent using SendPayload.tags correlation
  <sub>Turns provider payloads into the events the XState machine consumes · spec §12 · T03, T12 · **critical** · 5 h · needs 69 (XState v5 machine for lead engagement st)</sub>
  > Resend first, Brevo later; tags carry actionId/sendAttemptId/leadId/datasetId
- [ ] **74** Transactionally persist email_events, leads.engagement_state, job_transitions and action side effects
  <sub>Webhook effects must be atomic or replay corrupts state · spec §12 · T12 · **critical** · 5 h · needs 73 (Resend webhook normalization to DomainEv)</sub>
  > Reuse the XState actions as the effect list inside one SqlClient.withTransaction

### Sprint 6 — 2026-10-19 → 2026-10-20

_Phase 3 - Event processor · 5 tasks · 12 h_

- [-] **34** Validate and normalize Brevo payload into internal event
  <sub>spec §5 · T13 · **critical** · 3 h · needs 25 (Enums: event types (SEND OPENED UNIQUE_O), 33 (Webhook route POST /webhooks/brevo)</sub>
  > Deferred: Resend normalization lands first (73); Brevo reuses the same DomainEvent output.
- [ ] **35** Persist raw provider event before business processing
  <sub>spec §5 · **critical** · 2 h · needs 14 (Migration: email_events (immutable norma), 73 (Resend webhook normalization to DomainEv)</sub>
- [ ] **36** Resolve send_attempt via provider message id and correlation data
  <sub>spec §5 · T14, T10 · **critical** · 2 h · needs 13 (Migration: send_attempts (immutable prov), 35 (Persist raw provider event before busine)</sub>
- [ ] **37** Load lead + SELECT FOR UPDATE to serialize concurrent webhooks
  <sub>Serializes concurrent webhooks · spec §5 · T13, T12 · **critical** · 3 h · needs 6 (Migration: leads (engagement state conta), 36 (Resolve send_attempt via provider messag)</sub>
- [ ] **38** Idempotency: duplicate provider events repeat no business actions
  <sub>Duplicate events repeat nothing · spec §12 · T03, T12 · **critical** · 2 h · needs 21 (Constraint UNIQUE(provider_event_id)), 35 (Persist raw provider event before busine)</sub>

### Sprint 7 — 2026-10-21 → 2026-10-22

_Phase 3 - Event processor · 5 tasks · 10 h_

- [ ] **39** Evaluate suppression first else REPLIED then CLICKED then OPENED
  <sub>spec §3 · **critical** · 2 h · needs 69 (XState v5 machine for lead engagement st)</sub>
- [ ] **40** Never downgrade current engagement state
  <sub>spec §4 · T06 · **critical** · 1 h · needs 69 (XState v5 machine for lead engagement st)</sub>
- [ ] **41** Cancel all future scheduled actions of old active sequence
  <sub>spec §3 · T02, T04, T05 · **critical** · 3 h · needs 12 (Migration: scheduled_actions (lifecycle ), 39 (Evaluate suppression first else REPLIED )</sub>
- [ ] **42** Create first scheduled action of new sequence only once
  <sub>spec §3 · T03, T04, T05, T12 · **critical** · 2 h · needs 23 (Idempotency key against duplicate first-), 39 (Evaluate suppression first else REPLIED )</sub>
- [ ] **43** Write job_transitions audit record
  <sub>spec §5 · T14, T10 · **critical** · 2 h · needs 15 (Migration: job_transitions (audit trail)), 39 (Evaluate suppression first else REPLIED )</sub>

### Sprint 8 — 2026-10-23 → 2026-10-26

_Phase 3 - Event processor · 2 tasks · 11 h_

- [ ] **44** Commit atomically: state + cancel + create + audit
  <sub>All-or-nothing per spec 12 · spec §12 · T13 · **critical** · 3 h · needs 41 (Cancel all future scheduled actions of o), 42 (Create first scheduled action of new seq), 43 (Write job_transitions audit record), 37 (Load lead + SELECT FOR UPDATE to seriali)</sub>
- [ ] **45** Tests T03 T04 T05 T06 T07 T08 T09 T10 T12
  <sub>spec §14 · **critical** · 8 h · needs 44 (Commit atomically: state + cancel + crea), 70 (Transition-table, precedence and branch-)</sub>

### Sprint 9 — 2026-10-27 → 2026-10-28

_Phase 4 - Scheduler + sequences · 3 tasks · 10 h_

- [ ] **46** Due-sweep over scheduled_actions where SCHEDULED and execute_at passed
  <sub>Decides WHEN to send (spec 8) · spec §8 · T01 · **critical** · 4 h · needs 12 (Migration: scheduled_actions (lifecycle )</sub>
- [ ] **47** NO_1 to NO_2 to NO_3 sequential logic (only advance while NOT_OPENED)
  <sub>Sequential, NOT sent upfront · spec §8 · T01, T15 · **critical** · 4 h · needs 10 (Migration: sequence_steps (order N_DAYS ), 46 (Due-sweep over scheduled_actions where S)</sub>
- [ ] **48** Per-step configurable N_DAYS
  <sub>N_DAYS varies per step · spec §8 · T01, T02, T15, T10 · **critical** · 2 h · needs 10 (Migration: sequence_steps (order N_DAYS ), 46 (Due-sweep over scheduled_actions where S)</sub>

### Sprint 10 — 2026-10-29 → 2026-10-30

_Phase 4 - Scheduler + sequences · 3 tasks · 11 h_

- [ ] **49** Interruption on OPENED CLICKED REPLIED SUPPRESSED cancels remaining steps
  <sub>spec §8 · T02, T15 · **critical** · 3 h · needs 41 (Cancel all future scheduled actions of o), 47 (NO_1 to NO_2 to NO_3 sequential logic (o)</sub>
- [ ] **50** Sequence COMPLETE or DISCARD after NO_3 unopened per campaign config
  <sub>spec §8 · T15 · high · 2 h · needs 47 (NO_1 to NO_2 to NO_3 sequential logic (o)</sub>
- [ ] **52** Tests T01 T02 T15
  <sub>spec §14 · **critical** · 6 h · needs 46 (Due-sweep over scheduled_actions where S), 47 (NO_1 to NO_2 to NO_3 sequential logic (o), 48 (Per-step configurable N_DAYS), 49 (Interruption on OPENED CLICKED REPLIED S), 50 (Sequence COMPLETE or DISCARD after NO_3 )</sub>

### Sprint 11 — 2026-11-02 → 2026-11-03

_Phase 5 - Queue producer + internal API · 3 tasks · 11 h_

- [ ] **51** Cloudflare Queues HTTP publisher POST accounts/queues/messages
  <sub>Bridge from Bun to the CF Queue · spec §11 · **critical** · 4 h · needs 2 (Add deps: alchemy typescript @types/bun ), 3 (Create .env.example (DATABASE_URL CLOUDF)</sub>
- [-] **53** Push actionId only when action is due
  <sub>spec §11 · **critical** · 2 h · needs 46 (Due-sweep over scheduled_actions where S), 52 (Tests T01 T02 T15)</sub>
  > Superseded: worker is callback-free and queue carries full SendPayload, not actionId. Producer will publish full payload when action is due.
- [-] **54** POST /internal/jobs/:actionId/claim with section 6 re-check + render + mark PROCESSING
  <sub>The spec 6 pre-send re-check · spec §6 · T11 · **critical** · 5 h · needs 37 (Load lead + SELECT FOR UPDATE to seriali), 52 (Tests T01 T02 T15), 53 (Push actionId only when action is due)</sub>
  > Superseded: internal claim endpoint removed. Rendering happens in the orchestrator before enqueue.

### Sprint 12 — 2026-11-04 → 2026-11-05

_Phase 5 - Queue producer + internal API → Phase 6 - CF Worker · 4 tasks · 10 h_

- [-] **55** POST /internal/jobs/:actionId/result record SENT RETRY_SCHEDULED or FAILED
  <sub>Records what actually happened · spec §6 · T14, T10 · **critical** · 3 h · needs 13 (Migration: send_attempts (immutable prov), 27 (Enums: scheduled action status (SCHEDULE), 54 (POST /internal/jobs/:actionId/claim with)</sub>
  > Superseded: no result callback. Send outcome is reconciled from provider webhooks via SendPayload.tags correlation.
- [-] **56** INTERNAL_API_SECRET auth on internal routes
  <sub>spec §11 · **critical** · 1 h · needs 3 (Create .env.example (DATABASE_URL CLOUDF)</sub>
  > Superseded: INTERNAL_API_SECRET retired with the internal API.
- [-] **57** Tests T11 T14
  <sub>spec §14 · high · 4 h · needs 54 (POST /internal/jobs/:actionId/claim with), 55 (POST /internal/jobs/:actionId/result rec)</sub>
  > T11 (callback cancel test) superseded by tag-correlated webhook flow. T14 remains tracked under 63/68.
- [x] **58** wrangler.jsonc: queue consumer binding DLQ nodejs_compat
  <sub>spec P6 · **critical** · 2 h · needs 2 (Add deps: alchemy typescript @types/bun )</sub>
  > Superseded by Alchemy: apps/worker/alchemy.run.ts declares Queue+DLQ+Worker+Consumer

### Sprint 13 — 2026-11-06 → 2026-11-09

_Phase 6 - CF Worker · 4 tasks · 12 h_

- [x] **59** queue(batch env ctx) handler with per-message try/catch
  <sub>One bad message must not fail the batch · spec §6 · **critical** · 3 h · needs 58 (wrangler.jsonc: queue consumer binding D)</sub>
  > src/index.ts queue() handler: sendJob -> ack/retry per message
- [x] **60** message.ack() on success and message.retry() on transient failure
  <sub>Retry is what makes it reliable · spec §6 · **critical** · 2 h · needs 59 (queue(batch env ctx) handler with per-me)</sub>
  > execute.ts: sent/failed -> ack, transient/unknown -> retry
- [x] **61** Pluggable email providers (EmailSender interface + factory)
  <sub>spec §13 · **critical** · 3 h · needs 2 (Add deps: alchemy typescript @types/bun )</sub>
  > src/email/: errors.ts generic Transient/PermanentSendError, resend.ts, brevo.ts, mock.ts, index.ts factory switching on EMAIL_PROVIDER
- [x] **62** Consume queue then send via Brevo (no callbacks)
  <sub>Worker stays stateless (spec 11) · spec §6 · T11 · **critical** · 4 h · needs 54 (POST /internal/jobs/:actionId/claim with), 55 (POST /internal/jobs/:actionId/result rec), 60 (message.ack() on success and message.ret), 61 (Pluggable email providers (EmailSender i)</sub>
  > Consumer stays provider-agnostic: sendJob -> ack/retry unchanged when swapping EMAIL_PROVIDER

### Sprint 14 — 2026-11-10 → 2026-11-11

_Phase 6 - CF Worker → Phase 7 - Hardening · 3 tasks · 9 h_

- [ ] **63** Test T13 concurrency serialized via orchestrator FOR UPDATE
  <sub>spec §14 · T13 · high · 3 h · needs 37 (Load lead + SELECT FOR UPDATE to seriali), 62 (Consume queue then send via Brevo (no ca)</sub>
- [ ] **64** Retry and backoff policy classify transient vs permanent
  <sub>spec §6 · high · 3 h · needs 60 (message.ack() on success and message.ret)</sub>
- [ ] **65** Structured logging
  <sub>spec §16 · medium · 3 h · needs 3 (Create .env.example (DATABASE_URL CLOUDF)</sub>

### Sprint 15 — 2026-11-12 → 2026-11-13

_Phase 7 - Hardening · 3 tasks · 11 h_

- [ ] **66** Real Brevo HTTP adapter + webhook signature verification
  <sub>spec §13 · medium · 4 h · needs 61 (Pluggable email providers (EmailSender i)</sub>
  > Sender half done (apps/worker/src/email/brevo.ts, 18 provider tests). Still todo: orchestrator-side Brevo webhook signature verification, sequenced after Resend.
- [ ] **67** Deploy scripts: wrangler deploy + orchestrator service
  <sub>spec P16 · medium · 3 h · needs 58 (wrangler.jsonc: queue consumer binding D), 3 (Create .env.example (DATABASE_URL CLOUDF)</sub>
- [ ] **68** Concurrency stress tests duplicate and parallel webhooks
  <sub>spec §12 · T03, T12, T13 · high · 4 h · needs 45 (Tests T03 T04 T05 T06 T07 T08 T09 T10 T1), 63 (Test T13 concurrency serialized via orch)</sub>

---

## Critical path

Tasks that block the most downstream work:

- **1** Init Bun workspaces (packages/* apps/*) — unlocks 1 task(s)
- **2** Add deps: alchemy typescript @types/bun wrangler — unlocks 5 task(s)
- **3** Create .env.example (DATABASE_URL CLOUDFLARE_ACCOUNT_ID CLOUDFLARE_QUEUE_ID CLOUDFLARE_API_TOKEN EMAIL_PROVIDER RESEND_API_KEY BREVO_API_KEY PORT) — unlocks 4 task(s)
- **5** Provision hosted Postgres database — unlocks 14 task(s)
- **6** Migration: leads (engagement state contact identity suppression) — unlocks 4 task(s)
- **10** Migration: sequence_steps (order N_DAYS delay template conditions) — unlocks 3 task(s)
- **12** Migration: scheduled_actions (lifecycle status) — unlocks 4 task(s)
- **13** Migration: send_attempts (immutable provider correlation) — unlocks 3 task(s)
- **14** Migration: email_events (immutable normalized provider events) — unlocks 4 task(s)
- **15** Migration: job_transitions (audit trail) — unlocks 1 task(s)
- **20** Attribution FKs on scheduled_actions and send_attempts — unlocks 1 task(s)
- **21** Constraint UNIQUE(provider_event_id) — unlocks 2 task(s)
- **23** Idempotency key against duplicate first-step creation — unlocks 1 task(s)
- **28** Pure transition() encoding section 3 exact rules — unlocks 3 task(s)
- **29** Event precedence section 4 + never downgrade — unlocks 3 task(s)
- **30** Unit tests: full section 3 transition table (all rows) — unlocks 2 task(s)
- **33** Webhook route POST /webhooks/brevo — unlocks 1 task(s)
- **35** Persist raw provider event before business processing — unlocks 2 task(s)
- **36** Resolve send_attempt via provider message id and correlation data — unlocks 1 task(s)
- **37** Load lead + SELECT FOR UPDATE to serialize concurrent webhooks — unlocks 3 task(s)
- **39** Evaluate suppression first else REPLIED then CLICKED then OPENED — unlocks 3 task(s)
- **41** Cancel all future scheduled actions of old active sequence — unlocks 2 task(s)
- **42** Create first scheduled action of new sequence only once — unlocks 1 task(s)
- **43** Write job_transitions audit record — unlocks 1 task(s)
- **44** Commit atomically: state + cancel + create + audit — unlocks 1 task(s)
- **45** Tests T03 T04 T05 T06 T07 T08 T09 T10 T12 — unlocks 1 task(s)
- **46** Due-sweep over scheduled_actions where SCHEDULED and execute_at passed — unlocks 4 task(s)
- **47** NO_1 to NO_2 to NO_3 sequential logic (only advance while NOT_OPENED) — unlocks 3 task(s)
- **48** Per-step configurable N_DAYS — unlocks 1 task(s)
- **49** Interruption on OPENED CLICKED REPLIED SUPPRESSED cancels remaining steps — unlocks 1 task(s)
- **52** Tests T01 T02 T15 — unlocks 2 task(s)
- **51** Cloudflare Queues HTTP publisher POST accounts/queues/messages — unlocks 1 task(s)
- **53** Push actionId only when action is due — unlocks 1 task(s)
- **54** POST /internal/jobs/:actionId/claim with section 6 re-check + render + mark PROCESSING — unlocks 3 task(s)
- **55** POST /internal/jobs/:actionId/result record SENT RETRY_SCHEDULED or FAILED — unlocks 2 task(s)
- **58** wrangler.jsonc: queue consumer binding DLQ nodejs_compat — unlocks 2 task(s)
- **59** queue(batch env ctx) handler with per-message try/catch — unlocks 1 task(s)
- **60** message.ack() on success and message.retry() on transient failure — unlocks 2 task(s)
- **61** Pluggable email providers (EmailSender interface + factory) — unlocks 2 task(s)
- **62** Consume queue then send via Brevo (no callbacks) — unlocks 1 task(s)
- **69** XState v5 machine for lead engagement states (NEW/NOT_OPENED/OPENED/CLICKED/REPLIED/SUPPRESSED) — unlocks 4 task(s)
- **70** Transition-table, precedence and branch-switch tests over the XState machine — unlocks 1 task(s)
- **73** Resend webhook normalization to DomainEvent using SendPayload.tags correlation — unlocks 2 task(s)
