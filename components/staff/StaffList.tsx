"use client";

import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { StatusBadge } from "@/components/staff/StatusBadge";
import { useStaffWorkspace } from "@/components/staff/StaffWorkspace";

function formatStarted(at: number, now: number) {
  const minutes = Math.max(0, Math.floor((now - at) / 60_000));

  if (minutes < 1) {
    return "started just now";
  }

  return `started ${minutes}m ago`;
}

export function StaffList() {
  const { list, prefetchSession } = useStaffWorkspace();
  const { sessions, ready, now } = list;

  return (
    <div className="min-h-full">
      <AppHeader variant="staff" />

      <main className="mx-auto w-full max-w-4xl px-4 py-8 md:px-8">
        {!ready ? null : sessions.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <p className="text-sm tracking-wide text-emerald-700">Front desk</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-emerald-700 md:text-4xl">
              Waiting for a patient
            </h1>
            <p className="mt-4 max-w-md text-base leading-relaxed text-zinc-600">
              The patient form is at the root URL. Intakes appear here when they
              tap Begin Intake.
            </p>
          </div>
        ) : (
          <>
            <h1 className="mb-4 text-lg font-semibold text-zinc-900">
              Active intakes
            </h1>
            <ul className="flex flex-col gap-3">
              {sessions.map((session) => (
                <li key={session.sessionId}>
                  <Link
                    href={`/staff/${session.sessionId}`}
                    onPointerDown={() => prefetchSession(session.sessionId)}
                    className="flex cursor-pointer flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 hover:border-emerald-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-base font-semibold text-zinc-900">
                        {session.displayName}
                      </p>
                      <StatusBadge
                        badge={session.badge}
                        lastUpdatedAt={null}
                        submittedAt={null}
                        now={now}
                        announce={false}
                      />
                    </div>
                    <p className="text-sm text-zinc-500">
                      {session.filledCount} of {session.totalCount} provided ·{" "}
                      {formatStarted(session.startedAt, now)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </main>
    </div>
  );
}
