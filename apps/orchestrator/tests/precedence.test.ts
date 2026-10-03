import { describe, expect, test } from "bun:test";
import { applyInPrecedence, rankEvent } from "../src/domain/precedence.ts";

describe("rankEvent", () => {
  test("suppression ranks first, then REPLIED, CLICKED, OPENED", () => {
    expect(rankEvent("HARD_BOUNCE")).toBeLessThan(rankEvent("REPLIED"));
    expect(rankEvent("REPLIED")).toBeLessThan(rankEvent("CLICKED"));
    expect(rankEvent("CLICKED")).toBeLessThan(rankEvent("OPENED"));
    expect(rankEvent("UNIQUE_OPENED")).toBe(rankEvent("OPENED"));
    expect(rankEvent("OPENED")).toBeLessThan(rankEvent("DELIVERED"));
    expect(rankEvent("DELIVERED")).toBeLessThan(rankEvent("SENT"));
  });
});

describe("applyInPrecedence §4", () => {
  test("REPLIED beats CLICKED and OPENED", () => {
    const r = applyInPrecedence("NOT_OPENED", ["OPENED", "CLICKED", "REPLIED"]);
    expect(r.state).toBe("REPLIED");
    expect(r.actions).toContainEqual({ kind: "CANCEL_ALL_FUTURE" });
  });

  test("CLICKED beats OPENED", () => {
    const r = applyInPrecedence("NOT_OPENED", ["OPENED", "CLICKED"]);
    expect(r.state).toBe("CLICKED");
  });

  test("suppression beats promotion", () => {
    const r = applyInPrecedence("NOT_OPENED", ["OPENED", "HARD_BOUNCE"]);
    expect(r.state).toBe("SUPPRESSED");
  });

  test("late lower-value event never moves a lead backwards", () => {
    const r = applyInPrecedence("CLICKED", ["DELIVERED", "OPENED"]);
    expect(r.state).toBe("CLICKED");
  });

  test("duplicate lower events do not downgrade or restart", () => {
    const r = applyInPrecedence("OPENED", ["SENT", "DELIVERED", "OPENED"]);
    expect(r.state).toBe("OPENED");
    expect(r.actions.every((a) => a.kind === "RECORD_ONLY")).toBe(true);
  });

  test("a suppression after promotion wins", () => {
    const r = applyInPrecedence("OPENED", ["CLICKED", "SPAM"]);
    expect(r.state).toBe("SUPPRESSED");
  });
});