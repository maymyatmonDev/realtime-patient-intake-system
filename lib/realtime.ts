export const CHANNEL_NAME = "intake-session";

export const REALTIME_EVENTS = {
  FIELD_CHANGE: "field-change",
  SUBMIT: "submit",
  SESSION_RESET: "session-reset",
  STATE_SNAPSHOT: "state-snapshot",
} as const;

export const FIELD_CHANGE_DEBOUNCE_MS = 250;
export const SNAPSHOT_DEBOUNCE_MS = 500;
export const FILLING_IN_MS = 3000;
