import { z } from "zod";

const required = (label: string) => z.string().trim().min(1, `Enter ${label}`);

const optional = z.string().trim();

export const intakeSchema = z
  .object({
    firstName: required("first name"),
    middleName: optional,
    lastName: required("last name"),
    dateOfBirth: required("date of birth").refine((value) => {
      const today = new Date().toISOString().slice(0, 10);
      return value <= today;
    }, "Date of birth cannot be in the future"),
    gender: z.enum(["female", "male", "other", "prefer-not-to-say"], {
      error: "Select a gender",
    }),
    nationality: required("nationality"),
    preferredLanguage: required("a preferred language"),
    phone: required("phone number").regex(
      /^\+?\d{8,15}$/,
      "Enter a valid phone number",
    ),
    email: required("email").email("Enter a valid email"),
    address: required("address"),
    region: optional,
    emergencyName: optional,
    emergencyRelationship: optional,
  })
  .superRefine((values, ctx) => {
    const hasName = values.emergencyName.length > 0;
    const hasRelationship = values.emergencyRelationship.length > 0;

    if (hasName && !hasRelationship) {
      ctx.addIssue({
        code: "custom",
        path: ["emergencyRelationship"],
        message: "Enter the relationship",
      });
    }

    if (hasRelationship && !hasName) {
      ctx.addIssue({
        code: "custom",
        path: ["emergencyName"],
        message: "Enter the emergency contact name",
      });
    }
  });

export type IntakeForm = z.infer<typeof intakeSchema>;
export type FieldName = keyof IntakeForm;

export const emptyIntakeForm: IntakeForm = {
  firstName: "",
  middleName: "",
  lastName: "",
  dateOfBirth: "",
  gender: "" as IntakeForm["gender"],
  nationality: "",
  preferredLanguage: "",
  phone: "",
  email: "",
  address: "",
  region: "",
  emergencyName: "",
  emergencyRelationship: "",
};

export const fieldChangeSchema = z.object({
  field: z.enum([
    "firstName",
    "middleName",
    "lastName",
    "dateOfBirth",
    "gender",
    "nationality",
    "preferredLanguage",
    "phone",
    "email",
    "address",
    "region",
    "emergencyName",
    "emergencyRelationship",
  ]),
  value: z.string(),
  at: z.number(),
});

export const submitSchema = z.object({
  values: intakeSchema,
  at: z.number(),
});

export const sessionResetSchema = z.object({
  at: z.number(),
});

export const stateSnapshotSchema = z.object({
  values: z.record(z.string(), z.string()),
  submitted: z.boolean(),
  submittedAt: z.number().nullable(),
  at: z.number(),
});

export const presenceSchema = z.object({
  role: z.enum(["patient", "staff"]),
  clientId: z.string(),
  joinedAt: z.number(),
});

export const listPresenceSchema = z.object({
  sessionId: z.string(),
  displayName: z.string(),
  filledCount: z.number(),
  totalCount: z.number(),
  status: z.enum(["filling", "idle", "submitted"]),
  lastChangeAt: z.number().nullable(),
  startedAt: z.number(),
  values: z.record(z.string(), z.string()),
});

export type FieldChangePayload = z.infer<typeof fieldChangeSchema>;
export type SubmitPayload = z.infer<typeof submitSchema>;
export type SessionResetPayload = z.infer<typeof sessionResetSchema>;
export type StateSnapshotPayload = z.infer<typeof stateSnapshotSchema>;
export type PresencePayload = z.infer<typeof presenceSchema>;
export type ListPresencePayload = z.infer<typeof listPresenceSchema>;
