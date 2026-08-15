import { displayFieldValue, FIELD_LABELS, SECTIONS } from "@/lib/intake-fields";
import type { IntakeForm } from "@/lib/intake-schema";

type PreviousSubmissionProps = {
  values: IntakeForm;
  submittedAt: number;
};

export function PreviousSubmission({
  values,
  submittedAt,
}: PreviousSubmissionProps) {
  const time = new Date(submittedAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="mt-10">
      <p className="mb-3 text-sm text-zinc-500">
        Previous submission · {time}. This copy clears when the next patient
        types.
      </p>
      <div className="rounded-xl bg-zinc-100 p-4 md:p-6">
        {SECTIONS.map((section) => (
          <section key={section.title} className="mb-6 last:mb-0">
            <h3 className="mb-2 text-sm font-medium text-zinc-500">
              {section.title}
            </h3>
            <dl>
              {section.fields.map((field) => (
                <div
                  key={field}
                  className="flex flex-col gap-1 border-b border-zinc-200 py-2 last:border-0 md:flex-row"
                >
                  <dt className="w-48 shrink-0 text-sm text-zinc-500">
                    {FIELD_LABELS[field]}
                  </dt>
                  <dd className="text-sm text-zinc-800">
                    {values[field]
                      ? displayFieldValue(field, values[field])
                      : "Not provided"}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </div>
  );
}
