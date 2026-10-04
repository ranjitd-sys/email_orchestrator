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
         1, 'resend', 'REQUESTED', now())
    `;
  });

export const createFirstStep = (args: {
  leadId: string;
  datasetId: string;
  campaignId: string;
  sequenceType: string;
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
    yield* sql`
      insert into scheduled_actions
        (id, dataset_id, lead_id, campaign_id, sequence_id, step_id,
         template_id, action_status, execute_at)
      values
        (${id}, ${args.datasetId}, ${args.leadId}, ${args.campaignId},
         ${sequence.id}, ${step.id}, ${step.template_id}, 'SCHEDULED', now())
      on conflict do nothing
    `;
    yield* sql`
      update leads set engagement_state = ${args.sequenceType}, updated_at = now()
      where id = ${args.leadId}
    `;
    return { actionId: id, stepId: step.id };
  });