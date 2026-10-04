import type { SendPayload } from "@email/shared";
import type { DueActionRow } from "@email/db";

export function buildSendPayload(row: DueActionRow, sendAttemptId: string): SendPayload {
  return {
    actionId: row.action_id,
    sendAttemptId,
    to: row.to_email,
    from: row.from_email ?? "",
    fromName: row.from_name ?? undefined,
    subject: row.subject ?? "",
    html: row.html ?? undefined,
    text: row.text ?? undefined,
    tags: {
      actionId: row.action_id,
      sendAttemptId,
      leadId: row.lead_id,
      datasetId: row.dataset_id,
      campaignId: row.campaign_id,
      sequenceId: row.sequence_id,
      stepId: row.step_id,
    },
  };
}