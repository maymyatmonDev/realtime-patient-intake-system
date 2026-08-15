import type { FieldName, IntakeForm } from "@/lib/intake-schema";

export const FIELD_LABELS: Record<FieldName, string> = {
  firstName: "First name",
  middleName: "Middle name",
  lastName: "Last name",
  dateOfBirth: "Date of birth",
  gender: "Gender",
  nationality: "Nationality",
  preferredLanguage: "Preferred language",
  phone: "Phone number",
  email: "Email",
  address: "Address",
  region: "Region",
  emergencyName: "Name",
  emergencyRelationship: "Relationship",
};

export const OPTIONAL_FIELDS: FieldName[] = [
  "middleName",
  "region",
  "emergencyName",
  "emergencyRelationship",
];

export const SECTIONS: { title: string; fields: FieldName[] }[] = [
  {
    title: "Personal details",
    fields: [
      "firstName",
      "middleName",
      "lastName",
      "dateOfBirth",
      "gender",
      "nationality",
      "preferredLanguage",
    ],
  },
  {
    title: "Contact information",
    fields: ["phone", "email", "address", "region"],
  },
  {
    title: "Emergency contact",
    fields: ["emergencyName", "emergencyRelationship"],
  },
];

export const GENDER_OPTIONS = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "other", label: "Other" },
  { value: "prefer-not-to-say", label: "Prefer not to say" },
] as const;

const FIELD_NAMES = Object.keys(FIELD_LABELS) as FieldName[];

export const TOTAL_FIELD_COUNT = FIELD_NAMES.length;

export function displayNameFromValues(values: Partial<IntakeForm>) {
  const name = [values.firstName, values.lastName]
    .map((part) => part?.trim() ?? "")
    .filter(Boolean)
    .join(" ");

  return name || "Unnamed intake";
}

export function filledFieldCount(values: Partial<IntakeForm>) {
  return FIELD_NAMES.filter((field) => Boolean(values[field])).length;
}

export function filledValues(values: Partial<IntakeForm>) {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => Boolean(value)),
  );
}

export function displayFieldValue(name: FieldName, value: string) {
  if (name === "gender") {
    return GENDER_OPTIONS.find((option) => option.value === value)?.label ?? value;
  }

  return value;
}
