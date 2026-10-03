export const ENGAGEMENT_STATES = [
  "NEW",
  "NOT_OPENED",
  "OPENED",
  "CLICKED",
  "REPLIED",
  "SUPPRESSED",
] as const;
export type EngagementState = (typeof ENGAGEMENT_STATES)[number];

export const SEQUENCE_TYPES = ["NOT_OPENED", "OPENED", "CLICKED"] as const;
export type SequenceType = (typeof SEQUENCE_TYPES)[number];

export const ACTION_STATUSES = [
  "SCHEDULED",
  "QUEUED",
  "PROCESSING",
  "SENT",
  "RETRY_SCHEDULED",
  "CANCELLED",
  "FAILED",
  "COMPLETED",
] as const;
export type ActionStatus = (typeof ACTION_STATUSES)[number];

export interface SendPayload {
  actionId: string;
  sendAttemptId: string;
  to: string;
  from: string;
  fromName?: string;
  subject: string;
  html?: string;
  text?: string;
  tags?: Record<string, string>;
  headers?: Record<string, string>;
}

export interface ProviderSendResult {
  providerMessageId: string;
}

export interface EmailSender {
  sendEmail(payload: SendPayload): Promise<ProviderSendResult>;
}