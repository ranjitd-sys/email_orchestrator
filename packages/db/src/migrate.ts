import * as Redacted from "effect/Redacted";
import * as Effect from "effect/Effect";
import * as Migrator from "effect/sql/Migrator";
import * as PgClient from "@effect/sql-pg/PgClient";
import init from "../migrations/0001_init.ts";

const loader = Migrator.fromRecord({ "1_init": init });

export function runMigrations(url: string) {
  return Effect.scoped(
    Migrator.make({})({ loader }).pipe(
      Effect.provide(PgClient.layer({ url: Redacted.make(url) })),
    ),
  );
}

if (import.meta.main) {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }
  Effect.runPromise(runMigrations(url))
    .then((migrations) => {
      console.log(
        migrations.length > 0
          ? `applied: ${migrations.map(([id, name]) => `${id}_${name}`).join(", ")}`
          : "no pending migrations",
      );
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}