import { describe, expect, test } from "bun:test";
import type { StepCode } from "@email/shared";
import { transition } from "../src/domain/transition.ts";

const at = (
  engagement: "NOT_OPENED" | "OPENED" | "CLICKED" | "REPLIED",
  step: StepCode,
) => ({ engagement, step });

describe("transition §3 (hierarchical)", () => {
  test("NEW + SEND -> NOT_OPENED.NO_1, start NOT_OPENED sequence", () => {
    const r = transition("NEW", "SEND");
    expect(r.engagement).toBe("NOT_OPENED");
    expect(r.step).toBe("NO_1");
    expect(r.actions).toEqual([{ kind: "CREATE_SEQUENCE", sequenceType: "NOT_OPENED" }]);
  });

  test("NEW + OPENED -> record only", () => {
    const r = transition("NEW", "OPENED");
    expect(r.engagement).toBe("NEW");
    expect(r.step).toBeNull();
    expect(r.actions).toEqual([{ kind: "RECORD_ONLY" }]);
  });

  test("NOT_OPENED + OPENED -> OPENED.O_1, cancel NO_*, start OPENED", () => {
    const r = transition("NOT_OPENED", "OPENED");
    expect(r.engagement).toBe("OPENED");
    expect(r.step).toBe("O_1");
    expect(r.actions).toEqual([
      { kind: "CANCEL_REMAINING", sequenceType: "NOT_OPENED" },
      { kind: "CREATE_SEQUENCE", sequenceType: "OPENED" },
    ]);
  });

  test("NOT_OPENED + UNIQUE_OPENED -> OPENED.O_1", () => {
    const r = transition("NOT_OPENED", "UNIQUE_OPENED");
    expect(r.engagement).toBe("OPENED");
    expect(r.step).toBe("O_1");
  });

  test("NOT_OPENED + CLICKED -> CLICKED.C_1 directly, cancel NO_*, start CLICKED", () => {
    const r = transition("NOT_OPENED", "CLICKED");
    expect(r.engagement).toBe("CLICKED");
    expect(r.step).toBe("C_1");
    expect(r.actions).toEqual([
      { kind: "CANCEL_REMAINING", sequenceType: "NOT_OPENED" },
      { kind: "CREATE_SEQUENCE", sequenceType: "CLICKED" },
    ]);
  });

  test("NOT_OPENED + REPLIED -> REPLIED.R_1, cancel all future", () => {
    const r = transition("NOT_OPENED", "REPLIED");
    expect(r.engagement).toBe("REPLIED");
    expect(r.step).toBe("R_1");
    expect(r.actions).toEqual([{ kind: "CANCEL_ALL_FUTURE" }]);
  });

  test("OPENED + OPENED -> OPENED, record only (never restart)", () => {
    const r = transition(at("OPENED", "O_2"), "OPENED");
    expect(r.engagement).toBe("OPENED");
    expect(r.step).toBe("O_2");
    expect(r.actions).toEqual([{ kind: "RECORD_ONLY" }]);
  });

  test("OPENED + CLICKED -> CLICKED.C_1, cancel OPENED, start CLICKED", () => {
    const r = transition(at("OPENED", "O_2"), "CLICKED");
    expect(r.engagement).toBe("CLICKED");
    expect(r.step).toBe("C_1");
    expect(r.actions).toEqual([
      { kind: "CANCEL_REMAINING", sequenceType: "OPENED" },
      { kind: "CREATE_SEQUENCE", sequenceType: "CLICKED" },
    ]);
  });

  test("OPENED + REPLIED -> REPLIED.R_1, cancel all future", () => {
    const r = transition("OPENED", "REPLIED");
    expect(r.engagement).toBe("REPLIED");
    expect(r.step).toBe("R_1");
    expect(r.actions).toEqual([{ kind: "CANCEL_ALL_FUTURE" }]);
  });

  test("CLICKED + OPENED -> CLICKED, record only (never downgrade)", () => {
    const r = transition(at("CLICKED", "C_2"), "OPENED");
    expect(r.engagement).toBe("CLICKED");
    expect(r.step).toBe("C_2");
    expect(r.actions).toEqual([{ kind: "RECORD_ONLY" }]);
  });

  test("CLICKED + CLICKED -> CLICKED, record only", () => {
    const r = transition("CLICKED", "CLICKED");
    expect(r.engagement).toBe("CLICKED");
    expect(r.step).toBe("C_1");
    expect(r.actions).toEqual([{ kind: "RECORD_ONLY" }]);
  });

  test("CLICKED + REPLIED -> REPLIED.R_1, cancel all future", () => {
    const r = transition("CLICKED", "REPLIED");
    expect(r.engagement).toBe("REPLIED");
    expect(r.step).toBe("R_1");
    expect(r.actions).toEqual([{ kind: "CANCEL_ALL_FUTURE" }]);
  });

  test("suppression forces SUPPRESSED from any active state", () => {
    for (const state of ["NEW", "NOT_OPENED", "OPENED", "CLICKED", "REPLIED"] as const) {
      const r = transition(state, "HARD_BOUNCE");
      expect(r.engagement).toBe("SUPPRESSED");
      expect(r.step).toBeNull();
      expect(r.actions).toEqual([{ kind: "CANCEL_ALL_FUTURE" }, { kind: "SUPPRESS" }]);
    }
  });

  test("each suppression event forces SUPPRESSED", () => {
    for (const event of ["SPAM", "UNSUBSCRIBED", "INVALID_EMAIL", "DO_NOT_CONTACT"] as const) {
      expect(transition("OPENED", event).engagement).toBe("SUPPRESSED");
    }
  });

  test("non-promotional events record only", () => {
    for (const event of ["DELIVERED", "SENT", "SOFT_BOUNCE", "DEFERRED", "BLOCKED"] as const) {
      const r = transition(at("NOT_OPENED", "NO_2"), event);
      expect(r.engagement).toBe("NOT_OPENED");
      expect(r.step).toBe("NO_2");
      expect(r.actions).toEqual([{ kind: "RECORD_ONLY" }]);
    }
  });

  test("REPLIED and SUPPRESSED are terminal for promotions", () => {
    expect(transition("REPLIED", "OPENED").engagement).toBe("REPLIED");
    expect(transition("SUPPRESSED", "OPENED").engagement).toBe("SUPPRESSED");
    expect(transition("SUPPRESSED", "CLICKED").engagement).toBe("SUPPRESSED");
  });
});

describe("transition NEXT_STEP advancement", () => {
  test("NOT_OPENED advances NO_1 -> NO_2 -> NO_3 -> COMPLETE", () => {
    let r = transition(at("NOT_OPENED", "NO_1"), "NEXT_STEP");
    expect(r.step).toBe("NO_2");
    expect(r.actions).toEqual([{ kind: "CREATE_STEP", stepCode: "NO_2" }]);
    r = transition({ engagement: r.engagement, step: r.step }, "NEXT_STEP");
    expect(r.step).toBe("NO_3");
    expect(r.actions).toEqual([{ kind: "CREATE_STEP", stepCode: "NO_3" }]);
    r = transition({ engagement: r.engagement, step: r.step }, "NEXT_STEP");
    expect(r.step).toBe("COMPLETE");
    expect(r.actions).toEqual([{ kind: "COMPLETE_SEQUENCE", sequenceType: "NOT_OPENED" }]);
    r = transition({ engagement: r.engagement, step: r.step }, "NEXT_STEP");
    expect(r.step).toBe("COMPLETE");
    expect(r.actions).toEqual([{ kind: "RECORD_ONLY" }]);
  });

  test("OPENED advances O_1 -> O_2 -> O_3 -> COMPLETE", () => {
    let r = transition("OPENED", "NEXT_STEP");
    expect(r.step).toBe("O_2");
    r = transition({ engagement: r.engagement, step: r.step }, "NEXT_STEP");
    expect(r.step).toBe("O_3");
    r = transition({ engagement: r.engagement, step: r.step }, "NEXT_STEP");
    expect(r.step).toBe("COMPLETE");
    expect(r.actions).toEqual([{ kind: "COMPLETE_SEQUENCE", sequenceType: "OPENED" }]);
  });

  test("CLICKED advances C_1 -> C_2", () => {
    const r = transition("CLICKED", "NEXT_STEP");
    expect(r.step).toBe("C_2");
    expect(r.actions).toEqual([{ kind: "CREATE_STEP", stepCode: "C_2" }]);
  });

  test("REPLIED advances R_1 -> R_2 -> R_3 -> COMPLETE", () => {
    let r = transition(at("REPLIED", "R_1"), "NEXT_STEP");
    expect(r.step).toBe("R_2");
    expect(r.actions).toEqual([{ kind: "CREATE_STEP", stepCode: "R_2" }]);
    r = transition({ engagement: r.engagement, step: r.step }, "NEXT_STEP");
    expect(r.step).toBe("R_3");
    expect(r.actions).toEqual([{ kind: "CREATE_STEP", stepCode: "R_3" }]);
    r = transition({ engagement: r.engagement, step: r.step }, "NEXT_STEP");
    expect(r.step).toBe("COMPLETE");
    expect(r.actions).toEqual([{ kind: "COMPLETE_SEQUENCE", sequenceType: "REPLIED" }]);
  });
});

describe("branch switch lands on first step of target", () => {
  test("O_1 -> CLICKED lands on C_1 and cancels remaining OPENED", () => {
    const r = transition(at("OPENED", "O_1"), "CLICKED");
    expect(r.engagement).toBe("CLICKED");
    expect(r.step).toBe("C_1");
    expect(r.actions).toEqual([
      { kind: "CANCEL_REMAINING", sequenceType: "OPENED" },
      { kind: "CREATE_SEQUENCE", sequenceType: "CLICKED" },
    ]);
  });

  test("NO_3 -> OPENED lands on O_1", () => {
    const r = transition(at("NOT_OPENED", "NO_3"), "OPENED");
    expect(r.engagement).toBe("OPENED");
    expect(r.step).toBe("O_1");
  });

  test("C_2 -> REPLIED lands on R_1 and cancels everything", () => {
    const r = transition(at("CLICKED", "C_2"), "REPLIED");
    expect(r.engagement).toBe("REPLIED");
    expect(r.step).toBe("R_1");
    expect(r.actions).toEqual([{ kind: "CANCEL_ALL_FUTURE" }]);
  });
});