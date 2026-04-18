"use client";

import type { ReactNode } from "react";

import { SupervisorSidebar } from "./SupervisorSidebar";
import { SupervisorTopbar } from "./SupervisorTopbar";

export function SupervisorShell({ children }: { children: ReactNode }) {
  return (
    <>
      <SupervisorSidebar />
      <div className="flex-1 ml-[0px] md:ml-[260px] flex flex-col min-h-screen">
        <SupervisorTopbar />
        <main className="flex-1 w-full bg-[#FAFAFA]">
          {children}
        </main>
      </div>
    </>
  );
}
