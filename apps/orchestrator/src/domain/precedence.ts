import type { DomainEvent, EngagementState } from "@email/shared";
import { isSuppressionEvent } from "@email/shared";
import {
  transition,
  type TransitionAction,
  type TransitionPosition,
  type TransitionResult,
} from "./transition";

export function rankEvent(event: DomainEvent): number {
  if (isSuppressionEvent(event)) return 0;
  switch (event) {
    case "REPLIED":
      return 1;
    case "CLICKED":
      return 2;
    case "OPENED":
    case "UNIQUE_OPENED":
      return 3;
    case "DELIVERED":
      return 4;
    case "SENT":
      return 5;
    default:
      return 6;
  }
}

export function applyInPrecedence(
  initial: TransitionPosition | EngagementState,
  events: readonly DomainEvent[],
): TransitionResult {
  const ordered = [...events].sort((a, b) => rankEvent(a) - rankEvent(b));
  let position: TransitionPosition =
    typeof initial === "string" ? { engagement: initial, step: null } : initial;
  const actions: TransitionAction[] = [];
  for (const event of ordered) {
    const result = transition(position, event);
    position = { engagement: result.engagement, step: result.step };
    actions.push(...result.actions);
  }
  return { engagement: position.engagement, step: position.step, actions };
}