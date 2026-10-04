import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Scope from "effect/Scope";
import * as SqlClient from "effect/sql/SqlClient";
import { dbLayer } from "@email/db";
import { runTick } from "./tick.ts";
import type { QueuePublisher } from "../queue/publisher.ts";

export function startScheduler(
  publisher: QueuePublisher,
  databaseUrl: string,
  intervalMs = 60_000,
): () => void {
  let sql: SqlClient.SqlClient | null = null;
  let ready = false;

  function tick() {
    if (!ready || !sql) return;
    Effect.runPromise(
      runTick(publisher).pipe(Effect.provideService(SqlClient.SqlClient, sql)),
    ).then(
      (count) => {
        if (count > 0) console.log(`scheduler: processed ${count} due action(s)`);
      },
      (error) => console.error("scheduler tick failed", error),
    );
  }

  void (async () => {
    const scope = await Effect.runPromise(Scope.make());
    const context = await Effect.runPromise(
      Layer.build(dbLayer(databaseUrl)).pipe(Effect.provideService(Scope.Scope, scope)),
    );
    sql = Context.get(context, SqlClient.SqlClient);
    ready = true;
    tick();
  })();

  const interval = setInterval(tick, intervalMs);
  return () => clearInterval(interval);
}