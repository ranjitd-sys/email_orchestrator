import { describe, expect, test } from "bun:test";
import { transition } from "../src/domain/transition.ts";

describe("§8 branch-switch", () => {
  test("NOT_OPENED -> OPENED -> CLICKED -> REPLIED, each step cancels prior", () => {
    let result = transition("NOT_OPENED", "OPENED");
    expect(result.engagement).toBe("OPENED");
    expect(result.step).toBe("O_1");
    expect(result.actions).toEqual([
      { kind: "CANCEL_REMAINING", sequenceType: "NOT_OPENED" },
      { kind: "CREATE_SEQUENCE", sequenceType: "OPENED" },
    ]);

    result = transition({ engagement: result.engagement, step: result.step }, "CLICKED");
    expect(result.engagement).toBe("CLICKED");
    expect(result.step).toBe("C_1");
    expect(result.actions).toEqual([
      { kind: "CANCEL_REMAINING", sequenceType: "OPENED" },
      { kind: "CREATE_SEQUENCE", sequenceType: "CLICKED" },
    ]);

    result = transition({ engagement: result.engagement, step: result.step }, "REPLIED");
    expect(result.engagement).toBe("REPLIED");
    expect(result.step).toBe("R_1");
    expect(result.actions).toEqual([{ kind: "CANCEL_ALL_FUTURE" }]);
  });

  test("duplicate OPENED never restarts the sequence", () => {
    const first = transition("NOT_OPENED", "OPENED");
    const second = transition(
      { engagement: first.engagement, step: first.step },
      "UNIQUE_OPENED",
    );
    expect(second.engagement).toBe("OPENED");
    expect(second.step).toBe("O_1");
    expect(second.actions).toEqual([{ kind: "RECORD_ONLY" }]);
  });

  test("T06 late OPENED after CLICKED keeps CLICKED", () => {
    const clicked = transition("NOT_OPENED", "CLICKED");
    const late = transition({ engagement: clicked.engagement, step: clicked.step }, "OPENED");
    expect(late.engagement).toBe("CLICKED");
    expect(late.step).toBe("C_1");
    expect(late.actions).toEqual([{ kind: "RECORD_ONLY" }]);
  });
});