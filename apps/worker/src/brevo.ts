import type { EmailSender, ProviderSendResult, SendPayload } from "@email/shared";

export class BrevoTransientError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "BrevoTransientError";
  }
}

export class BrevoPermanentError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "BrevoPermanentError";
  }
}

export class BrevoHttpAdapter implements EmailSender {
  constructor(private readonly apiKey: string) {}

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
      ...(payload.tags && payload.tags.length ? { tags: payload.tags } : {}),
      ...(payload.headers ? { headers: payload.headers } : {}),
    };

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
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
      const msg = `Brevo send failed (${response.status}): ${detail}`;
      if (response.status >= 500 || response.status === 429) {
        throw new BrevoTransientError(msg);
      }
      throw new BrevoPermanentError(msg);
    }

    const data = (await response.json().catch(() => ({}))) as { messageId?: string };
    if (!data.messageId) {
      throw new BrevoTransientError("Brevo accepted the send but returned no messageId");
    }
    return { providerMessageId: data.messageId };
  }
}

export class MockBrevoAdapter implements EmailSender {
  readonly sent: SendPayload[] = [];

  constructor(
    private readonly failWith?: () => Error,
  ) {}

  async sendEmail(payload: SendPayload): Promise<ProviderSendResult> {
    if (this.failWith) {
      throw this.failWith();
    }
    this.sent.push(payload);
    return { providerMessageId: `mock-${payload.sendAttemptId}` };
  }
}

export function createEmailSender(env: {
  BREVO_API_KEY: string;
  BREVO_MOCK: string;
}): EmailSender {
  if (env.BREVO_MOCK === "true") {
    return new MockBrevoAdapter();
  }
  return new BrevoHttpAdapter(env.BREVO_API_KEY);
}