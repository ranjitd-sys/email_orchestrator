import * as Effect from "effect/Effect";
import * as PgClient from "@effect/sql-pg/PgClient";
import * as Redacted from "effect/Redacted";
import * as SqlClient from "effect/sql/SqlClient";
import { createFirstStep } from "./queries.ts";

export interface ContactRow {
  id: string | number;
  seller_id: string | number | null;
  value: string | null;
  normalized_value: string | null;
  dedup_key: string | null;
  source: string | null;
  created_at: Date | string;
}

function extractEmail(row: ContactRow): string | null {
  const cands = [row.normalized_value, row.value];
  for (const c of cands) {
    if (c == null) continue;
    const s = String(c).trim();
    if (s === "") continue;
    if (s.includes("@")) return s.toLowerCase();
  }
  return null;
}

const REQUIRED_COLUMNS = ["id", "type", "value", "created_at"] as const;

export const isSuppressed = (email: string) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    const suppressedAt = yield* sql<{ suppressed_at: Date | null }>`
      select suppressed_at from leads
      where dataset_id is not null and lower(email) = lower(${email})
      limit 1
    `;
    if (suppressedAt.length > 0 && suppressedAt[0] != null && suppressedAt[0].suppressed_at != null) {
      return true;
    }
    const sup = yield* sql<{ id: string }>`
      select id from suppression_list
      where lower(email) = lower(${email})
      limit 1
    `;
    return sup.length > 0;
  });

export const fetchContacts = (sourceUrl: string, since: Date) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    const cols = yield* sql<{ column_name: string }>`
      select column_name
      from information_schema.columns
      where table_name = 'contacts'
    `;
    const names = new Set(cols.map((c) => c.column_name));
    for (const rc of REQUIRED_COLUMNS) {
      if (!names.has(rc)) {
        throw new Error(
          `contacts table missing expected column '${rc}'. Found: ${Array.from(names).sort().join(", ")}`,
        );
      }
    }
    const rows = yield* sql<ContactRow>`
      select id, seller_id, value, normalized_value, dedup_key, source, created_at
      from contacts
      where upper(type) = 'EMAIL'
        and created_at >= ${since}
        and coalesce(nullif(trim(normalized_value), ''), nullif(trim(value), '')) ~ '@'
      order by created_at, id
      limit 500
    `;
    return rows as ReadonlyArray<ContactRow>;
  }).pipe(
    Effect.scoped,
    Effect.provide(PgClient.layer({ url: Redacted.make(sourceUrl) })),
  );

export interface IngestResult {
  newLeads: number;
  skippedSuppressed: number;
  scheduled: number;
}

export const ingestContacts = (contacts: ReadonlyArray<ContactRow>) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    const ds = yield* sql<{ id: string }>`
      select id from datasets order by created_at limit 1
    `;
    const camp = yield* sql<{ id: string }>`
      select id from campaigns order by created_at limit 1
    `;
    const mb = yield* sql<{ id: string; domain_id: string | null }>`
      select id, domain_id from mailboxes order by created_at limit 1
    `;
    const datasetId = ds[0]?.id;
    const campaignId = camp[0]?.id;
    const mailboxId = mb[0]?.id;
    const domainId = mb[0]?.domain_id ?? null;
    if (!datasetId || !campaignId) {
      throw new Error("Missing dataset or campaign");
    }
    let newLeads = 0;
    let skippedSuppressed = 0;
    let scheduled = 0;
    for (const r of contacts) {
      const email = extractEmail(r);
      if (!email) continue;
      const sup = yield* isSuppressed(email);
      if (sup) {
        skippedSuppressed++;
        continue;
      }
      const attrsJson = JSON.stringify({
        source: r.source ?? 'contacts',
        source_contact_id: String(r.id),
        seller_id: r.seller_id == null ? null : String(r.seller_id),
        dedup_key: r.dedup_key,
        source_type: 'email',
      });
      const contactId = String(r.id);
      const lead = yield* sql<{
        id: string;
        inserted: boolean;
      }>`
        insert into leads (dataset_id, email, first_name, last_name, attributes, engagement_state)
        values (
          ${datasetId},
          ${email},
          null,
          null,
          ${attrsJson}::jsonb,
          'NEW'
        )
        on conflict (dataset_id, lower(email)) do update
          set attributes = leads.attributes || jsonb_build_object('source_contact_id_last', ${contactId}::text),
              updated_at = now()
        returning id, (xmax = 0) as inserted
      `;
      const lrow = lead[0];
      if (!lrow) continue;
      const leadId = lrow.id;
      const inserted = Boolean(lrow.inserted);
      if (inserted) newLeads++;
      const fs = yield* createFirstStep({
        leadId,
        datasetId,
        campaignId,
        sequenceType: "NOT_OPENED",
        domainId,
        mailboxId,
      });
      if (fs?.actionId) scheduled++;
    }
    return { newLeads, skippedSuppressed, scheduled };
  });

if (import.meta.main) {
  const EMAIL_DATABASE_URL = process.env.EMAIL_DATABASE_URL;
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!EMAIL_DATABASE_URL) {
    console.error("EMAIL_DATABASE_URL is not set");
    process.exit(1);
  }
  if (!DATABASE_URL) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  Effect.runPromise(
    Effect.gen(function* () {
      const contacts = yield* fetchContacts(EMAIL_DATABASE_URL, since);
      const result = yield* ingestContacts(contacts);
      console.log(
        `ingested: new=${result.newLeads} skippedSuppressed=${result.skippedSuppressed} scheduled=${result.scheduled} (fetched=${contacts.length})`,
      );
    }).pipe(
      Effect.scoped,
      Effect.provide(PgClient.layer({ url: Redacted.make(DATABASE_URL) })),
    ),
  ).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
