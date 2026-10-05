import { assign, setup } from "xstate";
import type { DueActionRow } from "@email/db";
import type { EngagementState, SendPayload, StepCode } from "@email/shared";
import type { Decided } from "./actors.ts";
import { STEP_SEQUENCE, transition, type TransitionResult } from "./transition.ts";

export type FlowOutcome = "sent" | "skipped" | "cancelled" | "failed";

export interface OrchestratorContext {
  readonly actionId: string;
  readonly row: DueActionRow | null;
  readonly engagement: EngagementState | null;
  readonly step: StepCode | null;
  readonly actor: string | null;
  readonly result: TransitionResult | null;
  readonly payload: SendPayload | null;
  readonly sendAttemptId: string | null;
  readonly nextStepCode: StepCode | null;
  readonly outcome: FlowOutcome;
}

export type OrchestratorEvent =
  | { readonly type: "PULLED"; readonly row: DueActionRow | null; readonly stale: boolean }
  | { readonly type: "DECIDED"; readonly decided: Decided }
  | { readonly type: "DECIDE_FAILED" }
  | { readonly type: "SENT" }
  | { readonly type: "ENQUEUE_FAILED" };

export function decidePosition(row: DueActionRow): TransitionResult {
  return transition(
    { engagement: row.engagement_state as EngagementState, step: row.step_code as StepCode },
    "NEXT_STEP",
  );
}

export function requireRow(row: DueActionRow | null): DueActionRow {
  if (row === null) throw new Error("flow reached a stage without a pulled action");
  return row;
}

export function requireEngagement(engagement: EngagementState | null): EngagementState {
  if (engagement === null) throw new Error("flow reached DECIDED without an engagement state");
  return engagement;
}

export function requireStep(step: StepCode | null): StepCode {
  if (step === null) throw new Error("flow reached DECIDED without a step");
  return step;
}

const stepStates = (codes: readonly StepCode[]) =>
  Object.fromEntries(codes.map((code) => [code, { meta: { actor: { step: code } } }]));

const sequenceStates = (codes: readonly StepCode[]) => ({
  initial: "select",
  states: {
    select: {
      always: [
        ...codes.map((code) => ({
          guard: ({ context }: { context: OrchestratorContext }) => context.step === code,
          target: code,
        })),
        { target: codes[0] },
      ],
    },
    ...stepStates(codes),
  },
});

export const orchestratorMachine = setup({
  types: {
    context: {} as OrchestratorContext,
    events: {} as OrchestratorEvent,
    input: {} as { actionId: string },
  },
}).createMachine({
  id: "emailFlow",
  initial: "pulled",
  context: ({ input }) => ({
    actionId: input.actionId,
    row: null,
    engagement: null,
    step: null,
    actor: null,
    result: null,
    payload: null,
    sendAttemptId: null,
    nextStepCode: null,
    outcome: "skipped",
  }),
  states: {
    pulled: {
      on: {
        PULLED: [
          { guard: ({ event }) => event.row === null, target: "done" },
          {
            guard: ({ event }) => event.stale,
            target: "cancelled",
            actions: assign({
              row: ({ event }) => event.row,
              engagement: ({ event }) =>
                event.row ? (event.row.engagement_state as EngagementState) : null,
              step: ({ event }) => (event.row ? (event.row.step_code as StepCode) : null),
              outcome: () => "cancelled" as FlowOutcome,
            }),
          },
          {
            target: "decided",
            actions: assign({
              row: ({ event }) => event.row,
              engagement: ({ event }) =>
                event.row ? (event.row.engagement_state as EngagementState) : null,
              step: ({ event }) => (event.row ? (event.row.step_code as StepCode) : null),
              outcome: () => "sent" as FlowOutcome,
            }),
          },
        ],
      },
    },
    decided: {
      initial: "routing",
      on: {
        DECIDED: {
          target: "sent",
          actions: assign({
            actor: ({ event }) => event.decided.actor,
            result: ({ event }) => event.decided.result,
            payload: ({ event }) => event.decided.payload,
            sendAttemptId: ({ event }) => event.decided.sendAttemptId,
            nextStepCode: ({ event }) => event.decided.nextStepCode,
          }),
        },
        DECIDE_FAILED: {
          target: "failed",
          actions: assign({ outcome: () => "failed" as FlowOutcome }),
        },
      },
      states: {
        routing: {
          always: [
            {
              guard: ({ context }) => context.engagement === "NOT_OPENED",
              target: "NOT_OPENED",
            },
            { guard: ({ context }) => context.engagement === "OPENED", target: "OPENED" },
            { guard: ({ context }) => context.engagement === "CLICKED", target: "CLICKED" },
            { guard: ({ context }) => context.engagement === "REPLIED", target: "REPLIED" },
            { guard: ({ context }) => context.engagement === "NEW", target: "NEW" },
            { target: "SUPPRESSED" },
          ],
        },
        NOT_OPENED: sequenceStates(STEP_SEQUENCE.NOT_OPENED),
        OPENED: sequenceStates(STEP_SEQUENCE.OPENED),
        CLICKED: sequenceStates(STEP_SEQUENCE.CLICKED),
        REPLIED: sequenceStates(STEP_SEQUENCE.REPLIED),
        NEW: {},
        SUPPRESSED: {},
      },
    },
    sent: {
      on: {
        SENT: { target: "done", actions: assign({ outcome: () => "sent" as FlowOutcome }) },
        ENQUEUE_FAILED: {
          target: "failed",
          actions: assign({ outcome: () => "failed" as FlowOutcome }),
        },
      },
    },
    done: { type: "final" },
    cancelled: { type: "final" },
    failed: { type: "final" },
  },
});