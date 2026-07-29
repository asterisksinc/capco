import { OperatorShell } from "@/components/operator/OperatorShell";
import type { ReactNode } from "react";

export default function SprayOperatorLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <OperatorShell>{children}</OperatorShell>;
}
