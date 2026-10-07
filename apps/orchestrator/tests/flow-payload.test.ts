import { describe, expect, test } from "bun:test";
import type { DueActionRow } from "@email/db";
import { buildSendPayload, mergeFields } from "../src/domain/payload.ts";

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

  test("merges first_name and links into subject, html and text", () => {
    const merged = buildSendPayload(
      {
        ...row,
        first_name: "Ranjit",
        subject: "Hi {{first_name}}",
        html: '<p>Hi {{first_name}}, see <a href="{{demo_link}}">this</a></p>',
        text: "Hi {{first_name}}\nUnsubscribe: {{unsubscribe_url}}",
      },
      "attempt_3",
    );
    expect(merged.subject).toBe("Hi Ranjit");
    expect(merged.html).toContain("Hi Ranjit,");
    expect(merged.html).toContain("https://deepecom.example.com/demo");
    expect(merged.text).toContain("Hi Ranjit");
    expect(merged.text).toContain("https://deepecom.example.com/unsubscribe");
  });

  test("greets with a fallback when first_name is missing", () => {
    const merged = buildSendPayload({ ...row, first_name: null, subject: "Hi {{first_name}}" }, "attempt_4");
    expect(merged.subject).toBe("Hi there");
  });

  test("mergeFields leaves unknown placeholders empty", () => {
    expect(mergeFields("a {{unknown}} b", {})).toBe("a  b");
    expect(mergeFields(null, {})).toBe("");
  });
});