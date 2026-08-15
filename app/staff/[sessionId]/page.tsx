import type { Metadata } from "next";
import { StaffLiveView } from "@/components/staff/StaffLiveView";

export const metadata: Metadata = {
  title: "Front Desk — Live View",
};

type StaffSessionPageProps = {
  params: Promise<{ sessionId: string }>;
};

export default async function StaffSessionPage({
  params,
}: StaffSessionPageProps) {
  const { sessionId } = await params;

  return <StaffLiveView sessionId={sessionId} />;
}
