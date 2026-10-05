import * as Effect from "effect/Effect";
import * as Result from "effect/Result";
import * as SqlClient from "effect/sql/SqlClient";
import type { SqlError } from "effect/sql/SqlError";
import { createActor } from "xstate";
import {
  cancelAction,
  insertSendAttempt,
  loadDueActionById,
  markActionQueued,
  type DueActionRow,
} from "@email/db";
import type { SendPayload } from "@email/shared";
import type { QueuePublisher } from "../queue/publisher.ts";
import { actorFor } from "./actors.ts";
import {
  decidePosition,
  orchestratorMachine,
  requireRow,
  requireStep,
  type FlowOutcome,
} from "./orchestrator-machine.ts";

export type PipelineResult = "sent" | "skipped" | "cancelled";

export interface PulledAction {
  readonly row: DueActionRow | null;
  readonly stale: boolean;
}

export const pullStage = (
  actionId: string,
): Effect.Effect<PulledAction, SqlError, SqlClient.SqlClient> =>
  Effect.gen(function* () {
    const row = yield* loadDueActionById(actionId);
    if (row === null) return { row: null, stale: false };
    if (row.sequence_type !== row.engagement_state) {
      yield* cancelAction(row.action_id);
      return { row, stale: true };
    }
    return { row, stale: false };
  });

export const sendStage = (
  row: DueActionRow,
  payload: SendPayload,
  sendAttemptId: string,
  publisher: QueuePublisher,
): Effect.Effect<void, Error, SqlClient.SqlClient> =>
  Effect.gen(function* () {
    yield* Effect.tryPromise({
      try: () => publisher.push(payload),
      catch: (error) => new Error(`queue push failed: ${String(error)}`),
    });

    yield* insertSendAttempt({
      id: sendAttemptId,
      actionId: row.action_id,
      datasetId: row.dataset_id,
      leadId: row.lead_id,
      campaignId: row.campaign_id,
      sequenceId: row.sequence_id,
      stepId: row.step_id,
      templateId: row.template_id,
      domainId: row.domain_id,
      mailboxId: row.mailbox_id,
    });

    yield* markActionQueued(row.action_id);
  });

const driveFlow = (actionId: string, publisher: QueuePublisher) =>
  Effect.gen(function* () {
    const machine = createActor(orchestratorMachine, { input: { actionId } });
    machine.start();

    const pulled = yield* pullStage(actionId);
    machine.send({ type: "PULLED", row: pulled.row, stale: pulled.stale });

    const afterPull = machine.getSnapshot().context.outcome;
    if (afterPull !== "sent") return afterPull;

    const context = machine.getSnapshot().context;
    const engagement = context.engagement;
    if (engagement === null || engagement === "NEW" || engagement === "SUPPRESSED") {
      return "skipped";
    }

    const row = requireRow(context.row);
    const step = requireStep(context.step);
    const stateActor = actorFor(engagement, step);
    const decided = yield* Effect.result(stateActor.decide(row, decidePosition(row)));
    if (Result.isFailure(decided)) {
      machine.send({ type: "DECIDE_FAILED" });
      return yield* Effect.fail(decided.failure);
    }
    machine.send({ type: "DECIDED", decided: decided.success });

    const enqueued = yield* Effect.result(
      sendStage(row, decided.success.payload, decided.success.sendAttemptId, publisher),
    );
    if (Result.isFailure(enqueued)) {
      machine.send({ type: "ENQUEUE_FAILED" });
      return yield* Effect.fail(enqueued.failure);
    }
    machine.send({ type: "SENT" });
    return machine.getSnapshot().context.outcome;
  });

export const runPipeline = (
  actionId: string,
  publisher: QueuePublisher,
): Effect.Effect<PipelineResult, Error, SqlClient.SqlClient> =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    const outcome: FlowOutcome = yield* sql.withTransaction(driveFlow(actionId, publisher));
    if (outcome === "failed") {
      return yield* Effect.fail(new Error(`email flow failed for action ${actionId}`));
    }
    if (outcome === "cancelled") return "cancelled" as const;
    if (outcome === "sent") return "sent" as const;
    return "skipped" as const;
  });