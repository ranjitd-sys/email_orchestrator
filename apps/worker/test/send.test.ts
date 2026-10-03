import { describe, expect, test } from "bun:test";
import type { SendPayload } from "@email/shared";
import {
  BrevoHttpAdapter,
  BrevoPermanentError,
  BrevoTransientError,
  MockBrevoAdapter,
} from "../src/brevo";
import { sendJob } from "../src/execute";

const payload: SendPayload = {
  actionId: "act_1",
  sendAttemptId: "attempt_1",
  to: "lead@example.com",
  from: "sender@example.com",
  subject: "Hello",
  text: "Hi",
};

describe("sendJob", () => {
  test("successful send returns sent and calls Brevo once", async () => {
    const sender = new MockBrevoAdapter();
    const outcome = await sendJob(payload, sender);
    expect(outcome).toBe("sent");
    expect(sender.sent).toHaveLength(1);
    expect(sender.sent[0]).toEqual(payload);
  });

  test("transient failure returns retry", async () => {
    const sender = new MockBrevoAdapter(() => new BrevoTransientError("503 from Brevo"));
    const originalError = console.error;
    console.error = () => {};
    try {
      const outcome = await sendJob(payload, sender);
      expect(outcome).toBe("retry");
    } finally {
      console.error = originalError;
    }
  });

  test("permanent failure returns failed", async () => {
    const sender = new MockBrevoAdapter(() => new BrevoPermanentError("400 invalid recipient"));
    const originalError = console.error;
    console.error = () => {};
    try {
      const outcome = await sendJob(payload, sender);
      expect(outcome).toBe("failed");
    } finally {
      console.error = originalError;
    }
  });

  test("unknown failure is treated as transient", async () => {
    const sender = new MockBrevoAdapter(() => new Error("boom"));
    const originalError = console.error;
    console.error = () => {};
    try {
      const outcome = await sendJob(payload, sender);
      expect(outcome).toBe("retry");
    } finally {
      console.error = originalError;
    }
  });
});

describe("BrevoHttpAdapter", () => {
  test("maps provider success into a message id", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (_url: string | URL, init?: RequestInit) => {
      expect(init?.method).toBe("POST");
      expect((init?.headers as Record<string, string>)?.["api-key"]).toBe("key-123");
      return new Response(JSON.stringify({ messageId: "brevo-9" }), { status: 201 });
    }) as typeof fetch;

    try {
      const adapter = new BrevoHttpAdapter("key-123");
      const result = await adapter.sendEmail(payload);
      expect(result.providerMessageId).toBe("brevo-9");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("5xx and 429 throw transient, 4xx throws permanent", async () => {
    const originalFetch = globalThis.fetch;
    for (const status of [500, 429, 400]) {
      globalThis.fetch = (async () => new Response("err", { status })) as typeof fetch;
      const adapter = new BrevoHttpAdapter("k");
      try {
        await adapter.sendEmail(payload);
        throw new Error("should have thrown");
      } catch (error) {
        const isTransient = error instanceof BrevoTransientError;
        expect(isTransient).toBe(status >= 500 || status === 429);
      }
    }
    globalThis.fetch = originalFetch;
  });
});