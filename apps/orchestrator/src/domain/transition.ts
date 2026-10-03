import { assign, createActor, setup } from "xstate";
import type { NonReducibleUnknown } from "xstate";
import type { DomainEvent, EngagementState } from "@email/shared";

export type TransitionSequenceType = "NOT_OPENED" | "OPENED" | "CLICKED";

export type TransitionAction =
  | { readonly kind: "CREATE_SEQUENCE"; readonly sequenceType: TransitionSequenceType }
  | { readonly kind: "CANCEL_REMAINING"; readonly sequenceType: TransitionSequenceType }
  | { readonly kind: "CANCEL_ALL_FUTURE" }
  | { readonly kind: "SUPPRESS" }
  | { readonly kind: "RECORD_ONLY" };

export interface TransitionResult {
  readonly state: EngagementState;
  readonly actions: readonly TransitionAction[];
}

export interface TransitionContext {
  readonly actions: readonly TransitionAction[];
}

export interface TransitionEvent {
  readonly type: DomainEvent;
}

const push = (action: TransitionAction) =>
  assign<TransitionContext, TransitionEvent, NonReducibleUnknown, TransitionEvent, never>(
    ({ context }) => ({ actions: [...context.actions, action] }),
  );

const suppressTarget = {
  target: ".SUPPRESSED",
  actions: ["cancelAllFuture", "suppress"],
} as const;

export const engagementMachine = setup({
  types: {
    context: {} as TransitionContext,
    events: {} as TransitionEvent,
  },
  actions: {
    recordOnly: push({ kind: "RECORD_ONLY" }),
    cancelAllFuture: push({ kind: "CANCEL_ALL_FUTURE" }),
    suppress: push({ kind: "SUPPRESS" }),
    cancelNotOpened: push({ kind: "CANCEL_REMAINING", sequenceType: "NOT_OPENED" }),
    cancelOpened: push({ kind: "CANCEL_REMAINING", sequenceType: "OPENED" }),
    createNotOpened: push({ kind: "CREATE_SEQUENCE", sequenceType: "NOT_OPENED" }),
    createOpened: push({ kind: "CREATE_SEQUENCE", sequenceType: "OPENED" }),
    createClicked: push({ kind: "CREATE_SEQUENCE", sequenceType: "CLICKED" }),
  },
}).createMachine({
  id: "leadEngagement",
  initial: "NEW",
  context: { actions: [] },
  on: {
    HARD_BOUNCE: suppressTarget,
    SPAM: suppressTarget,
    UNSUBSCRIBED: suppressTarget,
    INVALID_EMAIL: suppressTarget,
    DO_NOT_CONTACT: suppressTarget,
    "*": { actions: "recordOnly" },
  },
  states: {
    NEW: {
      on: {
        SEND: { target: "NOT_OPENED", actions: "createNotOpened" },
      },
    },
    NOT_OPENED: {
      on: {
        OPENED: { target: "OPENED", actions: ["cancelNotOpened", "createOpened"] },
        UNIQUE_OPENED: { target: "OPENED", actions: ["cancelNotOpened", "createOpened"] },
        CLICKED: { target: "CLICKED", actions: ["cancelNotOpened", "createClicked"] },
        REPLIED: { target: "REPLIED", actions: "cancelAllFuture" },
      },
    },
    OPENED: {
      on: {
        CLICKED: { target: "CLICKED", actions: ["cancelOpened", "createClicked"] },
        REPLIED: { target: "REPLIED", actions: "cancelAllFuture" },
      },
    },
    CLICKED: {
      on: {
        REPLIED: { target: "REPLIED", actions: "cancelAllFuture" },
      },
    },
    REPLIED: {},
    SUPPRESSED: {},
  },
});

export function initialContext(): TransitionContext {
  return { actions: [] };
}

export function transition(state: EngagementState, event: DomainEvent): TransitionResult {
  const actor = createActor(engagementMachine, {
    snapshot: engagementMachine.resolveState({ value: state, context: initialContext() }),
  });
  actor.start();
  actor.send({ type: event });
  const snapshot = actor.getSnapshot();
  actor.stop();
  return {
    state: snapshot.value as EngagementState,
    actions: snapshot.context.actions,
  };
}