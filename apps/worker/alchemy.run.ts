/**
 * Alchemy stack for the email Worker.
 *
 * Alchemy manages the Cloudflare resources (Worker, Queue, DLQ, Queue
 * Consumer) declaratively from this file, replacing a hand-maintained
 * wrangler.jsonc.
 *
 *   bun run plan     # preview changes
 *   bun run deploy   # apply
 *   bun run dev      # local emulation of queue + consumer
 *   bun run destroy  # tear down
 *
 * Scope note (spec §11): this Worker only executes sends. It owns no database
 * and makes no business-state decisions — it claims a job from the orchestrator
 * (which performs the pre-send re-check) and calls Brevo.
 */
import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import * as Effect from "effect/Effect";
import * as Redacted from "effect/Redacted";

// Declared at module scope so the Worker resource can be referenced by the
// stack and by `InferEnv` in the entrypoint. Logical IDs are stable across
// deploys, which is how Alchemy tracks these in state.
const DLQ = Cloudflare.Queues.Queue("EmailSendDlq");
const QUEUE = Cloudflare.Queues.Queue("EmailSendQueue");

const WORKER = Cloudflare.Worker("Worker", {
  main: "./src/index.ts",
  // A date before 2026-08-04 makes Alchemy apply nodejs_compat automatically.
  compatibility: { date: "2026-09-30" },
  observability: { enabled: true },
  env: {
    // Producer binding. The orchestrator normally publishes over the HTTP API,
    // but this binding keeps `alchemy dev` working end to end locally.
    EMAIL_SEND_QUEUE: QUEUE,
    ORCHESTRATOR_BASE_URL: Redacted.make("http://localhost:3000"),
    INTERNAL_API_SECRET: Redacted.make(""),
    BREVO_API_KEY: Redacted.make(""),
  },
});

/** Inferred Worker environment type. Import this in the entrypoint. */
export type Env = Cloudflare.InferEnv<typeof WORKER>;

export default Alchemy.Stack(
  "EmailWorker",
  {
    providers: Cloudflare.providers(),
    state: Cloudflare.state(),
  },
  Effect.gen(function* () {
    const dlq = yield* DLQ;
    const queue = yield* QUEUE;
    const worker = yield* WORKER;

    // Cloudflare allows at most one Worker consumer per queue.
    yield* Cloudflare.Queues.Consumer("EmailSendConsumer", {
      queueId: queue.queueId,
      scriptName: worker.workerName,
      deadLetterQueue: dlq.queueName,
      settings: {
        batchSize: 10,
        maxConcurrency: 3,
        maxRetries: 3,
        retryDelay: 60,
      },
    });

    return {
      workerName: worker.workerName,
      queueName: queue.queueName,
      dlqName: dlq.queueName,
      // The orchestrator publishes over the Cloudflare HTTP API, so it needs
      // these values as env vars — see .env.example.
      cloudflareAccountId: queue.accountId,
      cloudflareQueueId: queue.queueId,
    };
  }),
);