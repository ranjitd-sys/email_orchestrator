import * as Effect from "effect/Effect";
import type * as SqlClient from "effect/sql/SqlClient";
import type { SqlError } from "effect/sql/SqlError";
import { createNextAction, findStepByCode, type DueActionRow } from "@email/db";
import type { EngagementState, SendPayload, StepCode } from "@email/shared";
import { buildSendPayload } from "./payload.ts";
import type { TransitionResult } from "./transition.ts";

export interface Decided {
  readonly actor: string;
  readonly result: TransitionResult;
  readonly payload: SendPayload;
  readonly sendAttemptId: string;
  readonly nextStepCode: StepCode | null;
}

export interface StateActor {
  readonly name: string;
  decide(row: DueActionRow, result: TransitionResult): Effect.Effect<Decided, Error, SqlClient.SqlClient>;
}

export const persistNextStep = (
  row: DueActionRow,
  result: TransitionResult,
  now: Date = new Date(),
): Effect.Effect<StepCode | null, SqlError, SqlClient.SqlClient> =>
  Effect.gen(function* () {
    for (const action of result.actions) {
      if (action.kind !== "CREATE_STEP") continue;
      const next = yield* findStepByCode(row.sequence_id, action.stepCode);
      if (!next) continue;
      yield* createNextAction(
        {
          id: crypto.randomUUID(),
          datasetId: row.dataset_id,
          leadId: row.lead_id,
          campaignId: row.campaign_id,
          sequenceId: row.sequence_id,
          stepId: next.id,
          templateId: next.template_id,
          domainId: row.domain_id,
          mailboxId: row.mailbox_id,
          delayDays: next.delay_days,
        },
        now,
      );
      return action.stepCode;
    }
    return null;
  });

export const defaultActor: StateActor = {
  name: "default",
  decide: (row, result) =>
    Effect.gen(function* () {
      const sendAttemptId = crypto.randomUUID();
      const payload = buildSendPayload(row, sendAttemptId);
      const nextStepCode = yield* persistNextStep(row, result);
      return { actor: "default", result, payload, sendAttemptId, nextStepCode };
    }),
};

const stateActors = new Map<EngagementState, StateActor>();
const stepActors = new Map<StepCode, StateActor>();

export function registerStateActor(engagement: EngagementState, actor: StateActor): void {
  stateActors.set(engagement, actor);
}

export function registerStepActor(step: StepCode, actor: StateActor): void {
  stepActors.set(step, actor);
}

export function resetStateActors(): void {
  stateActors.clear();
  stepActors.clear();
}

export function actorFor(engagement: EngagementState, step: StepCode): StateActor {
  return stepActors.get(step) ?? stateActors.get(engagement) ?? defaultActor;
}