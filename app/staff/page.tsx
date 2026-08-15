import type { Metadata } from "next";
import { StaffList } from "@/components/staff/StaffList";

export const metadata: Metadata = {
  title: "Front Desk — Live View",
};

export default function StaffPage() {
  return <StaffList />;
}
