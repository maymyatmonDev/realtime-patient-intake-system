import { useFormContext, type FieldErrors } from "react-hook-form";
import { FormField } from "@/components/patient/FormField";
import { SubmitControl } from "@/components/patient/IntakeActions";
import { SECTIONS } from "@/lib/intake-fields";
import type { IntakeForm } from "@/lib/intake-schema";

type IntakeFormProps = {
  submitted: boolean;
  submitting: boolean;
  onSubmit: (values: IntakeForm) => void;
};

function focusFirstError(errors: FieldErrors<IntakeForm>) {
  for (const section of SECTIONS) {
    for (const field of section.fields) {
      if (errors[field]) {
        document.getElementById(field)?.focus();
        return;
      }
    }
  }
}

export function IntakeForm({
  submitted,
  submitting,
  onSubmit,
}: IntakeFormProps) {
  const { handleSubmit } = useFormContext<IntakeForm>();

  return (
    <form
      onSubmit={handleSubmit(onSubmit, focusFirstError)}
      className="flex flex-col gap-10 rounded-xl border border-zinc-200 border-t-emerald-600 bg-white p-4 md:p-6"
      noValidate
    >
      <section className="flex flex-col gap-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900">
          <span className="size-1.5 rounded-full bg-emerald-600" aria-hidden />
          Personal details
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <FormField name="firstName" readOnly={submitted} />
          <FormField name="middleName" readOnly={submitted} />
          <FormField name="lastName" readOnly={submitted} />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField name="dateOfBirth" type="date" readOnly={submitted} />
          <FormField name="gender" as="select" readOnly={submitted} />
          <FormField name="nationality" readOnly={submitted} />
          <FormField name="preferredLanguage" readOnly={submitted} />
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900">
          <span className="size-1.5 rounded-full bg-emerald-600" aria-hidden />
          Contact information
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField name="phone" type="tel" readOnly={submitted} />
          <FormField name="email" type="email" readOnly={submitted} />
        </div>
        <FormField name="address" as="textarea" readOnly={submitted} />
        <FormField name="region" readOnly={submitted} />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900">
          <span className="size-1.5 rounded-full bg-emerald-600" aria-hidden />
          Emergency contact
          <span className="text-sm font-normal text-zinc-500">Optional</span>
        </h2>
        <div className="flex flex-col gap-4 rounded-md border border-zinc-200 bg-zinc-50 p-4">
          <p className="text-sm text-zinc-500">
            If you give a name, please give the relationship too.
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField name="emergencyName" readOnly={submitted} />
            <FormField name="emergencyRelationship" readOnly={submitted} />
          </div>
        </div>
      </section>

      <SubmitControl submitted={submitted} submitting={submitting} />
    </form>
  );
}
