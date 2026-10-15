import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Scope from "effect/Scope";
import { dbLayer } from "@email/db";
import { SqlClient } from "effect/sql/SqlClient";

const PORT = Number(process.env.PORT ?? 3000);
const databaseUrl = process.env.DATABASE_URL;

async function main() {
  let sql: SqlClient | null = null;
  if (databaseUrl) {
    const scope = await Effect.runPromise(Scope.make());
    const context = await Effect.runPromise(
      Layer.build(dbLayer(databaseUrl)).pipe(Effect.provideService(Scope.Scope, scope)),
    );
    sql = Context.get(context, SqlClient);
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
      const webhookPrefix = "/webhooks/brevo/";
      if (req.method === "POST" && url.pathname.startsWith(webhookPrefix)) {
        const secret = url.pathname.slice(webhookPrefix.length);
        const expected = process.env.BREVO_WEBHOOK_SECRET;
        if (!expected || secret !== expected) {
          return new Response("not found", { status: 404 });
        }
        let body: unknown;
        try {
          body = await req.json();
        } catch {
          return Response.json({ ok: false, error: "invalid json" }, { status: 400 });
        }
        const events = Array.isArray(body) ? body : [body];
        for (const event of events) {
          const record = event as Record<string, unknown>;
          console.log("[brevo-webhook] received", {
            event: record.event,
            email: record.email,
            messageId: record["message-id"],
            tags: record.tags ?? record.tag,
          });
        }
        return Response.json({ ok: true, received: events.length });
      }
      return new Response("email-orchestrator", { status: 200 });
    },
  });

  console.log(`orchestrator listening on ${server.url}`);
}

void main();