export const LIST_CHANNEL_NAME = "intake-list";

export function sessionChannelName(sessionId: string) {
  return `intake-session:${sessionId}`;
}

export const REALTIME_EVENTS = {
  FIELD_CHANGE: "field-change",
  SUBMIT: "submit",
  SESSION_RESET: "session-reset",
  STATE_SNAPSHOT: "state-snapshot",
} as const;

export const FIELD_CHANGE_DEBOUNCE_MS = 250;
export const SNAPSHOT_DEBOUNCE_MS = 500;
export const FILLING_IN_MS = 3000;
export const LIST_TRACK_THROTTLE_MS = 1000;
