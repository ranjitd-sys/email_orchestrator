import type { SendPayload } from "@email/shared";
import type { DueActionRow } from "@email/db";

export const MERGE_DEFAULTS = {
  demo_link: "https://deepecom.example.com/demo",
  unsubscribe_url: "https://deepecom.example.com/unsubscribe",
} as const;

export function mergeFields(
  template: string | null | undefined,
  vars: Record<string, string>,
): string {
  if (!template) return "";
  return template.replace(
    /\{\{\s*([a-z0-9_]+)\s*\}\}/gi,
    (_match, key: string) => vars[key.toLowerCase()] ?? "",
  );
}

export function mergeVars(row: DueActionRow): Record<string, string> {
  return {
    first_name: row.first_name?.trim() || "there",
    sender_name: row.from_name ?? "DeepEcom Team",
    sender_title: "Team",
    demo_link: MERGE_DEFAULTS.demo_link,
    unsubscribe_url: MERGE_DEFAULTS.unsubscribe_url,
  };
}

export function buildSendPayload(row: DueActionRow, sendAttemptId: string): SendPayload {
  const vars = mergeVars(row);
  return {
    actionId: row.action_id,
    sendAttemptId,
    to: row.to_email,
    from: row.from_email ?? "",
    fromName: row.from_name ?? undefined,
    subject: mergeFields(row.subject, vars),
    html: row.html ? mergeFields(row.html, vars) : undefined,
    text: row.text ? mergeFields(row.text, vars) : undefined,
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
