import type { SendPayload } from "@email/shared";
import { createEmailSender } from "./email/index.ts";
import { sendJob } from "./execute.ts";
import type { Env } from "../alchemy.run.ts";

export default {
  async fetch(): Promise<Response> {
    return Response.json({ service: "email-worker" });
  },

  async queue(batch: MessageBatch<SendPayload>, env: Env): Promise<void> {
    const sender = createEmailSender(env);

    for (const message of batch.messages) {
      const outcome = await sendJob(message.body, sender);
      if (outcome === "retry") {
        message.retry();
      } else {
        message.ack();
      }
    }
  },
};