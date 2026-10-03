import type { SendJobMessage } from "@email/shared";
import type { Env } from "../alchemy.run.ts";

/**
 * Email Worker — stateless queue consumer.
 *
 * Scope (spec §11): this Worker executes sends and transient retries only. It
 * must not choose a business sequence and must not talk to the database. The
 * orchestrator owns state; the pre-send re-check (spec §6) happens inside the
 * `claim` call below.
 */
export default {
  async fetch(_request: Request, env: Env): Promise<Response> {
    return Response.json({
      service: "email-worker",
      orchestrator: env.ORCHESTRATOR_BASE_URL,
    });
  },

  /**
   * Consumes send jobs from the Cloudflare Queue.
   *
   * Queue delivery is at-least-once, so every message must be handled
   * idempotently — the orchestrator's `claim` endpoint is the guard.
   */
  async queue(batch: MessageBatch<SendJobMessage>, env: Env): Promise<void> {
    for (const message of batch.messages) {
      try {
        // Phase 6: call the orchestrator's claim endpoint (which performs the
        // spec §6 re-check), send via Brevo, then report the result.
        await handleJob(message.body.actionId, env);
        message.ack();
      } catch (error) {
        console.error("send failed", message.body.actionId, error);
        message.retry();
      }
    }
  },
};

async function handleJob(_actionId: string, _env: Env): Promise<void> {
  throw new Error("not implemented — Phase 6");
}