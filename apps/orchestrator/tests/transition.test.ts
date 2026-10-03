import { describe, expect, test } from "bun:test";
import { transition } from "../src/domain/transition.ts";

describe("transition §3", () => {
  test("NEW + SEND -> NOT_OPENED, start NOT_OPENED sequence", () => {
    const r = transition("NEW", "SEND");
    expect(r.state).toBe("NOT_OPENED");
    expect(r.actions).toEqual([{ kind: "CREATE_SEQUENCE", sequenceType: "NOT_OPENED" }]);
  });

  test("NEW + OPENED -> record only", () => {
    const r = transition("NEW", "OPENED");
    expect(r.state).toBe("NEW");
    expect(r.actions).toEqual([{ kind: "RECORD_ONLY" }]);
  });

  test("NOT_OPENED + OPENED -> OPENED, cancel NO_*, start OPENED", () => {
    const r = transition("NOT_OPENED", "OPENED");
    expect(r.state).toBe("OPENED");
    expect(r.actions).toEqual([
      { kind: "CANCEL_REMAINING", sequenceType: "NOT_OPENED" },
      { kind: "CREATE_SEQUENCE", sequenceType: "OPENED" },
    ]);
  });

  test("NOT_OPENED + UNIQUE_OPENED -> OPENED", () => {
    const r = transition("NOT_OPENED", "UNIQUE_OPENED");
    expect(r.state).toBe("OPENED");
  });

  test("NOT_OPENED + CLICKED -> CLICKED, cancel NO_*, start CLICKED", () => {
    const r = transition("NOT_OPENED", "CLICKED");
    expect(r.state).toBe("CLICKED");
    expect(r.actions).toEqual([
      { kind: "CANCEL_REMAINING", sequenceType: "NOT_OPENED" },
      { kind: "CREATE_SEQUENCE", sequenceType: "CLICKED" },
    ]);
  });

  test("NOT_OPENED + REPLIED -> REPLIED, cancel all future", () => {
    const r = transition("NOT_OPENED", "REPLIED");
    expect(r.state).toBe("REPLIED");
    expect(r.actions).toEqual([{ kind: "CANCEL_ALL_FUTURE" }]);
  });

  test("OPENED + OPENED -> OPENED, record only (never restart)", () => {
    const r = transition("OPENED", "OPENED");
    expect(r.state).toBe("OPENED");
    expect(r.actions).toEqual([{ kind: "RECORD_ONLY" }]);
  });

  test("OPENED + CLICKED -> CLICKED, cancel OPENED, start CLICKED", () => {
    const r = transition("OPENED", "CLICKED");
    expect(r.state).toBe("CLICKED");
    expect(r.actions).toEqual([
      { kind: "CANCEL_REMAINING", sequenceType: "OPENED" },
      { kind: "CREATE_SEQUENCE", sequenceType: "CLICKED" },
    ]);
  });

  test("OPENED + REPLIED -> REPLIED, cancel all future", () => {
    const r = transition("OPENED", "REPLIED");
    expect(r.state).toBe("REPLIED");
    expect(r.actions).toEqual([{ kind: "CANCEL_ALL_FUTURE" }]);
  });

  test("CLICKED + OPENED -> CLICKED, record only (never downgrade)", () => {
    const r = transition("CLICKED", "OPENED");
    expect(r.state).toBe("CLICKED");
    expect(r.actions).toEqual([{ kind: "RECORD_ONLY" }]);
  });

  test("CLICKED + CLICKED -> CLICKED, record only", () => {
    const r = transition("CLICKED", "CLICKED");
    expect(r.state).toBe("CLICKED");
    expect(r.actions).toEqual([{ kind: "RECORD_ONLY" }]);
  });

  test("CLICKED + REPLIED -> REPLIED, cancel all future", () => {
    const r = transition("CLICKED", "REPLIED");
    expect(r.state).toBe("REPLIED");
    expect(r.actions).toEqual([{ kind: "CANCEL_ALL_FUTURE" }]);
  });

  test("suppression forces SUPPRESSED from any active state", () => {
    for (const state of ["NEW", "NOT_OPENED", "OPENED", "CLICKED", "REPLIED"] as const) {
      const r = transition(state, "HARD_BOUNCE");
      expect(r.state).toBe("SUPPRESSED");
      expect(r.actions).toEqual([{ kind: "CANCEL_ALL_FUTURE" }, { kind: "SUPPRESS" }]);
    }
  });

  test("each suppression event forces SUPPRESSED", () => {
    for (const event of ["SPAM", "UNSUBSCRIBED", "INVALID_EMAIL", "DO_NOT_CONTACT"] as const) {
      expect(transition("OPENED", event).state).toBe("SUPPRESSED");
    }
  });

  test("non-promotional events record only", () => {
    for (const event of ["DELIVERED", "SENT", "SOFT_BOUNCE", "DEFERRED", "BLOCKED"] as const) {
      const r = transition("NOT_OPENED", event);
      expect(r.state).toBe("NOT_OPENED");
      expect(r.actions).toEqual([{ kind: "RECORD_ONLY" }]);
    }
  });

  test("REPLIED and SUPPRESSED are terminal for promotions", () => {
    expect(transition("REPLIED", "OPENED").state).toBe("REPLIED");
    expect(transition("SUPPRESSED", "OPENED").state).toBe("SUPPRESSED");
    expect(transition("SUPPRESSED", "CLICKED").state).toBe("SUPPRESSED");
  });
});