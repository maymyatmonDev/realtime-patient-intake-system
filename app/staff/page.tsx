import type { Metadata } from "next";
import { StaffLiveView } from "@/components/staff/StaffLiveView";

export const metadata: Metadata = {
  title: "Front Desk — Live View",
};

export default function StaffPage() {
  return <StaffLiveView />;
}
