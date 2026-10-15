import * as Effect from "effect/Effect";
import * as SqlClient from "effect/sql/SqlClient";

export interface DueActionRow {
  action_id: string;
  dataset_id: string;
  lead_id: string;
  campaign_id: string;
  sequence_id: string;
  sequence_type: string;
  step_id: string;
  step_code: string;
  template_id: string | null;
  domain_id: string | null;
  mailbox_id: string | null;
  engagement_state: string;
  first_name?: string | null;
  to_email: string;
  from_email: string | null;
  from_name: string | null;
  subject: string | null;
  html: string | null;
  text: string | null;
}

export interface NextActionInput {
  id: string;
  datasetId: string;
  leadId: string;
  campaignId: string;
  sequenceId: string;
  stepId: string;
  templateId: string | null;
  domainId: string | null;
  mailboxId: string | null;
  delayDays: number;
}

export interface SendAttemptInput {
  id: string;
  actionId: string;
  datasetId: string;
  leadId: string;
  campaignId: string;
  sequenceId: string;
  stepId: string;
  templateId: string | null;
  domainId: string | null;
  mailboxId: string | null;
  provider?: string;
}

export const loadDueActions = (now: Date) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    return yield* sql<DueActionRow>`
      select
        sa.id as action_id,
        sa.dataset_id,
        sa.lead_id,
        sa.campaign_id,
        sa.sequence_id,
        sq.sequence_type,
        sa.step_id,
        st.step_code,
        sa.template_id,
        sa.domain_id,
        sa.mailbox_id,
        l.engagement_state,
        l.first_name,
        l.email as to_email,
        mb.email as from_email,
        mb.display_name as from_name,
        t.subject,
        t.html,
        t.text
      from scheduled_actions sa
      join sequences sq on sq.id = sa.sequence_id
      join sequence_steps st on st.id = sa.step_id
      join leads l on l.id = sa.lead_id
      left join templates t on t.id = sa.template_id
      left join mailboxes mb on mb.id = sa.mailbox_id
      where sa.action_status = 'SCHEDULED'
        and sa.execute_at <= ${now}
      order by sa.execute_at
      for update of sa skip locked
    `;
  });

export const loadDueActionById = (actionId: string) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    const rows = yield* sql<DueActionRow>`
      select
        sa.id as action_id,
        sa.dataset_id,
        sa.lead_id,
        sa.campaign_id,
        sa.sequence_id,
        sq.sequence_type,
        sa.step_id,
        st.step_code,
        sa.template_id,
        sa.domain_id,
        sa.mailbox_id,
        l.engagement_state,
        l.first_name,
        l.email as to_email,
        mb.email as from_email,
        mb.display_name as from_name,
        t.subject,
        t.html,
        t.text
      from scheduled_actions sa
      join sequences sq on sq.id = sa.sequence_id
      join sequence_steps st on st.id = sa.step_id
      join leads l on l.id = sa.lead_id
      left join templates t on t.id = sa.template_id
      left join mailboxes mb on mb.id = sa.mailbox_id
      where sa.id = ${actionId}
      for update of sa skip locked
    `;
    return rows[0] ?? null;
  });

export const loadDueActionIds = (now: Date) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    const rows = yield* sql<{ action_id: string }>`
      select sa.id as action_id
      from scheduled_actions sa
      where sa.action_status = 'SCHEDULED'
        and sa.execute_at <= ${now}
      order by sa.execute_at
    `;
    return rows.map((r) => r.action_id);
  });

export const findStepByCode = (sequenceId: string, stepCode: string) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    const rows = yield* sql<{ id: string; template_id: string | null; delay_days: number }>`
      select id, template_id, delay_days
      from sequence_steps
      where sequence_id = ${sequenceId} and step_code = ${stepCode}
    `;
    return rows[0] ?? null;
  });

export const createNextAction = (input: NextActionInput, now: Date) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    yield* sql`
      insert into scheduled_actions
        (id, dataset_id, lead_id, campaign_id, sequence_id, step_id,
         template_id, domain_id, mailbox_id, action_status, execute_at)
      values
        (${input.id}, ${input.datasetId}, ${input.leadId}, ${input.campaignId},
         ${input.sequenceId}, ${input.stepId}, ${input.templateId},
         ${input.domainId}, ${input.mailboxId}, 'SCHEDULED',
         ${now} + (${input.delayDays} * interval '1 day'))
      on conflict do nothing
    `;
  });

export const markActionQueued = (actionId: string) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    yield* sql`
      update scheduled_actions
      set action_status = 'QUEUED', updated_at = now()
      where id = ${actionId} and action_status = 'SCHEDULED'
    `;
  });

export const cancelAction = (actionId: string) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    yield* sql`
      update scheduled_actions
      set action_status = 'CANCELLED', cancelled_at = now(), updated_at = now()
      where id = ${actionId}
    `;
  });

export const insertSendAttempt = (input: SendAttemptInput) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    yield* sql`
      insert into send_attempts
        (id, action_id, dataset_id, lead_id, campaign_id, sequence_id, step_id,
         template_id, domain_id, mailbox_id, attempt_no, provider, status, requested_at)
      values
        (${input.id}, ${input.actionId}, ${input.datasetId}, ${input.leadId},
         ${input.campaignId}, ${input.sequenceId}, ${input.stepId},
         ${input.templateId}, ${input.domainId}, ${input.mailboxId},
          1, ${input.provider ?? 'brevo'}, 'REQUESTED', now())
    `;
  });

export const createFirstStep = (args: {
  leadId: string;
  datasetId: string;
  campaignId: string;
  sequenceType: string;
  domainId?: string | null;
  mailboxId?: string | null;
}) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    const sequences = yield* sql<{ id: string }>`
      select id from sequences
      where campaign_id = ${args.campaignId} and sequence_type = ${args.sequenceType}
    `;
    const sequence = sequences[0];
    if (!sequence) return null;
    const steps = yield* sql<{ id: string; template_id: string | null }>`
      select id, template_id from sequence_steps
      where sequence_id = ${sequence.id} and step_order = 1
    `;
    const step = steps[0];
    if (!step) return null;
    const id = crypto.randomUUID();
    const existing = yield* sql<{ id: string }>`
      select sa.id
      from scheduled_actions sa
      where sa.lead_id = ${args.leadId}
        and sa.sequence_id = ${sequence.id}
        and sa.action_status in ('SCHEDULED', 'QUEUED')
      limit 1
    `;
    if (existing.length > 0) {
      const ex = existing[0];
      if (ex && ex.id) {
        return { actionId: ex.id, stepId: step.id };
      }
    }
    yield* sql`
      insert into scheduled_actions
        (id, dataset_id, lead_id, campaign_id, sequence_id, step_id,
         template_id, domain_id, mailbox_id, action_status, execute_at)
      values
        (${id}, ${args.datasetId}, ${args.leadId}, ${args.campaignId},
         ${sequence.id}, ${step.id}, ${step.template_id},
         ${args.domainId ?? null}, ${args.mailboxId ?? null},
         'SCHEDULED', now())
      on conflict do nothing
    `;
    yield* sql`
      update leads set engagement_state = ${args.sequenceType}, updated_at = now()
      where id = ${args.leadId}
    `;
    return { actionId: id, stepId: step.id };
  });
export interface PersistEmailEventInput {
  providerEventId: string;
  sendAttemptId: string | null;
  leadId: string | null;
  eventType: string;
  occurredAt: Date | null;
  raw: unknown;
}

export const persistEmailEvent = (input: PersistEmailEventInput) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    const result = yield* sql<{ id: string }>`
      insert into email_events
        (provider_event_id, send_attempt_id, lead_id, event_type, occurred_at, raw)
      values
        (${input.providerEventId}, ${input.sendAttemptId}, ${input.leadId},
         ${input.eventType}, ${input.occurredAt}, ${JSON.stringify(input.raw)}::jsonb)
      on conflict (provider_event_id) do nothing
      returning id
    `;
    return result[0] ?? null;
  });

export interface AttemptRow {
  id: string;
  action_id: string;
  lead_id: string;
  dataset_id: string;
  campaign_id: string;
  sequence_id: string;
  step_id: string;
  engagement_state: string;
}

export const findAttemptByMessageId = (providerMessageId: string) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    const rows = yield* sql<AttemptRow>`
      select
        sa.id,
        sa.action_id,
        sa.lead_id,
        sa.dataset_id,
        sa.campaign_id,
        sa.sequence_id,
        sa.step_id,
        l.engagement_state
      from send_attempts sa
      join leads l on l.id = sa.lead_id
      where sa.provider_message_id = ${providerMessageId}
        and sa.provider = 'resend'
    `;
    return rows[0] ?? null;
  });

export const findAttemptBySendAttemptId = (sendAttemptId: string) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    const rows = yield* sql<AttemptRow>`
      select
        sa.id,
        sa.action_id,
        sa.lead_id,
        sa.dataset_id,
        sa.campaign_id,
        sa.sequence_id,
        sa.step_id,
        l.engagement_state
      from send_attempts sa
      join leads l on l.id = sa.lead_id
      where sa.id = ${sendAttemptId}
    `;
    return rows[0] ?? null;
  });

export const loadLeadForUpdate = (leadId: string) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    const rows = yield* sql<{ id: string; engagement_state: string; email: string }>`
      select id, engagement_state, email
      from leads
      where id = ${leadId}
      for update
    `;
    return rows[0] ?? null;
  });

export const updateLeadState = (leadId: string, newState: string) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    yield* sql`
      update leads set engagement_state = ${newState}, updated_at = now()
      where id = ${leadId}
    `;
  });

export const insertJobTransition = (input: {
  leadId: string;
  actionId: string | null;
  fromState: string | null;
  toState: string;
  event: string;
  reason: string;
}) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    yield* sql`
      insert into job_transitions (lead_id, action_id, from_state, to_state, event, reason)
      values (${input.leadId}, ${input.actionId}, ${input.fromState}, ${input.toState}, ${input.event}, ${input.reason})
    `;
  });

export const cancelActiveActionsExceptTerminal = (leadId: string) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    yield* sql`
      update scheduled_actions
      set action_status = 'CANCELLED', cancelled_at = now(), updated_at = now()
      where lead_id = ${leadId}
        and action_status in ('SCHEDULED', 'QUEUED', 'PROCESSING', 'RETRY_SCHEDULED')
    `;
  });

export const updateSendAttemptAccepted = (sendAttemptId: string, providerMessageId: string) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    yield* sql`
      update send_attempts
      set provider_message_id = ${providerMessageId}, status = 'ACCEPTED', accepted_at = now()
      where id = ${sendAttemptId}
    `;
  });
