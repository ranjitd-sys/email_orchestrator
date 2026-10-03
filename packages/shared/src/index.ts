/**
 * Contract types shared by the orchestrator (Bun) and the Worker (Cloudflare).
 * Task 1 of the spec: engagement state is separate from sequence/step execution.
 */

/** Business state of the lead (spec §2). */
export const ENGAGEMENT_STATES = [
  "NEW",
  "NOT_OPENED",
  "OPENED",
  "CLICKED",
  "REPLIED",
  "SUPPRESSED",
] as const;
export type EngagementState = (typeof ENGAGEMENT_STATES)[number];

/** Behavioral path being executed (spec §7). */
export const SEQUENCE_TYPES = ["NOT_OPENED", "OPENED", "CLICKED"] as const;
export type SequenceType = (typeof SEQUENCE_TYPES)[number];

/** Lifecycle of a scheduled action (spec §6). */
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

/**
 * Message pushed onto the Cloudflare Queue by the orchestrator.
 *
 * Only the id travels. The Worker then calls the orchestrator's `claim`
 * endpoint to (a) perform the spec §6 pre-send re-check and (b) fetch the
 * rendered email. This keeps queue messages well under the size limit and
 * guarantees the worker never sends from stale data.
 */
export interface SendJobMessage {
  actionId: string;
}

/** Outcome the Worker reports back to the orchestrator after attempting a send. */
export type SendResultStatus = "SENT" | "RETRY_SCHEDULED" | "FAILED";

export interface SendResult {
  status: SendResultStatus;
  providerMessageId?: string;
  error?: string;
}