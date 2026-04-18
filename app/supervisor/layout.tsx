import { SupervisorShell } from "@/components/supervisor/SupervisorShell";
import type { ReactNode } from "react";

export default function SupervisorLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <SupervisorShell>{children}</SupervisorShell>;
}
