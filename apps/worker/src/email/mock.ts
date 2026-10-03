import type { EmailSender, ProviderSendResult, SendPayload } from "@email/shared";

export class MockSender implements EmailSender {
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