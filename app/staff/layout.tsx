import { StaffWorkspace } from "@/components/staff/StaffWorkspace";

export default function StaffLayout({ children }: LayoutProps<"/staff">) {
  return <StaffWorkspace>{children}</StaffWorkspace>;
}
