# Open Questions for Leadership

- **Status:** Draft for review
- **Owner:** Engineering
- **Purpose:** Decisions we need from leadership before running the email orchestration
  system in production. Each section states the current state, the options, and the
  decision required.

---

## Context — what exists today

The system is built and passing tests (65 passing, 3 skipped). It has three parts:

- **Orchestrator** (always-on Bun process) — owns all business state, decides which
  email to send next, and pushes the send job to a queue. It never calls an email
  provider directly.
- **Scheduler flow** (`PULLED → DECIDED → SENT`) — pulls due actions from the
  database, decides the next step, builds the email payload, and enqueues it.
- **Worker** (Cloudflare Worker) — consumes the queue and actually sends the email
  through the configured provider (currently defaults to a mock provider).

State and timing live in PostgreSQL. The decision of *what* to send and *when* is
driven by per-step delays (`delay_days`) stored on each sequence step.

The five questions below are the decisions we cannot make unilaterally.

---

## 1. When should the scheduler run?

**The question:** How often should the system look for emails that are due to send?

**Current state:** The orchestrator runs continuously. The scheduler flow is a
separate job intended to run on a fixed schedule (device cron). It currently runs
once a day. Each run pulls every action whose `execute_at` time has passed, sends
them, then exits.

**Options:**

| Option | Effect | Trade-off |
|---|---|---|
| Once a day | Batch send once daily | Sends can be up to ~24h late |
| Every hour | Nearer to real time | More DB load, more queue traffic |
| Every 5 minutes | Closest to exact scheduled time | Highest load; more moving parts |
| Event-driven | Send at the exact due time | Most complex to operate |

**Decision needed:**
- What cadence is acceptable for the business (daily, hourly, real-time)?
- Which host will run the scheduled job, and who is responsible for keeping it running?

---

## 2. How long between NO_1 and NO_2?
`
**The question:** What is the intended wait time between the first email (NO_1) and
the follow-up (NO_2)?

**Current state:** Each step has a configurable `delay_days`. In the current seed
data:

- `NO_1` — day 0 (sent when the lead is enrolled)
- `NO_2` — **2 days** after NO_1 is processed
- `NO_3` — 3 days after NO_2

The follow-up is scheduled the moment NO_1 is processed; it becomes *due* 2 days
later and is *sent* at the next scheduled run. Because the scheduler currently runs
once a day, the practical gap is **approximately 2–3 days**.

**Options:**
- Keep day-level delays (2 / 3 days).
- Make delays configurable per campaign without a code change.
- Support sub-day delays (hours/minutes) for tighter sequences.
- Send only on business days / business hours / in the lead's timezone.

**Decision needed:**
- Are the current delays (2 and 3 days) the intended business cadence?
- Do we need hour-level precision, or is day-level acceptable?
- Should delays respect weekends, business hours, or lead timezones?

---

## 3. Which email provider — is Brevo the real one?

**The question:** Should production sending use the Brevo API, and who owns the
account and credentials?

**Current state:** The Worker supports three providers — `resend`, `brevo`, and
`mock` — selected by a single `EMAIL_PROVIDER` value. The system is currently
configured with `mock` and empty API keys. The Brevo integration is implemented:
it calls `POST https://api.brevo.com/v3/smtp/email` with an `api-key` header.

**Options:**
- **Brevo** (integration already built).
- **Resend** (integration already built).
- **Mock** for staging/testing only.

**Decision needed:**
- Confirm Brevo as the production provider (or choose another).
- Who owns the Brevo account and the API key, and how is the key stored securely?
- Is the sending domain verified (SPF / DKIM / DMARC)?
- What are the account's rate limits and daily send limits, and are we within them?
- Do we want delivery/open/click webhooks wired back to the system (currently not
  enabled)?

---

## 4. Where will this be deployed?

**The question:** Which hosting environment is approved for each component?

**Current state:** The system is provider-agnostic and runs locally against a Docker
PostgreSQL database. Nothing is deployed to production yet.

**Components and options:**

| Component | Options |
|---|---|
| PostgreSQL (source of truth) | Managed (Neon / Supabase / RDS / Railway) or self-hosted Docker |
| Orchestrator (Bun process) | Railway / Fly.io / Render / a VM with systemd, PM2, or Docker |
| Worker + Queue | Cloudflare Workers + Cloudflare Queues (deployed via Alchemy) |
| Scheduled job | The same host as the orchestrator (cron), or a hosted scheduler |

**Decision needed:**
- Which hosting platform(s) are approved and who owns the infrastructure account?
- Where will the database live, and who owns backups and access control?
- How are secrets (database URL, provider keys, Cloudflare tokens) managed?
- Do we deploy now, or after the remaining webhook work is finished?

---

## 5. Which email templates will we use?

**The question:** Which actual email copy and templates will each step send?

**Current state:** Templates are stored in the database and linked to each step
(`subject`, `html`, `text`). The current seed data contains **placeholders only**
(e.g. subject `NO_1 subject`, body `<p>NO_1 html</p>`) for development.

**Options:**
- Ship the placeholder templates as-is (not acceptable for production).
- Use final marketing copy supplied by the business, loaded per step.
- Use a template system with personalization variables (first name, company, etc.).

**Decision needed:**
- Who writes and approves the copy for each step (NO_1–NO_3, O_1–O_3, C_1–C_3)?
- Are personalization fields required (e.g. first name), and are they available on
  the lead record?
- Is a plain-text version required in addition to HTML?
- What compliance content must every email include (unsubscribe link, company
  address, physical mailing address)?
- Do we need open/click tracking or UTM tagging in the templates?

---

## Decision summary

| # | Question | Decision needed from | Status |
|---|---|---|---|
| 1 | How often should the scheduler run? | Leadership + Ops | Open |
| 2 | How long between NO_1 and NO_2? | Marketing + Leadership | Open |
| 3 | Is Brevo the production provider? | Leadership + Finance/IT | Open |
| 4 | Where do we deploy each component? | Leadership + IT | Open |
| 5 | Which templates and copy do we ship? | Marketing + Legal | Open |
