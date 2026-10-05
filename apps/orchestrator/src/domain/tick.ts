import * as Effect from "effect/Effect";
import { loadDueActionIds } from "@email/db";
import { runPipeline } from "./pipeline.ts";
import type { QueuePublisher } from "../queue/publisher.ts";

export const runTick = (publisher: QueuePublisher) =>
  Effect.gen(function* () {
    const now = new Date();
    const actionIds = yield* loadDueActionIds(now);
    let processed = 0;
    for (const actionId of actionIds) {
      const outcome = yield* runPipeline(actionId, publisher);
      if (outcome === "sent") processed += 1;
    }
    return processed;
  });