import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Scope from "effect/Scope";
import { dbLayer } from "@email/db";
import { SqlClient } from "effect/sql/SqlClient";
import { startScheduler } from "./scheduler/index.ts";
import { createPublisher } from "./queue/publisher.ts";

const PORT = Number(process.env.PORT ?? 3000);
const databaseUrl = process.env.DATABASE_URL;
const schedulerIntervalMs = Number(process.env.SCHEDULER_INTERVAL_MS ?? 60_000);

async function main() {
  let sql: SqlClient | null = null;
  if (databaseUrl) {
    const scope = await Effect.runPromise(Scope.make());
    const context = await Effect.runPromise(
      Layer.build(dbLayer(databaseUrl)).pipe(Effect.provideService(Scope.Scope, scope)),
    );
    sql = Context.get(context, SqlClient);

    const { publisher } = createPublisher(process.env);
    startScheduler(publisher, databaseUrl, schedulerIntervalMs);
  }

  const server = Bun.serve({
    port: PORT,
    async fetch(req) {
      const url = new URL(req.url);
      if (url.pathname === "/health") {
        if (sql) {
          try {
            await Effect.runPromise(sql`select 1 as ok`);
            return Response.json({ ok: true, service: "orchestrator", db: true });
          } catch {
            return Response.json(
              { ok: false, service: "orchestrator", db: false },
              { status: 503 },
            );
          }
        }
        return Response.json({ ok: true, service: "orchestrator" });
      }
      return new Response("email-orchestrator", { status: 200 });
    },
  });

  console.log(`orchestrator listening on ${server.url}`);
}

void main();