import * as Redacted from "effect/Redacted";
import * as Effect from "effect/Effect";
import * as SqlClient from "effect/sql/SqlClient";
import * as PgClient from "@effect/sql-pg/PgClient";
import { renderTemplate, stepEmailTemplate } from "./email-templates.ts";

const D = "10000000-0000-0000-0000-000000000001";
const C = "20000000-0000-0000-0000-000000000001";
const DOM = "30000000-0000-0000-0000-000000000001";
const MB = "40000000-0000-0000-0000-000000000001";
const LEAD = "80000000-0000-0000-0000-000000000001";

export const SEED_DATASET_ID = D;
export const SEED_CAMPAIGN_ID = C;

const SEQ: Record<string, string> = {
  NOT_OPENED: "50000000-0000-0000-0000-000000000001",
  OPENED: "50000000-0000-0000-0000-000000000002",
  CLICKED: "50000000-0000-0000-0000-000000000003",
};

// Step ids are derived from array position, so append new codes at the end to
// keep the existing ids stable. NOT_OPENED is a 5-step sequence (order 4 and 5
// live at the bottom of this list).
const steps = [
  { code: "NO_1", seq: "NOT_OPENED", order: 1, delay: 0 },
  { code: "NO_2", seq: "NOT_OPENED", order: 2, delay: 2 },
  { code: "NO_3", seq: "NOT_OPENED", order: 3, delay: 2 },
  { code: "O_1", seq: "OPENED", order: 1, delay: 0 },
  { code: "O_2", seq: "OPENED", order: 2, delay: 2 },
  { code: "O_3", seq: "OPENED", order: 3, delay: 3 },
  { code: "C_1", seq: "CLICKED", order: 1, delay: 0 },
  { code: "C_2", seq: "CLICKED", order: 2, delay: 2 },
  { code: "C_3", seq: "CLICKED", order: 3, delay: 3 },
  { code: "NO_4", seq: "NOT_OPENED", order: 4, delay: 3 },
  { code: "NO_5", seq: "NOT_OPENED", order: 5, delay: 3 },
] as const;

function stepId(code: string): string {
  const n = steps.findIndex((s) => s.code === code) + 1;
  return `70000000-0000-0000-0000-0000000000${String(n).padStart(2, "0")}`;
}

function templateId(code: string): string {
  const n = steps.findIndex((s) => s.code === code) + 1;
  return `60000000-0000-0000-0000-0000000000${String(n).padStart(2, "0")}`;
}

export const seedProgram = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  yield* sql`
    insert into datasets (id, name, external_key) values (${D}, 'Demo dataset', 'demo')
    on conflict do nothing
  `;
  yield* sql`
    insert into campaigns (id, dataset_id, name, status, config)
    values (${C}, ${D}, 'Demo campaign', 'ACTIVE', '{}')
    on conflict do nothing
  `;
  yield* sql`
    insert into domains (id, dataset_id, domain, status, daily_limit)
    values (${DOM}, ${D}, 'email.deepecom.shop', 'ACTIVE', 100)
    on conflict (id) do update set domain = excluded.domain
  `;
  yield* sql`
    insert into mailboxes (id, domain_id, email, display_name, status, daily_limit)
    values (${MB}, ${DOM}, 'hello@email.deepecom.shop', 'DeepEcom', 'ACTIVE', 100)
    on conflict (id) do update set email = excluded.email, display_name = excluded.display_name
  `;

  for (const s of steps) {
    const template = stepEmailTemplate(s.code);
    const rendered = template ? renderTemplate(template) : null;
    yield* sql`
      insert into templates (id, campaign_id, name, subject, html, text)
      values (${templateId(s.code)}, ${C}, ${template?.name ?? s.code},
              ${template?.subject ?? `${s.code} subject`},
              ${rendered?.html ?? `<p>${s.code} html</p>`},
              ${rendered?.text ?? `${s.code} text`})
      on conflict (id) do update set
        name = excluded.name,
        subject = excluded.subject,
        html = excluded.html,
        text = excluded.text
    `;
  }

  for (const [type, id] of Object.entries(SEQ)) {
    yield* sql`
      insert into sequences (id, campaign_id, sequence_type)
      values (${id}, ${C}, ${type})
      on conflict do nothing
    `;
  }

  for (const s of steps) {
    yield* sql`
      insert into sequence_steps (id, sequence_id, step_code, step_order, delay_days, template_id)
      values (${stepId(s.code)}, ${SEQ[s.seq]}, ${s.code}, ${s.order}, ${s.delay}, ${templateId(s.code)})
      on conflict (id) do update set
        step_order = excluded.step_order,
        delay_days = excluded.delay_days,
        template_id = excluded.template_id
    `;
  }

  yield* sql`
    insert into leads (id, dataset_id, email, first_name, last_name, attributes, engagement_state)
    values (${LEAD}, ${D}, 'lead@example.com', 'Demo', 'Lead', '{}', 'NEW')
    on conflict do nothing
  `;

  console.log("seed complete");
});

if (import.meta.main) {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  Effect.runPromise(Effect.scoped(seedProgram.pipe(Effect.provide(PgClient.layer({ url: Redacted.make(url) })))))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
