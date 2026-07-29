import { OperatorShell } from "@/components/operator/OperatorShell";
import type { ReactNode } from "react";

export default function SprayQcLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <OperatorShell>{children}</OperatorShell>;
}
