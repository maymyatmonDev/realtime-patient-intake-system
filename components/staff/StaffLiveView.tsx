"use client";

import { AppHeader } from "@/components/AppHeader";
import { PatientRecord } from "@/components/staff/PatientRecord";
import { PreviousSubmission } from "@/components/staff/PreviousSubmission";
import { StatusBadge } from "@/components/staff/StatusBadge";
import { useStaffSync } from "@/hooks/useStaffSync";

export function StaffLiveView() {
  const {
    connection,
    badge,
    values,
    fieldUpdatedAt,
    lastUpdatedAt,
    submittedAt,
    previousSubmission,
    now,
  } = useStaffSync();

  return (
    <div className="min-h-full">
      <AppHeader
        variant="staff"
        right={
          <StatusBadge
            badge={badge}
            lastUpdatedAt={lastUpdatedAt}
            submittedAt={submittedAt}
            now={now}
          />
        }
      />

      {connection === "reconnecting" ? (
        <p className="bg-amber-100 px-4 py-2 text-center text-sm text-amber-800">
          Reconnecting…
        </p>
      ) : null}

      <main className="mx-auto w-full max-w-4xl px-4 py-8 md:px-8">
        {badge === "waiting" ? (
          <div className="flex flex-col items-center py-16 text-center">
            <h1 className="text-2xl font-semibold text-zinc-900">
              Waiting for a patient to begin
            </h1>
            <p className="mt-2 max-w-md text-base text-zinc-600">
              The patient form is at the root URL. The live record appears when
              they tap Begin intake.
            </p>
            {previousSubmission ? (
              <div className="mt-10 w-full text-left">
                <PreviousSubmission
                  values={previousSubmission.values}
                  submittedAt={previousSubmission.submittedAt}
                />
              </div>
            ) : null}
          </div>
        ) : (
          <>
            <div className={connection === "reconnecting" ? "opacity-75" : undefined}>
              <PatientRecord
                badge={badge}
                values={values}
                fieldUpdatedAt={fieldUpdatedAt}
              />
            </div>
            {previousSubmission ? (
              <PreviousSubmission
                values={previousSubmission.values}
                submittedAt={previousSubmission.submittedAt}
              />
            ) : null}
          </>
        )}
      </main>
    </div>
  );
}
