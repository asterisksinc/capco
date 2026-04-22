import { PersonBShell } from "@/components/person-b/PersonBShell";
import type { ReactNode } from "react";

export default function PersonBLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <PersonBShell>{children}</PersonBShell>;
}


