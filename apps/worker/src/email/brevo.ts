import type { EmailSender, ProviderSendResult, SendPayload } from "@email/shared";
import { TransientSendError, classifyStatus } from "./errors.ts";

export class BrevoSender implements EmailSender {
  constructor(
    private readonly apiKey: string,
    private readonly baseUrl = "https://api.brevo.com/v3",
  ) {}

  async sendEmail(payload: SendPayload): Promise<ProviderSendResult> {
    const body = {
      sender: {
        email: payload.from,
        ...(payload.fromName ? { name: payload.fromName } : {}),
      },
      to: [{ email: payload.to }],
      subject: payload.subject,
      ...(payload.html ? { htmlContent: payload.html } : {}),
      ...(payload.text ? { textContent: payload.text } : {}),
      ...(payload.tags ? { tags: mapTags(payload.tags) } : {}),
      ...(payload.headers ? { headers: payload.headers } : {}),
    };

    const response = await fetch(`${this.baseUrl}/smtp/email`, {
      method: "POST",
      headers: {
        "api-key": this.apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw classifyStatus("Brevo", response.status, detail);
    }

    const data = (await response.json().catch(() => ({}))) as { messageId?: string };
    if (!data.messageId) {
      throw new TransientSendError("Brevo accepted the send but returned no messageId");
    }
    return { providerMessageId: data.messageId };
  }
}

function mapTags(tags: Record<string, string>): string[] {
  return Object.entries(tags).map(([name, value]) => sanitize(`${name}_${value}`));
}

function sanitize(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_");
}