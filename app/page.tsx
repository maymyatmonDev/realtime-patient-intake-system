import type { Metadata } from "next";
import { PatientIntake } from "@/components/patient/PatientIntake";

export const metadata: Metadata = {
  title: "Patient Intake",
};

export default function PatientFormPage() {
  return <PatientIntake />;
}
