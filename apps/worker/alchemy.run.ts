import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import * as Effect from "effect/Effect";
import * as Redacted from "effect/Redacted";

const DLQ = Cloudflare.Queues.Queue("EmailSendDlq");
const QUEUE = Cloudflare.Queues.Queue("EmailSendQueue");

const WORKER = Cloudflare.Worker("Worker", {
  main: "./src/index.ts",
  compatibility: { date: "2026-09-30" },
  observability: { enabled: true },
  env: {
    EMAIL_PROVIDER: process.env.EMAIL_PROVIDER ?? "mock",
    RESEND_API_KEY: Redacted.make(process.env.RESEND_API_KEY ?? ""),
    BREVO_API_KEY: Redacted.make(process.env.BREVO_API_KEY ?? ""),
  },
});

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
      cloudflareAccountId: queue.accountId,
      cloudflareQueueId: queue.queueId,
    };
  }),
);