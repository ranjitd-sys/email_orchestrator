import { assign, createActor, setup } from "xstate";
import type { NonReducibleUnknown } from "xstate";
import type { DomainEvent, EngagementState, SequenceType, StepCode } from "@email/shared";

export type TransitionEventType = DomainEvent | "NEXT_STEP";

export type TransitionAction =
  | { readonly kind: "CREATE_SEQUENCE"; readonly sequenceType: SequenceType }
  | { readonly kind: "CREATE_STEP"; readonly stepCode: StepCode }
  | { readonly kind: "COMPLETE_SEQUENCE"; readonly sequenceType: SequenceType }
  | { readonly kind: "CANCEL_REMAINING"; readonly sequenceType: SequenceType }
  | { readonly kind: "CANCEL_ALL_FUTURE" }
  | { readonly kind: "SUPPRESS" }
  | { readonly kind: "RECORD_ONLY" };

export interface TransitionPosition {
  readonly engagement: EngagementState;
  readonly step: StepCode | null;
}

export interface TransitionResult {
  readonly engagement: EngagementState;
  readonly step: StepCode | null;
  readonly actions: readonly TransitionAction[];
}

export interface TransitionContext {
  readonly actions: readonly TransitionAction[];
}

export interface TransitionEvent {
  readonly type: TransitionEventType;
}

export type MachineValue =
  | "NEW"
  | "SUPPRESSED"
  | { readonly NOT_OPENED: StepCode }
  | { readonly OPENED: StepCode }
  | { readonly CLICKED: StepCode }
  | { readonly REPLIED: StepCode };

const INITIAL_STEP: Record<"NOT_OPENED" | "OPENED" | "CLICKED" | "REPLIED", StepCode> = {
  NOT_OPENED: "NO_1",
  OPENED: "O_1",
  CLICKED: "C_1",
  REPLIED: "R_1",
};

export const STEP_SEQUENCE = {
  NOT_OPENED: ["NO_1", "NO_2", "NO_3"],
  OPENED: ["O_1", "O_2", "O_3"],
  CLICKED: ["C_1", "C_2", "C_3"],
  REPLIED: ["R_1", "R_2", "R_3"],
} as const satisfies Record<"NOT_OPENED" | "OPENED" | "CLICKED" | "REPLIED", readonly StepCode[]>;

const push = (action: TransitionAction) =>
  assign<TransitionContext, TransitionEvent, NonReducibleUnknown, TransitionEvent, never>(
    ({ context }) => ({ actions: [...context.actions, action] }),
  );

const createStepAction = (stepCode: StepCode): TransitionAction => ({ kind: "CREATE_STEP", stepCode });
const completeSequenceAction = (sequenceType: SequenceType): TransitionAction => ({
  kind: "COMPLETE_SEQUENCE",
  sequenceType,
});

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
    cancelClicked: push({ kind: "CANCEL_REMAINING", sequenceType: "CLICKED" }),
    createNotOpened: push({ kind: "CREATE_SEQUENCE", sequenceType: "NOT_OPENED" }),
    createOpened: push({ kind: "CREATE_SEQUENCE", sequenceType: "OPENED" }),
    createClicked: push({ kind: "CREATE_SEQUENCE", sequenceType: "CLICKED" }),
    createNo2: push(createStepAction("NO_2")),
    createNo3: push(createStepAction("NO_3")),
    completeNotOpened: push(completeSequenceAction("NOT_OPENED")),
    createO2: push(createStepAction("O_2")),
    createO3: push(createStepAction("O_3")),
    completeOpened: push(completeSequenceAction("OPENED")),
    createC2: push(createStepAction("C_2")),
    createC3: push(createStepAction("C_3")),
    completeClicked: push(completeSequenceAction("CLICKED")),
    createR2: push(createStepAction("R_2")),
    createR3: push(createStepAction("R_3")),
    completeReplied: push(completeSequenceAction("REPLIED")),
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
      initial: "NO_1",
      on: {
        OPENED: { target: "OPENED", actions: ["cancelNotOpened", "createOpened"] },
        UNIQUE_OPENED: { target: "OPENED", actions: ["cancelNotOpened", "createOpened"] },
        CLICKED: { target: "CLICKED", actions: ["cancelNotOpened", "createClicked"] },
        REPLIED: { target: "REPLIED", actions: "cancelAllFuture" },
      },
      states: {
        NO_1: { on: { NEXT_STEP: { target: "NO_2", actions: "createNo2" } } },
        NO_2: { on: { NEXT_STEP: { target: "NO_3", actions: "createNo3" } } },
        NO_3: { on: { NEXT_STEP: { target: "COMPLETE", actions: "completeNotOpened" } } },
        COMPLETE: {},
      },
    },
    OPENED: {
      initial: "O_1",
      on: {
        CLICKED: { target: "CLICKED", actions: ["cancelOpened", "createClicked"] },
        REPLIED: { target: "REPLIED", actions: "cancelAllFuture" },
      },
      states: {
        O_1: { on: { NEXT_STEP: { target: "O_2", actions: "createO2" } } },
        O_2: { on: { NEXT_STEP: { target: "O_3", actions: "createO3" } } },
        O_3: { on: { NEXT_STEP: { target: "COMPLETE", actions: "completeOpened" } } },
        COMPLETE: {},
      },
    },
    CLICKED: {
      initial: "C_1",
      on: {
        REPLIED: { target: "REPLIED", actions: "cancelAllFuture" },
      },
      states: {
        C_1: { on: { NEXT_STEP: { target: "C_2", actions: "createC2" } } },
        C_2: { on: { NEXT_STEP: { target: "C_3", actions: "createC3" } } },
        C_3: { on: { NEXT_STEP: { target: "COMPLETE", actions: "completeClicked" } } },
        COMPLETE: {},
      },
    },
    REPLIED: {
      initial: "R_1",
      states: {
        R_1: { on: { NEXT_STEP: { target: "R_2", actions: "createR2" } } },
        R_2: { on: { NEXT_STEP: { target: "R_3", actions: "createR3" } } },
        R_3: { on: { NEXT_STEP: { target: "COMPLETE", actions: "completeReplied" } } },
        COMPLETE: {},
      },
    },
    SUPPRESSED: {},
  },
});

function positionToValue(position: TransitionPosition): MachineValue {
  if (position.engagement === "NEW" || position.engagement === "SUPPRESSED") {
    return position.engagement;
  }
  const step = position.step ?? INITIAL_STEP[position.engagement];
  return { [position.engagement]: step } as MachineValue;
}

function valueToPosition(value: MachineValue): TransitionPosition {
  if (typeof value === "string") {
    return { engagement: value as EngagementState, step: null };
  }
  const [engagement, step] = Object.entries(value)[0] as [EngagementState, StepCode];
  return { engagement, step };
}

export function initialContext(): TransitionContext {
  return { actions: [] };
}

export function initialPosition(): TransitionPosition {
  return { engagement: "NEW", step: null };
}

export function transition(
  input: TransitionPosition | EngagementState,
  event: TransitionEventType,
): TransitionResult {
  const position: TransitionPosition =
    typeof input === "string" ? { engagement: input, step: null } : input;
  const actor = createActor(engagementMachine, {
    snapshot: engagementMachine.resolveState({
      value: positionToValue(position),
      context: initialContext(),
    }),
  });
  actor.start();
  actor.send({ type: event });
  const snapshot = actor.getSnapshot();
  actor.stop();
  const next = valueToPosition(snapshot.value as MachineValue);
  return {
    engagement: next.engagement,
    step: next.step,
    actions: snapshot.context.actions,
  };
}
