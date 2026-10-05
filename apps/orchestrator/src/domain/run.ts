import * as Redacted from "effect/Redacted";
import * as Effect from "effect/Effect";
import * as PgClient from "@effect/sql-pg/PgClient";
import { createPublisher } from "../queue/publisher.ts";
import { runTick } from "./tick.ts";

const url = process.env.DATABASE_URL;

if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const program = runTick(createPublisher(process.env).publisher);

Effect.runPromise(
  Effect.scoped(program.pipe(Effect.provide(PgClient.layer({ url: Redacted.make(url) })))),
)
  .then((count) => {
    console.log(`scheduler: processed ${count} due action(s)`);
  })
  .catch((error) => {
    console.error("scheduler tick failed", error);
    process.exit(1);
  });