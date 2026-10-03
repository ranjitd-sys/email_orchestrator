import type { EmailSender, ProviderSendResult, SendPayload } from "@email/shared";
import { TransientSendError, classifyStatus } from "./errors.ts";

export class ResendSender implements EmailSender {
  constructor(
    private readonly apiKey: string,
    private readonly baseUrl = "https://api.resend.com",
  ) {}

  async sendEmail(payload: SendPayload): Promise<ProviderSendResult> {
    const body = {
      from: payload.fromName ? `${payload.fromName} <${payload.from}>` : payload.from,
      to: [payload.to],
      subject: payload.subject,
      ...(payload.html ? { html: payload.html } : {}),
      ...(payload.text ? { text: payload.text } : {}),
      ...(payload.headers ? { headers: payload.headers } : {}),
      ...(payload.tags
        ? {
            tags: Object.entries(payload.tags).map(([name, value]) => ({ name, value })),
          }
        : {}),
    };

    const response = await fetch(`${this.baseUrl}/emails`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": payload.sendAttemptId,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw classifyStatus("Resend", response.status, detail);
    }

    const data = (await response.json().catch(() => ({}))) as { id?: string };
    if (!data.id) {
      throw new TransientSendError("Resend accepted the send but returned no id");
    }
    return { providerMessageId: data.id };
  }
}