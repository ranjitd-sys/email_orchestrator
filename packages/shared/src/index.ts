export const ENGAGEMENT_STATES = [
  "NEW",
  "NOT_OPENED",
  "OPENED",
  "CLICKED",
  "REPLIED",
  "SUPPRESSED",
] as const;
export type EngagementState = (typeof ENGAGEMENT_STATES)[number];

export const SEQUENCE_TYPES = ["NOT_OPENED", "OPENED", "CLICKED", "REPLIED"] as const;
export type SequenceType = (typeof SEQUENCE_TYPES)[number];

export const STEP_CODES = [
  "NO_1",
  "NO_2",
  "NO_3",
  "O_1",
  "O_2",
  "O_3",
  "C_1",
  "C_2",
  "C_3",
  "R_1",
  "R_2",
  "R_3",
  "COMPLETE",
] as const;
export type StepCode = (typeof STEP_CODES)[number];

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

export const DOMAIN_EVENTS = [
  "SEND",
  "OPENED",
  "UNIQUE_OPENED",
  "CLICKED",
  "REPLIED",
  "DELIVERED",
  "SENT",
  "SOFT_BOUNCE",
  "DEFERRED",
  "BLOCKED",
  "HARD_BOUNCE",
  "SPAM",
  "UNSUBSCRIBED",
  "INVALID_EMAIL",
  "DO_NOT_CONTACT",
] as const;
export type DomainEvent = (typeof DOMAIN_EVENTS)[number];

export const SUPPRESSION_EVENTS = [
  "HARD_BOUNCE",
  "SPAM",
  "UNSUBSCRIBED",
  "INVALID_EMAIL",
  "DO_NOT_CONTACT",
] as const;
export type SuppressionEvent = (typeof SUPPRESSION_EVENTS)[number];

export function isSuppressionEvent(event: DomainEvent): event is SuppressionEvent {
  return (SUPPRESSION_EVENTS as readonly string[]).includes(event);
}

export const PROMOTING_EVENTS = ["OPENED", "UNIQUE_OPENED", "CLICKED", "REPLIED"] as const;
export type PromotingEvent = (typeof PROMOTING_EVENTS)[number];

export function isPromotingEvent(event: DomainEvent): event is PromotingEvent {
  return (PROMOTING_EVENTS as readonly string[]).includes(event);
}