import { describe, expect, test } from "bun:test";
import {
  ACTION_STATUSES,
  ENGAGEMENT_STATES,
  SEQUENCE_TYPES,
  type SendPayload,
} from "@email/shared";

describe("workspace scaffold", () => {
  test("shared and db packages resolve", async () => {
    const shared = await import("@email/shared");
    const db = await import("@email/db");
    expect(shared).toBeDefined();
    expect(db).toBeDefined();
  });
});

describe("shared contracts", () => {
  test("engagement states match spec section 2", () => {
    expect(ENGAGEMENT_STATES).toEqual([
      "NEW",
      "NOT_OPENED",
      "OPENED",
      "CLICKED",
      "REPLIED",
      "SUPPRESSED",
    ]);
  });

  test("sequence types include REPLIED steps tracked by the machine", () => {
    expect(SEQUENCE_TYPES).toEqual(["NOT_OPENED", "OPENED", "CLICKED", "REPLIED"]);
  });

  test("action statuses match spec section 6 lifecycle", () => {
    expect(ACTION_STATUSES).toContain("SCHEDULED");
    expect(ACTION_STATUSES).toContain("CANCELLED");
    expect(ACTION_STATUSES).toHaveLength(8);
  });

  test("queue message carries everything needed to send", () => {
    const payload: SendPayload = {
      actionId: "act_1",
      sendAttemptId: "attempt_1",
      to: "lead@example.com",
      from: "sender@example.com",
      subject: "Hello",
      html: "<p>Hi</p>",
    };
    expect(payload.to).toBe("lead@example.com");
    expect(payload.subject).toBe("Hello");
  });
});