import { afterEach, describe, expect, test } from "bun:test";
import type { SendPayload } from "@email/shared";
import {
  BrevoSender,
  MockSender,
  PermanentSendError,
  ResendSender,
  TransientSendError,
  createEmailSender,
} from "../src/email/index.ts";
import { sendJob } from "../src/execute.ts";

const payload: SendPayload = {
  actionId: "act_1",
  sendAttemptId: "attempt_1",
  to: "lead@example.com",
  from: "sender@example.com",
  fromName: "Acme",
  subject: "Hello",
  html: "<p>Hi</p>",
  tags: { lead_id: "lead_7", dataset_id: "ds_9" },
};

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function stubFetch(response: () => Response): { calls: Array<{ url: string; init: RequestInit }> } {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    return response();
  }) as unknown as typeof fetch;
  return { calls };
}

async function withSilencedErrors<T>(run: () => Promise<T>): Promise<T> {
  const original = console.error;
  console.error = () => {};
  try {
    return await run();
  } finally {
    console.error = original;
  }
}

describe("sendJob", () => {
  test("successful send returns sent and calls the sender once", async () => {
    const sender = new MockSender();
    expect(await sendJob(payload, sender)).toBe("sent");
    expect(sender.sent).toEqual([payload]);
  });

  test("transient failure returns retry", async () => {
    const sender = new MockSender(() => new TransientSendError("503"));
    expect(await withSilencedErrors(() => sendJob(payload, sender))).toBe("retry");
  });

  test("permanent failure returns failed", async () => {
    const sender = new MockSender(() => new PermanentSendError("400 invalid recipient"));
    expect(await withSilencedErrors(() => sendJob(payload, sender))).toBe("failed");
  });

  test("unknown failure is treated as transient", async () => {
    const sender = new MockSender(() => new Error("boom"));
    expect(await withSilencedErrors(() => sendJob(payload, sender))).toBe("retry");
  });
});

describe("ResendSender", () => {
  test("maps the neutral payload onto the Resend API", async () => {
    const { calls } = stubFetch(() => new Response(JSON.stringify({ id: "resend-1" }), { status: 200 }));

    const result = await new ResendSender("re_key").sendEmail(payload);

    expect(result.providerMessageId).toBe("resend-1");
    const call = calls[0]!;
    expect(call.url).toBe("https://api.resend.com/emails");
    expect(call.init.method).toBe("POST");

    const headers = call.init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer re_key");
    expect(headers["Idempotency-Key"]).toBe("attempt_1");

    expect(JSON.parse(call.init.body as string)).toEqual({
      from: "Acme <sender@example.com>",
      to: ["lead@example.com"],
      subject: "Hello",
      html: "<p>Hi</p>",
      tags: [
        { name: "lead_id", value: "lead_7" },
        { name: "dataset_id", value: "ds_9" },
      ],
    });
  });

  test("omits fromName and optional fields when absent", async () => {
    const { calls } = stubFetch(() => new Response(JSON.stringify({ id: "resend-2" }), { status: 200 }));

    await new ResendSender("re_key").sendEmail({
      actionId: "a",
      sendAttemptId: "b",
      to: "lead@example.com",
      from: "sender@example.com",
      subject: "Plain",
    });

    expect(JSON.parse(calls[0]!.init.body as string)).toEqual({
      from: "sender@example.com",
      to: ["lead@example.com"],
      subject: "Plain",
    });
  });

  test("treats 429 and 5xx as transient, other 4xx as permanent", async () => {
    const sender = new ResendSender("re_key");
    for (const [status, expected] of [
      [429, TransientSendError],
      [500, TransientSendError],
      [422, PermanentSendError],
      [401, PermanentSendError],
    ] as const) {
      stubFetch(() => new Response("nope", { status }));
      try {
        await sender.sendEmail(payload);
        throw new Error(`status ${status} should have thrown`);
      } catch (error) {
        expect(error).toBeInstanceOf(expected);
      }
    }
  });

  test("missing id is transient", async () => {
    stubFetch(() => new Response("{}", { status: 200 }));
    await expect(new ResendSender("k").sendEmail(payload)).rejects.toBeInstanceOf(
      TransientSendError,
    );
  });
});

describe("BrevoSender", () => {
  test("maps the neutral payload onto the Brevo API", async () => {
    const { calls } = stubFetch(
      () => new Response(JSON.stringify({ messageId: "brevo-9" }), { status: 201 }),
    );

    const result = await new BrevoSender("key-123").sendEmail(payload);

    expect(result.providerMessageId).toBe("brevo-9");
    const call = calls[0]!;
    expect(call.url).toBe("https://api.brevo.com/v3/smtp/email");
    expect((call.init.headers as Record<string, string>)["api-key"]).toBe("key-123");

    expect(JSON.parse(call.init.body as string)).toEqual({
      sender: { email: "sender@example.com", name: "Acme" },
      to: [{ email: "lead@example.com" }],
      subject: "Hello",
      htmlContent: "<p>Hi</p>",
      tags: ["lead_id_lead_7", "dataset_id_ds_9"],
    });
  });

  test("sanitizes characters Brevo rejects in tags", async () => {
    const { calls } = stubFetch(
      () => new Response(JSON.stringify({ messageId: "brevo-10" }), { status: 201 }),
    );

    await new BrevoSender("k").sendEmail({
      ...payload,
      tags: { campaign: "spring 2026!" },
    });

    expect(JSON.parse(calls[0]!.init.body as string).tags).toEqual(["campaign_spring_2026_"]);
  });

  test("treats 429 and 5xx as transient, other 4xx as permanent", async () => {
    const sender = new BrevoSender("k");
    for (const [status, expected] of [
      [429, TransientSendError],
      [503, TransientSendError],
      [400, PermanentSendError],
    ] as const) {
      stubFetch(() => new Response("nope", { status }));
      try {
        await sender.sendEmail(payload);
        throw new Error(`status ${status} should have thrown`);
      } catch (error) {
        expect(error).toBeInstanceOf(expected);
      }
    }
  });
});

describe("createEmailSender", () => {
  const env = {
    EMAIL_PROVIDER: "mock",
    RESEND_API_KEY: "re",
    BREVO_API_KEY: "sv",
  } as const;

  test("selects the sender named by EMAIL_PROVIDER", () => {
    expect(createEmailSender({ ...env, EMAIL_PROVIDER: "mock" })).toBeInstanceOf(MockSender);
    expect(createEmailSender({ ...env, EMAIL_PROVIDER: "resend" })).toBeInstanceOf(ResendSender);
    expect(createEmailSender({ ...env, EMAIL_PROVIDER: "brevo" })).toBeInstanceOf(BrevoSender);
  });

  test("swapping the provider needs no other change", () => {
    const before = createEmailSender({ ...env, EMAIL_PROVIDER: "resend" });
    const after = createEmailSender({ ...env, EMAIL_PROVIDER: "brevo" });
    expect(before).not.toBeInstanceOf(after.constructor);
  });
});