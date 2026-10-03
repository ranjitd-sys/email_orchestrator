import * as Effect from "effect/Effect";
import * as SqlClient from "effect/sql/SqlClient";

const DDL = `
create table datasets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  external_key text unique,
  created_at timestamptz not null default now()
);

create table campaigns (
  id uuid primary key default gen_random_uuid(),
  dataset_id uuid not null references datasets(id),
  name text not null,
  status text not null default 'DRAFT'
    check (status in ('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETE')),
  config jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table templates (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns(id),
  name text,
  subject text not null,
  html text,
  text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table sequences (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id),
  sequence_type text not null
    check (sequence_type in ('NOT_OPENED', 'OPENED', 'CLICKED')),
  created_at timestamptz not null default now(),
  unique (campaign_id, sequence_type)
);

create table sequence_steps (
  id uuid primary key default gen_random_uuid(),
  sequence_id uuid not null references sequences(id),
  step_code text not null,
  step_order integer not null,
  delay_days integer not null default 0,
  template_id uuid references templates(id),
  conditions jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (sequence_id, step_code),
  unique (sequence_id, step_order)
);

create table domains (
  id uuid primary key default gen_random_uuid(),
  dataset_id uuid references datasets(id),
  domain text not null unique,
  status text not null default 'ACTIVE'
    check (status in ('ACTIVE', 'DISABLED', 'UNDER_REVIEW')),
  daily_limit integer not null default 0,
  sent_today integer not null default 0,
  health text not null default 'HEALTHY'
    check (health in ('HEALTHY', 'DEGRADED', 'BLOCKED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table mailboxes (
  id uuid primary key default gen_random_uuid(),
  domain_id uuid not null references domains(id),
  email text not null unique,
  display_name text,
  status text not null default 'ACTIVE'
    check (status in ('ACTIVE', 'DISABLED')),
  daily_limit integer not null default 0,
  sent_today integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table leads (
  id uuid primary key default gen_random_uuid(),
  dataset_id uuid not null references datasets(id),
  email text not null,
  first_name text,
  last_name text,
  attributes jsonb not null default '{}',
  engagement_state text not null default 'NEW'
    check (engagement_state in ('NEW', 'NOT_OPENED', 'OPENED', 'CLICKED', 'REPLIED', 'SUPPRESSED')),
  suppressed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index leads_dataset_email_idx on leads (dataset_id, lower(email));

create table suppression_list (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  lead_id uuid references leads(id),
  dataset_id uuid references datasets(id),
  scope text not null default 'global'
    check (scope in ('global', 'dataset')),
  reason text not null
    check (reason in ('hard_bounce', 'spam', 'unsubscribed', 'invalid_email', 'do_not_contact')),
  created_at timestamptz not null default now(),
  unique (email, scope)
);

create table scheduled_actions (
  id uuid primary key default gen_random_uuid(),
  dataset_id uuid not null references datasets(id),
  lead_id uuid not null references leads(id),
  campaign_id uuid not null references campaigns(id),
  sequence_id uuid not null references sequences(id),
  step_id uuid not null references sequence_steps(id),
  template_id uuid references templates(id),
  domain_id uuid references domains(id),
  mailbox_id uuid references mailboxes(id),
  action_status text not null default 'SCHEDULED'
    check (action_status in (
      'SCHEDULED', 'QUEUED', 'PROCESSING', 'SENT',
      'RETRY_SCHEDULED', 'CANCELLED', 'FAILED', 'COMPLETED'
    )),
  execute_at timestamptz not null,
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index scheduled_actions_active_once_idx
  on scheduled_actions (lead_id, sequence_id, step_id)
  where action_status in ('SCHEDULED', 'QUEUED', 'PROCESSING', 'RETRY_SCHEDULED');

create index scheduled_actions_due_idx on scheduled_actions (action_status, execute_at);
create index scheduled_actions_lead_idx on scheduled_actions (lead_id);
create index scheduled_actions_dataset_idx on scheduled_actions (dataset_id);

create table send_attempts (
  id uuid primary key default gen_random_uuid(),
  action_id uuid not null references scheduled_actions(id),
  dataset_id uuid not null references datasets(id),
  lead_id uuid not null references leads(id),
  campaign_id uuid not null references campaigns(id),
  sequence_id uuid not null references sequences(id),
  step_id uuid not null references sequence_steps(id),
  template_id uuid references templates(id),
  domain_id uuid references domains(id),
  mailbox_id uuid references mailboxes(id),
  attempt_no integer not null default 1,
  provider text not null default 'resend',
  provider_message_id text,
  status text not null default 'REQUESTED'
    check (status in ('REQUESTED', 'ACCEPTED', 'TRANSIENT_FAILURE', 'PERMANENT_FAILURE')),
  error text,
  requested_at timestamptz not null default now(),
  accepted_at timestamptz,
  unique (provider, provider_message_id)
);

create index send_attempts_action_idx on send_attempts (action_id);
create index send_attempts_lead_idx on send_attempts (lead_id);

create table email_events (
  id uuid primary key default gen_random_uuid(),
  provider_event_id text not null unique,
  send_attempt_id uuid references send_attempts(id),
  lead_id uuid references leads(id),
  event_type text not null
    check (event_type in (
      'sent', 'delivered', 'opened', 'unique_opened', 'clicked',
      'soft_bounce', 'hard_bounce', 'invalid', 'deferred',
      'spam', 'blocked', 'unsubscribed'
    )),
  occurred_at timestamptz,
  raw jsonb not null,
  received_at timestamptz not null default now()
);

create index email_events_lead_idx on email_events (lead_id);
create index email_events_attempt_idx on email_events (send_attempt_id);

create table job_transitions (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id),
  action_id uuid references scheduled_actions(id),
  from_state text,
  to_state text not null,
  event text not null,
  reason text,
  at timestamptz not null default now()
);

create index job_transitions_lead_idx on job_transitions (lead_id);

create table experiments (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id),
  name text not null,
  variant_a_template_id uuid references templates(id),
  variant_b_template_id uuid references templates(id),
  split numeric not null default 50 check (split >= 0 and split <= 100),
  created_at timestamptz not null default now()
);
`;

export default Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  for (const statement of DDL.split(";")
    .map((part) => part.trim())
    .filter((part) => part.length > 0)) {
    yield* sql.unsafe(statement);
  }
});