import * as Effect from "effect/Effect";
import * as SqlClient from "effect/sql/SqlClient";
import type { EngagementState, StepCode } from "@email/shared";
import type { DueActionRow } from "@email/db";
import {
  cancelAction,
  createNextAction,
  findStepByCode,
  insertSendAttempt,
  loadDueActions,
  markActionQueued,
} from "@email/db";
import { transition } from "../domain/transition.ts";
import { buildSendPayload } from "./payload.ts";
import type { QueuePublisher } from "../queue/publisher.ts";

const processDueAction = (action: DueActionRow, now: Date, publisher: QueuePublisher) =>
  Effect.gen(function* () {
    if (action.sequence_type !== action.engagement_state) {
      yield* cancelAction(action.action_id);
      return;
    }

    const result = transition(
      { engagement: action.engagement_state as EngagementState, step: action.step_code as StepCode },
      "NEXT_STEP",
    );

    for (const act of result.actions) {
      if (act.kind === "CREATE_STEP") {
        const next = yield* findStepByCode(action.sequence_id, act.stepCode);
        if (next) {
          yield* createNextAction(
            {
              id: crypto.randomUUID(),
              datasetId: action.dataset_id,
              leadId: action.lead_id,
              campaignId: action.campaign_id,
              sequenceId: action.sequence_id,
              stepId: next.id,
              templateId: next.template_id,
              domainId: action.domain_id,
              mailboxId: action.mailbox_id,
              delayDays: next.delay_days,
            },
            now,
          );
        }
      }
    }

    const sendAttemptId = crypto.randomUUID();
    const payload = buildSendPayload(action, sendAttemptId);
    yield* Effect.tryPromise({
      try: () => publisher.push(payload),
      catch: (error) => new Error(`queue push failed: ${String(error)}`),
    });

    yield* insertSendAttempt({
      id: sendAttemptId,
      actionId: action.action_id,
      datasetId: action.dataset_id,
      leadId: action.lead_id,
      campaignId: action.campaign_id,
      sequenceId: action.sequence_id,
      stepId: action.step_id,
      templateId: action.template_id,
      domainId: action.domain_id,
      mailboxId: action.mailbox_id,
    });

    yield* markActionQueued(action.action_id);
  });

export const runTick = (publisher: QueuePublisher) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    const now = new Date();
    let processed = 0;
    yield* sql.withTransaction(
      Effect.gen(function* () {
        const due = yield* loadDueActions(now);
        for (const action of due) {
          yield* processDueAction(action, now, publisher);
          processed += 1;
        }
      }),
    );
    return processed;
  });