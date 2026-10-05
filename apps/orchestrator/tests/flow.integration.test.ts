import { describe, expect, test } from "bun:test";
import * as Effect from "effect/Effect";
import * as Redacted from "effect/Redacted";
import * as PgClient from "@effect/sql-pg/PgClient";
import * as SqlClient from "effect/sql/SqlClient";
import {
  createFirstStep,
  seedProgram,
  SEED_CAMPAIGN_ID,
  SEED_DATASET_ID,
} from "@email/db";
import { runTick } from "../src/domain/tick.ts";
import { LocalQueue } from "../src/queue/publisher.ts";

const enabled = process.env.DATABASE_URL !== undefined && process.env.RUN_DB_TESTS === "1";
const testIf = enabled ? test : test.skip;

const run = <A, E = unknown>(effect: Effect.Effect<A, E, SqlClient.SqlClient>): Promise<A> => {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required for DB integration tests");
  return Effect.runPromise(
    Effect.scoped(effect.pipe(Effect.provide(PgClient.layer({ url: Redacted.make(url) })))),
  );
};

const LEAD = "99990000-0000-0000-0000-000000000001";
const STEP_NO_1 = "70000000-0000-0000-0000-000000000001";
const STEP_NO_2 = "70000000-0000-0000-0000-000000000002";

const resetLead = () =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    yield* sql`delete from send_attempts where lead_id = ${LEAD}`;
    yield* sql`delete from scheduled_actions where lead_id = ${LEAD}`;
    yield* sql`delete from leads where id = ${LEAD}`;
    yield* sql`
      insert into leads (id, dataset_id, email, first_name, last_name, attributes, engagement_state)
      values (${LEAD}, ${SEED_DATASET_ID}, 'it-lead@example.com', 'IT', 'Lead', '{}', 'NEW')
    `;
  });

const forceDue = (stepCode: string) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    yield* sql`
      update scheduled_actions set execute_at = now() - interval '1 second'
      where lead_id = ${LEAD}
        and step_id in (select id from sequence_steps where step_code = ${stepCode})
        and action_status = 'SCHEDULED'
    `;
  });

const simulateOpened = () =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    yield* sql`update leads set engagement_state = 'OPENED', updated_at = now() where id = ${LEAD}`;
    yield* sql`
      update scheduled_actions set action_status = 'CANCELLED', cancelled_at = now(), updated_at = now()
      where lead_id = ${LEAD} and action_status in ('SCHEDULED', 'QUEUED')
    `;
  });

const getActions = () =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    return yield* sql<{ step_code: string; action_status: string; execute_at: Date }>`
      select st.step_code, sa.action_status, sa.execute_at
      from scheduled_actions sa
      join sequence_steps st on st.id = sa.step_id
      where sa.lead_id = ${LEAD}
      order by st.step_order
    `;
  });

type ActionRow = { step_code: string; action_status: string; execute_at: Date };
const stateOf = (rows: readonly ActionRow[]) =>
  Object.fromEntries(rows.map((r) => [r.step_code, r.action_status]));

const requireAction = (rows: readonly ActionRow[], stepCode: string): ActionRow => {
  const row = rows.find((r) => r.step_code === stepCode);
  if (!row) throw new Error(`missing scheduled action for ${stepCode}`);
  return row;
};

describe("scheduler tick (cron-based advancement)", () => {
  testIf("enroll -> NO_1 sent, NO_2 scheduled at now + 2 days", async () => {
    await run(seedProgram);
    await run(resetLead());
    await run(
      createFirstStep({
        leadId: LEAD,
        datasetId: SEED_DATASET_ID,
        campaignId: SEED_CAMPAIGN_ID,
        sequenceType: "NOT_OPENED",
      }),
    );

    const queue = new LocalQueue();
    const processed = await run(runTick(queue));

    expect(processed).toBe(1);
    const sent = queue.drain();
    expect(sent).toHaveLength(1);
    expect(sent[0]?.tags?.stepId).toBe(STEP_NO_1);

    const rows = await run(getActions());
    const state = stateOf(rows);
    expect(state.NO_1).toBe("QUEUED");
    expect(state.NO_2).toBe("SCHEDULED");
    const no2 = requireAction(rows, "NO_2");
    const daysUntil = (no2.execute_at.getTime() - Date.now()) / 86_400_000;
    expect(daysUntil).toBeGreaterThan(1.9);
    expect(daysUntil).toBeLessThan(2.2);
  });

  testIf("when NO_2's 2 days expire it is sent and NO_3 is scheduled", async () => {
    await run(forceDue("NO_2"));

    const queue = new LocalQueue();
    await run(runTick(queue));

    const sent = queue.drain();
    expect(sent).toHaveLength(1);
    expect(sent[0]?.tags?.stepId).toBe(STEP_NO_2);

    const state = stateOf(await run(getActions()));
    expect(state.NO_2).toBe("QUEUED");
    expect(state.NO_3).toBe("SCHEDULED");
  });

  testIf("an OPENED interrupt cancels remaining steps so they never send", async () => {
    await run(simulateOpened());

    const queue = new LocalQueue();
    await run(runTick(queue));

    expect(queue.drain()).toHaveLength(0);
    const state = stateOf(await run(getActions()));
    expect(state.NO_3).toBe("CANCELLED");
  });
});