import type { BadgeState } from "@/lib/badge-state";

const BADGE_LABEL: Record<BadgeState, string> = {
  waiting: "Waiting",
  connected: "Connected",
  "filling-in": "Filling in",
  submitted: "Submitted",
  disconnected: "Disconnected",
};

const BADGE_CLASS: Record<BadgeState, string> = {
  waiting: "border-zinc-300 bg-zinc-100 text-zinc-700",
  connected: "border-green-500 bg-white text-green-700",
  "filling-in": "border-amber-300 bg-amber-50 text-amber-700",
  submitted: "border-blue-300 bg-blue-50 text-blue-700",
  disconnected: "border-zinc-400 bg-white text-zinc-700",
};

type StatusBadgeProps = {
  badge: BadgeState;
  lastUpdatedAt: number | null;
  submittedAt: number | null;
  now: number;
  announce?: boolean;
};

function formatUpdated(at: number, now: number) {
  const minutes = Math.max(0, Math.floor((now - at) / 60_000));

  if (minutes < 1) {
    return "updated just now";
  }

  return `updated ${minutes}m ago`;
}

export function StatusBadge({
  badge,
  lastUpdatedAt,
  submittedAt,
  now,
  announce = true,
}: StatusBadgeProps) {
  const timeLabel =
    badge === "submitted" && submittedAt
      ? `Submitted at ${new Date(submittedAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}`
      : lastUpdatedAt
        ? formatUpdated(lastUpdatedAt, now)
        : null;

  return (
    <div
      className="flex flex-wrap items-center gap-3"
      aria-live={announce ? "polite" : undefined}
    >
      <span
        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium ${BADGE_CLASS[badge]}`}
      >
        {badge === "disconnected" ? (
          <span className="size-2 rounded-full border-2 border-zinc-500" />
        ) : (
          <span
            className={`size-2 rounded-full ${
              badge === "waiting"
                ? "bg-zinc-400"
                : badge === "connected"
                  ? "bg-green-500"
                  : badge === "filling-in"
                    ? "bg-amber-500"
                    : badge === "submitted"
                      ? "bg-blue-500"
                      : "bg-zinc-400"
            }`}
          />
        )}
        {BADGE_LABEL[badge]}
      </span>
      {timeLabel ? (
        <span className="min-w-32 text-sm text-zinc-500">{timeLabel}</span>
      ) : null}
    </div>
  );
}
