import { describe, expect, test } from "bun:test";
import {
  ACTION_STATUSES,
  ENGAGEMENT_STATES,
  SEQUENCE_TYPES,
  type SendJobMessage,
  type SendResult,
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

  test("sequence types are the outbound ones only", () => {
    // REPLIED and SUPPRESSED have no outbound steps (spec section 7).
    expect(SEQUENCE_TYPES).toEqual(["NOT_OPENED", "OPENED", "CLICKED"]);
  });

  test("action statuses match spec section 6 lifecycle", () => {
    expect(ACTION_STATUSES).toContain("SCHEDULED");
    expect(ACTION_STATUSES).toContain("CANCELLED");
    expect(ACTION_STATUSES).toHaveLength(8);
  });

  test("queue message carries only the action id", () => {
    const msg: SendJobMessage = { actionId: "act_123" };
    expect(Object.keys(msg)).toEqual(["actionId"]);
  });

  test("send result statuses are the three outcomes", () => {
    const results: SendResult["status"][] = ["SENT", "RETRY_SCHEDULED", "FAILED"];
    expect(results).toHaveLength(3);
  });
});