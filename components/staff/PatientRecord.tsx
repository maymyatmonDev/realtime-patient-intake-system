import { RecordRow } from "@/components/staff/RecordRow";
import type { BadgeState } from "@/lib/badge-state";
import { SECTIONS } from "@/lib/intake-fields";
import type { FieldName, IntakeForm } from "@/lib/intake-schema";

type PatientRecordProps = {
  badge: BadgeState;
  values: Partial<IntakeForm>;
  fieldUpdatedAt: Partial<Record<FieldName, number>>;
};

export function PatientRecord({
  badge,
  values,
  fieldUpdatedAt,
}: PatientRecordProps) {
  const emptyLabel =
    badge === "submitted" || badge === "disconnected"
      ? "Not provided"
      : "Not provided yet";

  return (
    <div className="rounded-xl border border-zinc-200 border-t-4 border-t-emerald-500 bg-white p-4 md:p-8">
      {SECTIONS.map((section) => (
        <section key={section.title} className="mb-8 last:mb-0">
          <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold text-zinc-900">
            <span className="size-1.5 rounded-full bg-emerald-600" />
            {section.title}
          </h2>
          <dl>
            {section.fields.map((field) => (
              <RecordRow
                key={field}
                name={field}
                value={values[field]}
                updatedAt={fieldUpdatedAt[field]}
                emptyLabel={emptyLabel}
              />
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}
