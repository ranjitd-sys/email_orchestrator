import { describe, expect, test } from "bun:test";
import { createActor } from "xstate";
import type { DueActionRow } from "@email/db";
import type { EngagementState, SendPayload, StepCode } from "@email/shared";
import type { Decided } from "../src/domain/actors.ts";
import { orchestratorMachine } from "../src/domain/orchestrator-machine.ts";
import type { TransitionResult } from "../src/domain/transition.ts";

const rowFor = (engagement: EngagementState, step: StepCode): DueActionRow => ({
  action_id: "a1",
  dataset_id: "d1",
  lead_id: "l1",
  campaign_id: "c1",
  sequence_id: "s1",
  sequence_type: engagement,
  step_id: "st1",
  step_code: step,
  template_id: "t1",
  domain_id: "dm1",
  mailbox_id: "mb1",
  engagement_state: engagement,
  to_email: "lead@example.com",
  from_email: "sender@example.com",
  from_name: "Sender",
  subject: "Hi",
  html: "<p>hi</p>",
  text: "hi",
});

const row = rowFor("NOT_OPENED", "NO_1");

const result: TransitionResult = {
  engagement: "NOT_OPENED",
  step: "NO_2",
  actions: [{ kind: "CREATE_STEP", stepCode: "NO_2" }],
};

const payload: SendPayload = {
  actionId: "a1",
  sendAttemptId: "attempt_1",
  to: "lead@example.com",
  from: "sender@example.com",
  subject: "Hi",
};

const decided: Decided = {
  actor: "notOpenedActor",
  result,
  payload,
  sendAttemptId: "attempt_1",
  nextStepCode: "NO_2",
};

const start = () => {
  const actor = createActor(orchestratorMachine, { input: { actionId: "a1" } });
  actor.start();
  return actor;
};

describe("email flow machine (PULLED -> DECIDED -> SENT)", () => {
  test("runs pulled -> decided -> sent -> done with the decided payload", () => {
    const actor = start();
    expect(actor.getSnapshot().value).toBe("pulled");

    actor.send({ type: "PULLED", row, stale: false });
    expect(actor.getSnapshot().value as unknown).toEqual({ decided: { NOT_OPENED: "NO_1" } });
    expect(actor.getSnapshot().context.engagement).toBe("NOT_OPENED");
    expect(actor.getSnapshot().context.step).toBe("NO_1");
    expect(actor.getSnapshot().context.outcome).toBe("sent");

    actor.send({ type: "DECIDED", decided });
    expect(actor.getSnapshot().value).toBe("sent");
    expect(actor.getSnapshot().context.actor).toBe("notOpenedActor");
    expect(actor.getSnapshot().context.payload).toBe(payload);
    expect(actor.getSnapshot().context.nextStepCode).toBe("NO_2");

    actor.send({ type: "SENT" });
    expect(actor.getSnapshot().value).toBe("done");
    expect(actor.getSnapshot().status).toBe("done");
    expect(actor.getSnapshot().context.outcome).toBe("sent");
    actor.stop();
  });

  test("routes each state and step to its own decide substate", () => {
    const cases: [EngagementState, StepCode][] = [
      ["NOT_OPENED", "NO_1"],
      ["NOT_OPENED", "NO_3"],
      ["OPENED", "O_1"],
      ["OPENED", "O_2"],
      ["CLICKED", "C_3"],
      ["REPLIED", "R_2"],
    ];
    for (const [engagement, step] of cases) {
      const actor = start();
      actor.send({ type: "PULLED", row: rowFor(engagement, step), stale: false });
      expect(actor.getSnapshot().value as unknown).toEqual({ decided: { [engagement]: step } });
      actor.stop();
    }
  });

  test("a missing action goes straight to done as skipped", () => {
    const actor = start();
    actor.send({ type: "PULLED", row: null, stale: false });
    expect(actor.getSnapshot().value).toBe("done");
    expect(actor.getSnapshot().context.outcome).toBe("skipped");
    actor.stop();
  });

  test("a stale action goes to cancelled without deciding", () => {
    const actor = start();
    actor.send({ type: "PULLED", row, stale: true });
    expect(actor.getSnapshot().value).toBe("cancelled");
    expect(actor.getSnapshot().context.outcome).toBe("cancelled");
    actor.stop();
  });

  test("a failed decision lands on failed", () => {
    const actor = start();
    actor.send({ type: "PULLED", row, stale: false });
    actor.send({ type: "DECIDE_FAILED" });
    expect(actor.getSnapshot().value).toBe("failed");
    expect(actor.getSnapshot().context.outcome).toBe("failed");
    actor.stop();
  });

  test("a failed enqueue lands on failed", () => {
    const actor = start();
    actor.send({ type: "PULLED", row, stale: false });
    actor.send({ type: "DECIDED", decided });
    actor.send({ type: "ENQUEUE_FAILED" });
    expect(actor.getSnapshot().value).toBe("failed");
    expect(actor.getSnapshot().context.outcome).toBe("failed");
    actor.stop();
  });
});