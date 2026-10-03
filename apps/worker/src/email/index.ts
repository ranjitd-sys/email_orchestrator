import type { EmailSender } from "@email/shared";
import { BrevoSender } from "./brevo.ts";
import { MockSender } from "./mock.ts";
import { ResendSender } from "./resend.ts";

export const EMAIL_PROVIDERS = ["resend", "brevo", "mock"] as const;
export type EmailProvider = (typeof EMAIL_PROVIDERS)[number];

export interface EmailSenderEnv {
  EMAIL_PROVIDER: EmailProvider;
  RESEND_API_KEY: string;
  BREVO_API_KEY: string;
}

export function createEmailSender(env: EmailSenderEnv): EmailSender {
  switch (env.EMAIL_PROVIDER) {
    case "resend":
      return new ResendSender(env.RESEND_API_KEY);
    case "brevo":
      return new BrevoSender(env.BREVO_API_KEY);
    case "mock":
      return new MockSender();
  }
}

export { BrevoSender } from "./brevo.ts";
export { MockSender } from "./mock.ts";
export { ResendSender } from "./resend.ts";
export {
  PermanentSendError,
  SendError,
  TransientSendError,
  classifyStatus,
} from "./errors.ts";