# Email Orchestrator

## FINAL STATE MACHINE & EXECUTION SPECIFICATION

Developer handoff — implement this as the business-state source of truth.

---

## 1. Non-negotiable design rule

Do NOT make NO_1, NO_2, NO_3, O_1, CN_1, etc. the permanent lead state. Separate engagement state from sequence/step execution state.

| Concept | Example | Meaning |
| --- | --- | --- |
| Engagement state | NOT_OPENED / OPENED / CLICKED / REPLIED / SUPPRESSED | Business state of the lead. |
| Sequence | NOT_OPENED_SEQUENCE | Behavioral path being executed. |
| Sequence step | NO_2 / O_1 / C_1 | Current step inside a sequence. |
| Scheduled action | send at execute_at | Future executable action. |
| Send attempt | sendAttemptId | One concrete outbound attempt. |
| Provider event | opened / click / hard_bounce | Raw Brevo observation. |

## 2. Canonical state machine

```
NEW → NOT_OPENED → OPENED → CLICKED → REPLIED
ANY ACTIVE STATE → SUPPRESSED
```

Hard bounce, spam, unsubscribe, invalid email and explicit do-not-contact enter SUPPRESSED. Soft bounce is recorded and handled by delivery policy; it is not automatically an engagement promotion.

## 3. Exact transition rules

| Current | Event | New state | Required action |
| --- | --- | --- | --- |
| NEW | SEND | NOT_OPENED | Start NOT_OPENED sequence after successful send. |
| NOT_OPENED | OPENED / UNIQUE_OPENED | OPENED | Cancel remaining NOT_OPENED actions; create OPENED Step 1. |
| NOT_OPENED | CLICKED | CLICKED | Cancel active sequence actions; create CLICKED Step 1. |
| NOT_OPENED | REPLIED | REPLIED | Cancel all future outbound actions; create nothing. |
| OPENED | OPENED / UNIQUE_OPENED | OPENED | Record event only; never restart. |
| OPENED | CLICKED | CLICKED | Cancel remaining OPENED actions; create CLICKED Step 1. |
| OPENED | REPLIED | REPLIED | Cancel all future outbound actions. |
| CLICKED | OPENED | CLICKED | Record only; never downgrade. |
| CLICKED | CLICKED | CLICKED | Record only; never restart. |
| CLICKED | REPLIED | REPLIED | Cancel all future outbound actions. |
| ANY ACTIVE | HARD_BOUNCE | SUPPRESSED | Cancel all future outbound actions; suppress. |
| ANY ACTIVE | SPAM | SUPPRESSED | Cancel all future outbound actions; suppress. |
| ANY ACTIVE | UNSUBSCRIBED | SUPPRESSED | Cancel all future outbound actions; suppress. |
| ANY ACTIVE | INVALID_EMAIL | SUPPRESSED | Cancel all future outbound actions; suppress. |

## 4. Event precedence

A late/duplicate lower-value event must never move a lead backwards.

| Priority | Event | Promotion |
| --- | --- | --- |
| 1 | REPLIED | → REPLIED |
| 2 | CLICKED | → CLICKED unless REPLIED/SUPPRESSED |
| 3 | OPENED / UNIQUE_OPENED | → OPENED unless CLICKED/REPLIED/SUPPRESSED |
| 4 | DELIVERED | No engagement promotion |
| 5 | SENT | No engagement promotion |

## 5. Event processor — exact algorithm

- Validate and normalize the Brevo webhook.
- Persist the raw provider event before business processing.
- Resolve the internal send_attempt using provider message ID and internal correlation data.
- Load the lead and acquire a transaction/row lock so concurrent webhooks serialize.
- Apply idempotency: duplicate provider events must not repeat business actions.
- Evaluate suppression events first; otherwise evaluate REPLIED, CLICKED, OPENED in that order.
- Never downgrade the current engagement state.
- When a branch changes, cancel all future scheduled actions belonging to the old active sequence.
- Create the first scheduled action of the new sequence only once.
- Write job_transitions audit record: from_state, to_state, event, reason, at.
- Commit atomically: state update + cancellation + new scheduled action + transition audit.

## 6. Scheduled action lifecycle

| Status | Meaning |
| --- | --- |
| SCHEDULED | Future action exists. |
| QUEUED | Validated and placed on Main Email Send Queue. |
| PROCESSING | Worker claimed it. |
| SENT | Brevo accepted send request. |
| RETRY_SCHEDULED | Transient failure awaiting retry. |
| CANCELLED | Business state changed before execution. |
| FAILED | Permanent execution failure. |
| COMPLETED | Action lifecycle finished. |

**Critical:** immediately before calling Brevo, the worker must re-check that the action is not CANCELLED and that the lead is still eligible. A queued job is not permission to send.

## 7. Sequence definitions

| Sequence | Steps | Starts when |
| --- | --- | --- |
| NOT_OPENED | NO_1 → NO_2 → NO_3 → COMPLETE | Eligible lead has no open/click/reply. |
| OPENED | O_1 → O_2 → O_3 → COMPLETE | OPENED/UNIQUE_OPENED promotes lead. |
| CLICKED | C_1 → C_2 → C_3 → COMPLETE | CLICKED promotes lead. |
| REPLIED | No outbound steps | Reply detected. |
| SUPPRESSED | No outbound steps | Hard bounce/spam/unsubscribe/invalid/DNC. |

## 8. UNOPENED SEQUENCE EXECUTION LOGIC — MANDATORY

This is a sequential multi-email sequence. NO_1 → NO_2 → NO_3 are NOT sent upfront. Each next email is scheduled/sent only if the lead remains in NOT_OPENED and the previous step's wait period has expired without an OPENED, CLICKED, REPLIED or suppression event.

Required behavior:

- Day 0: Send NO_1.
- If NO_1 remains unopened for the configured N_DAYS, schedule/send NO_2.
- If the lead is still NOT_OPENED after NO_2 and its configured N_DAYS expires, schedule/send NO_3.
- If NO_3 remains unopened after its configured N_DAYS, mark the NOT_OPENED sequence COMPLETE / DISCARD according to campaign configuration.
- If OPENED occurs at any point before the next unopened step executes, cancel all remaining NOT_OPENED steps and start OPENED Step O_1.
- If CLICKED occurs at any point, cancel all remaining NOT_OPENED steps and start CLICKED Step C_1.
- If REPLIED or SUPPRESSED occurs at any point, cancel all remaining outbound steps and send nothing further.
- N_DAYS is configurable per sequence step; it does not have to be identical for every step.

## 8. Mandatory branch-switch test

- Lead A enters NOT_OPENED sequence.
- NO_1 sent; NO_2 scheduled.
- NO_2 sent.
- OPENED webhook arrives.
- State becomes OPENED; all future NOT_OPENED actions become CANCELLED; O_1 is created.
- CLICKED webhook arrives.
- State becomes CLICKED; all future OPENED actions become CANCELLED; C_1 is created.
- REPLIED arrives.
- State becomes REPLIED; every future outbound action is CANCELLED.

## 9. Database model

| Table | Purpose |
| --- | --- |
| leads | Current engagement state, contact identity, suppression. |
| datasets | Dataset ownership and attribution. |
| campaigns | Campaign configuration. |
| sequences | Behavioral sequence definitions. |
| sequence_steps | Step order, delay, template, conditions. |
| templates | Email content and variants. |
| scheduled_actions | Future actions and lifecycle status. |
| send_attempts | Immutable outbound attempt and provider correlation. |
| email_events | Immutable normalized provider event history. |
| job_transitions | State transition audit trail. |
| suppression_list | Contact-level/global suppression reasons. |
| domains | Sending domains, health and limits. |
| mailboxes | Sending identities, limits and assignment. |
| experiments | Optional A/B assignment and attribution. |

## 10. Required attribution fields

Every scheduled action and send_attempt must retain:

- dataset_id
- lead_id
- campaign_id
- sequence_id
- step_id
- template_id
- domain_id
- mailbox_id
- send_attempt_id
- provider_message_id

This must allow a later report to answer: which dataset, campaign, sequence, step, template, domain and mailbox generated each send, open, click, reply and failure?

## 11. Worker / orchestrator boundaries

| Component | Owns | Must NOT own |
| --- | --- | --- |
| Orchestrator/Scheduler | Due actions, resource selection, quota validation, queue creation | Calling Brevo or business-state transitions |
| Main Queue | Normal outbound jobs | Business decisions |
| Retry Queue | Retryable failed jobs | Changing sequence state |
| Worker | Execute send and transient retry | Choosing a new business sequence |
| Webhook/Event Processor | Persist events and apply state transitions | Acting as outbound sender |
| PostgreSQL | Source of truth and audit history | High-throughput queueing |

## 12. Concurrency / idempotency requirements

- Duplicate OPENED events must never create two O_1 actions.
- Duplicate CLICKED events must never create two C_1 actions.
- Late OPENED after CLICKED must not downgrade the lead.
- REPLIED must stop outbound even when older jobs are already queued.
- State transition + cancellation + creation of the next scheduled action must be atomic.
- Use unique constraints/idempotency keys for provider_event_id and send_attempt_id.

## 13. Brevo mapping

Brevo documents transactional webhook events including sent, delivered, opened, clicked, soft bounce, hard bounce, invalid, deferred, spam, blocked and unsubscribed. Brevo webhook payloads include provider message identifiers and can include tags/custom correlation data. Normalize these into the internal event model; do not make Brevo the source of truth for internal sequence state.

Reference: <https://developers.brevo.com/docs/transactional-webhooks>

Webhook setup: <https://developers.brevo.com/docs/how-to-use-webhooks>

## 14. Developer acceptance tests

| ID | Test | Expected result |
| --- | --- | --- |
| T01 | NO_1 not opened | After NO_1 wait period, NO_2 is scheduled/sent if lead is still NOT_OPENED. |
| T02 | OPENED during NO_2 | OPENED state; remaining NOT_OPENED actions (including NO_3) cancelled; O_1 created. |
| T03 | Duplicate OPENED | Only one O_1; duplicate event retained. |
| T04 | CLICKED from OPENED | CLICKED state; old future actions cancelled; C_1 created. |
| T05 | CLICKED from NOT_OPENED | CLICKED state; NOT_OPENED future actions cancelled; C_1 created. |
| T06 | Late OPENED after CLICKED | State remains CLICKED. |
| T07 | REPLIED | State REPLIED; all future outbound cancelled. |
| T08 | HARD_BOUNCE | SUPPRESSED; all future outbound cancelled. |
| T09 | SPAM | SUPPRESSED; all future outbound cancelled. |
| T10 | UNSUBSCRIBE | SUPPRESSED; all future outbound cancelled. |
| T11 | Cancelled job reaches worker | Worker refuses to send. |
| T12 | Duplicate webhook | Exactly one business transition. |
| T13 | Concurrent webhooks | Serialized; no duplicate next step. |
| T14 | Dataset attribution | Every event traces to all required IDs. |

**T15** — Full NOT_OPENED sequence: Send NO_1 → no open → wait N_DAYS → send NO_2 → no open → wait N_DAYS → send NO_3 → no open → sequence completes/discards. At every step, OPENED/CLICKED/REPLIED/SUPPRESSED must interrupt the chain and prevent the next unopened email.

## 16. Final implementation principle

```
BREVO SENDS.
DATABASE OWNS STATE.
EVENT PROCESSOR OWNS TRANSITIONS.
SCHEDULER OWNS WHEN.
WORKER OWNS EXECUTION.
```

---

## Addendum: Cloudflare Queues vs GetStream (Queue Layer Rationale)

The orchestrator runs on Cloudflare Workers, where the Worker's sole job is to send email. A queue is required in front of it because a send-only Worker has no built-in way to retry a failed Brevo call, throttle when rate-limited, survive a deployment or crash mid-send, or decouple "it is time to send" from "actually sending". Cloudflare Queues supplies these; GetStream does not.

- Retry a failed Brevo call without re-running the whole pipeline.
- Throttle sending when the provider rate-limits us.
- Survive a deployment or crash that happens mid-send.
- Decouple WHEN an email is due (scheduler) from EXECUTION of the send (worker).

| Requirement of the send job | Cloudflare Queues | GetStream Feeds |
| --- | --- | --- |
| Hand a job to the Worker | Producer to consumer `queue(batch, env, ctx)` handler | No consumer/handler |
| Success signal | `message.ack()` | Not supported |
| Failure / retry | `message.retry()`, `max_retries` | Not supported |
| Dead-letter after retries | `dead_letter_queue` | Not supported |
| At-least-once durability | Yes | Not supported |
| Backpressure / concurrency control | `max_batch_size`, `max_concurrency` | Not supported |
| Read a list of activities | Not a feed | Yes (its only function) |

**Category mismatch:** GetStream Feeds is a read/fan-out system - you read activities from a feed. There is no primitive to run a Worker to send an email, retry it on failure, or confirm success. A queue is a work-execution system. The two solve different problems; GetStream cannot replace the queue layer.

**Send flow on Cloudflare Workers:** Cron Trigger (scheduler - owns WHEN) → query D1 for due scheduled_actions → `env.EMAIL_QUEUE.send({ actionId })` (Main Queue - transport only) → Email Worker `queue(batch, env, ctx)` (Worker - owns EXECUTION): for each message, re-check the action is not CANCELLED and the lead is eligible (section 6), call the Brevo send API via `fetch`, record the send attempt, then `message.ack()` on success, `message.retry()` on transient failure, or dead-letter after `max_retries`.

**Note:** Cloudflare Queues is at-least-once, so a job can be delivered more than once. This is why the idempotency rules in section 12 (unique `send_attempt_id`) are mandatory - the email Worker must be safe to replay.