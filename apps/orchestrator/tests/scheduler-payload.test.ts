import { describe, expect, test } from "bun:test";
import type { DueActionRow } from "@email/db";
import { buildSendPayload } from "../src/scheduler/payload.ts";

const row: DueActionRow = {
  action_id: "a1",
  dataset_id: "d1",
  lead_id: "l1",
  campaign_id: "c1",
  sequence_id: "s1",
  sequence_type: "NOT_OPENED",
  step_id: "st1",
  step_code: "NO_1",
  template_id: "t1",
  domain_id: "dm1",
  mailbox_id: "mb1",
  engagement_state: "NOT_OPENED",
  to_email: "lead@example.com",
  from_email: "sender@example.com",
  from_name: "Demo Sender",
  subject: "Nudge 1",
  html: "<p>hi</p>",
  text: "hi",
};

describe("buildSendPayload", () => {
  test("maps every field and the correlation tags", () => {
    const payload = buildSendPayload(row, "attempt_1");
    expect(payload).toMatchObject({
      actionId: "a1",
      sendAttemptId: "attempt_1",
      to: "lead@example.com",
      from: "sender@example.com",
      fromName: "Demo Sender",
      subject: "Nudge 1",
      html: "<p>hi</p>",
      text: "hi",
    });
    expect(payload.tags).toEqual({
      actionId: "a1",
      sendAttemptId: "attempt_1",
      leadId: "l1",
      datasetId: "d1",
      campaignId: "c1",
      sequenceId: "s1",
      stepId: "st1",
    });
  });

  test("tolerates null template/mailbox fields", () => {
    const payload = buildSendPayload({ ...row, from_email: null, html: null, text: null }, "attempt_2");
    expect(payload.from).toBe("");
    expect(payload.html).toBeUndefined();
    expect(payload.text).toBeUndefined();
  });
});