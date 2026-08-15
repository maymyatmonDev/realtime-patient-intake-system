import type { ChangeEvent, FocusEvent, MouseEvent } from "react";
import { useFormContext } from "react-hook-form";
import {
  FIELD_LABELS,
  GENDER_OPTIONS,
  OPTIONAL_FIELDS,
} from "@/lib/intake-fields";
import type { FieldName, IntakeForm } from "@/lib/intake-schema";

type FormFieldProps = {
  name: FieldName;
  type?: "text" | "tel" | "email" | "date";
  as?: "input" | "select" | "textarea";
  readOnly?: boolean;
};

function openDatePicker(input: HTMLInputElement) {
  if (typeof input.showPicker !== "function") {
    return;
  }

  try {
    input.showPicker();
  } catch {
    // Already open, or the browser blocked it.
  }
}

export function FormField({
  name,
  type = "text",
  as = "input",
  readOnly = false,
}: FormFieldProps) {
  const {
    register,
    trigger,
    getValues,
    formState: { errors },
  } = useFormContext<IntakeForm>();

  const field = register(name);
  const error = errors[name]?.message;
  const errorId = `${name}-error`;
  const optional = OPTIONAL_FIELDS.includes(name);
  const today = new Date().toISOString().slice(0, 10);
  const genderLabel =
    GENDER_OPTIONS.find((option) => option.value === getValues(name))?.label ??
    "";

  const handleChange = (
    event: ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    if (name === "phone") {
      const hasPlus = event.target.value.startsWith("+");
      const digits = event.target.value.replace(/\D/g, "").slice(0, 15);
      event.target.value = hasPlus ? `+${digits}` : digits;
    }

    void field.onChange(event);

    if (name === "phone") {
      void trigger("phone");
    }
  };

  const handleDateActivate = (
    event: MouseEvent<HTMLInputElement> | FocusEvent<HTMLInputElement>,
  ) => {
    if (type !== "date" || readOnly) {
      return;
    }

    openDatePicker(event.currentTarget);
  };

  const controlClassName =
    "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-900 read-only:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600";

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className="text-sm font-medium text-zinc-700">
        {FIELD_LABELS[name]}
        {!optional ? (
          <span className="text-red-700" aria-hidden>
            {" *"}
          </span>
        ) : null}
      </label>

      {as === "textarea" ? (
        <textarea
          id={name}
          rows={3}
          readOnly={readOnly}
          aria-required={!optional}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className={controlClassName}
          {...field}
          onChange={handleChange}
        />
      ) : as === "select" && readOnly ? (
        <input
          id={name}
          readOnly
          value={genderLabel}
          aria-required={!optional}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className={controlClassName}
        />
      ) : as === "select" ? (
        <select
          id={name}
          aria-required={!optional}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className={controlClassName}
          {...field}
          onChange={handleChange}
        >
          <option value="">Select…</option>
          {GENDER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={name}
          type={type}
          max={type === "date" ? today : undefined}
          maxLength={name === "phone" ? 16 : undefined}
          readOnly={readOnly}
          aria-required={!optional}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className={`${controlClassName}${
            type === "date" && !readOnly ? " cursor-pointer" : ""
          }`}
          {...field}
          onChange={handleChange}
          onClick={handleDateActivate}
          onFocus={handleDateActivate}
        />
      )}

      {error ? (
        <p id={errorId} className="text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
