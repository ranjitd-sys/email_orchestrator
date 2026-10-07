import * as PgClient from "@effect/sql-pg/PgClient";
import * as Redacted from "effect/Redacted";

export function dbLayer(url: string) {
  return PgClient.layer({ url: Redacted.make(url) });
}

export { runMigrations } from "./migrate.ts";
export * from "./queries.ts";
export * from "./seed.ts";
export * from "./email-templates.ts";