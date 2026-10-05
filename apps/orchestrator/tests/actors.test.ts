import { describe, expect, test } from "bun:test";
import * as Effect from "effect/Effect";
import * as SqlClient from "effect/sql/SqlClient";
import type { DueActionRow } from "@email/db";
import {
  actorFor,
  defaultActor,
  persistNextStep,
  registerStateActor,
  registerStepActor,
  resetStateActors,
} from "../src/domain/actors.ts";
import type { Decided, StateActor } from "../src/domain/actors.ts";
import { decidePosition } from "../src/domain/orchestrator-machine.ts";

const row: DueActionRow = {
  action_id: "a1",
  dataset_id: "d1",
  lead_id: "l1",
  campaign_id: "c1",
  sequence_id: "s1",
  sequence_type: "NOT_OPENED",
  step_id: "st1",
  step_code: "NO_1",
  template_id: "t1",
  domain_id: "dm1",
  mailbox_id: "mb1",
  engagement_state: "NOT_OPENED",
  to_email: "lead@example.com",
  from_email: "sender@example.com",
  from_name: "Sender",
  subject: "Hi",
  html: "<p>hi</p>",
  text: "hi",
};

const decided = (actor: string): Decided => ({
  actor,
  result: { engagement: "NOT_OPENED", step: null, actions: [] },
  payload: {
    actionId: row.action_id,
    sendAttemptId: "attempt_1",
    to: row.to_email,
    from: row.from_email ?? "",
    subject: actor,
  },
  sendAttemptId: "attempt_1",
  nextStepCode: null,
});

const stubActor = (name: string): StateActor => ({
  name,
  decide: () => Effect.succeed(decided(name)),
});

const recordingSql = () => {
  const calls: { sql: string; values: readonly unknown[] }[] = [];
  const sql = ((strings: TemplateStringsArray, ...values: unknown[]) => {
    const text = strings.join("?");
    calls.push({ sql: text, values });
    if (text.includes("from sequence_steps")) {
      return Effect.succeed([{ id: "st2", template_id: "t2", delay_days: 2 }]);
    }
    return Effect.succeed([]);
  }) as unknown as SqlClient.SqlClient;
  return { sql, calls };
};

const provide = <A, E>(effect: Effect.Effect<A, E, SqlClient.SqlClient>, sql: SqlClient.SqlClient) =>
  Effect.runPromise(effect.pipe(Effect.provideService(SqlClient.SqlClient, sql)));

describe("state actors", () => {
  test("falls back to the default actor when nothing is registered", () => {
    resetStateActors();
    expect(actorFor("NOT_OPENED", "NO_2")).toBe(defaultActor);
    expect(actorFor("SUPPRESSED", "COMPLETE")).toBe(defaultActor);
  });

  test("a registered actor takes over its engagement state", () => {
    resetStateActors();
    const actor = stubActor("clickedActor");
    registerStateActor("CLICKED", actor);
    expect(actorFor("CLICKED", "C_2")).toBe(actor);
    expect(actorFor("OPENED", "O_1")).toBe(defaultActor);
    resetStateActors();
  });

  test("a step actor beats the engagement actor", () => {
    resetStateActors();
    const stateActor = stubActor("openedActor");
    const stepActor = stubActor("o2Actor");
    registerStateActor("OPENED", stateActor);
    registerStepActor("O_2", stepActor);
    expect(actorFor("OPENED", "O_2")).toBe(stepActor);
    expect(actorFor("OPENED", "O_3")).toBe(stateActor);
    expect(actorFor("NOT_OPENED", "NO_1")).toBe(defaultActor);
    resetStateActors();
  });

  test("the default actor builds the payload and returns the next step", async () => {
    resetStateActors();
    const { sql, calls } = recordingSql();
    const result = await provide(defaultActor.decide(row, decidePosition(row)), sql);

    expect(result.actor).toBe("default");
    expect(result.sendAttemptId.length).toBeGreaterThan(0);
    expect(result.payload.actionId).toBe("a1");
    expect(result.payload.sendAttemptId).toBe(result.sendAttemptId);
    expect(result.nextStepCode).toBe("NO_2");
    expect(calls.some((c) => c.sql.includes("insert into scheduled_actions"))).toBe(true);
  });

  test("persistNextStep is a no-op when the transition creates no step", async () => {
    resetStateActors();
    const { sql, calls } = recordingSql();
    const result = await provide(
      persistNextStep(row, { engagement: "NOT_OPENED", step: "COMPLETE", actions: [] }),
      sql,
    );

    expect(result).toBeNull();
    expect(calls).toHaveLength(0);
  });

  test("a custom actor can replace the payload the flow sends", async () => {
    resetStateActors();
    registerStepActor("O_1", {
      name: "o1Actor",
      decide: (source, result) =>
        Effect.succeed({ ...decided("o1Actor"), result, nextStepCode: null }).pipe(
          Effect.map((value) => ({
            ...value,
            payload: { ...value.payload, actionId: source.action_id },
          })),
        ),
    });

    const actor = actorFor("OPENED", "O_1");
    const value = await provide(actor.decide(row, decidePosition(row)), recordingSql().sql);
    expect(value.actor).toBe("o1Actor");
    expect(value.nextStepCode).toBeNull();
    resetStateActors();
  });
});