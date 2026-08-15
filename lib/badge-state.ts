import { FILLING_IN_MS } from "@/lib/realtime";

export type BadgeState =
  | "waiting"
  | "connected"
  | "filling-in"
  | "submitted"
  | "disconnected";

type BadgeFacts = {
  submitted: boolean;
  patientPresent: boolean;
  patientWasSeen: boolean;
  lastChangeAt: number | null;
};

export function resolveBadgeState(facts: BadgeFacts, now: number): BadgeState {
  if (facts.submitted) {
    return "submitted";
  }

  if (facts.patientWasSeen && !facts.patientPresent) {
    return "disconnected";
  }

  if (
    facts.patientPresent &&
    facts.lastChangeAt !== null &&
    now - facts.lastChangeAt < FILLING_IN_MS
  ) {
    return "filling-in";
  }

  if (facts.patientPresent) {
    return "connected";
  }

  return "waiting";
}
