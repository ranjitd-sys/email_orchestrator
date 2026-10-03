import type { EmailSender, SendPayload } from "@email/shared";
import { PermanentSendError } from "./email/errors.ts";

export type SendOutcome = "sent" | "retry" | "failed";

export async function sendJob(payload: SendPayload, sender: EmailSender): Promise<SendOutcome> {
  try {
    await sender.sendEmail(payload);
    return "sent";
  } catch (error) {
    if (error instanceof PermanentSendError) {
      console.error("permanent send failure", {
        actionId: payload.actionId,
        sendAttemptId: payload.sendAttemptId,
        error,
      });
      return "failed";
    }
    console.error("transient send failure", {
      actionId: payload.actionId,
      error,
    });
    return "retry";
  }
}