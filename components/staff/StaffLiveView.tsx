"use client";

import { AppHeader } from "@/components/AppHeader";
import { PatientRecord } from "@/components/staff/PatientRecord";
import { StatusBadge } from "@/components/staff/StatusBadge";
import { useStaffWorkspace } from "@/components/staff/StaffWorkspace";
import { displayNameFromValues } from "@/lib/intake-fields";
import type { IntakeForm } from "@/lib/intake-schema";

type StaffLiveViewProps = {
  sessionId: string;
};

export function StaffLiveView({ sessionId }: StaffLiveViewProps) {
  const { list, session } = useStaffWorkspace();
  const seed = list.sessions.find((row) => row.sessionId === sessionId);
  const values =
    Object.keys(session.values).length > 0
      ? session.values
      : ((seed?.values ?? {}) as Partial<IntakeForm>);
  const submittedAt =
    session.submittedAt ??
    (seed?.status === "submitted" ? seed.lastChangeAt : null);
  const lastUpdatedAt = session.lastUpdatedAt ?? seed?.lastChangeAt ?? null;
  const badge =
    Object.keys(session.values).length > 0 || session.ended
      ? session.badge
      : (seed?.badge ?? session.badge);

  return (
    <div className="min-h-full">
      <AppHeader
        variant="staff"
        backHref="/staff"
        title={displayNameFromValues(values)}
        right={
          <StatusBadge
            badge={badge}
            lastUpdatedAt={lastUpdatedAt}
            submittedAt={submittedAt}
            now={session.now}
          />
        }
      />

      {session.connection === "reconnecting" ? (
        <p className="bg-amber-100 px-4 py-2 text-center text-sm text-amber-800">
          Reconnecting…
        </p>
      ) : session.ended ? (
        <p className="bg-zinc-200 px-4 py-2 text-center text-sm text-zinc-700">
          {badge === "disconnected"
            ? "Patient disconnected — showing last known values."
            : "This intake has ended."}
        </p>
      ) : null}

      <main className="mx-auto w-full max-w-4xl px-4 py-8 md:px-8">
        <div
          className={
            session.connection === "reconnecting" ? "opacity-75" : undefined
          }
        >
          <PatientRecord
            badge={badge}
            values={values}
            fieldUpdatedAt={session.fieldUpdatedAt}
          />
        </div>
      </main>
    </div>
  );
}
