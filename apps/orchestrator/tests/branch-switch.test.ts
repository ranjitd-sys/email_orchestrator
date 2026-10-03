import { describe, expect, test } from "bun:test";
import { transition } from "../src/domain/transition.ts";

describe("§8 branch-switch", () => {
  test("NOT_OPENED -> OPENED -> CLICKED -> REPLIED, each step cancels prior", () => {
    let result = transition("NOT_OPENED", "OPENED");
    expect(result.state).toBe("OPENED");
    expect(result.actions).toEqual([
      { kind: "CANCEL_REMAINING", sequenceType: "NOT_OPENED" },
      { kind: "CREATE_SEQUENCE", sequenceType: "OPENED" },
    ]);

    result = transition(result.state, "CLICKED");
    expect(result.state).toBe("CLICKED");
    expect(result.actions).toEqual([
      { kind: "CANCEL_REMAINING", sequenceType: "OPENED" },
      { kind: "CREATE_SEQUENCE", sequenceType: "CLICKED" },
    ]);

    result = transition(result.state, "REPLIED");
    expect(result.state).toBe("REPLIED");
    expect(result.actions).toEqual([{ kind: "CANCEL_ALL_FUTURE" }]);
  });

  test("duplicate OPENED never restarts the sequence", () => {
    const first = transition("NOT_OPENED", "OPENED");
    const second = transition(first.state, "UNIQUE_OPENED");
    expect(second.state).toBe("OPENED");
    expect(second.actions).toEqual([{ kind: "RECORD_ONLY" }]);
  });

  test("T06 late OPENED after CLICKED keeps CLICKED", () => {
    const clicked = transition("NOT_OPENED", "CLICKED");
    const late = transition(clicked.state, "OPENED");
    expect(late.state).toBe("CLICKED");
    expect(late.actions).toEqual([{ kind: "RECORD_ONLY" }]);
  });
});