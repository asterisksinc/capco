"use client";

import type { ReactNode } from "react";

import { OperatorSidebar } from "./OperatorSidebar";
import { OperatorTopbar } from "./OperatorTopbar";

export function OperatorShell({ children }: { children: ReactNode }) {
  return (
    <>
      <OperatorSidebar />
      <div className="flex-1 ml-[0px] md:ml-[260px] flex flex-col min-h-screen">
        <OperatorTopbar />
        <main className="flex-1 w-full bg-[#FAFAFA]">
          {children}
        </main>
      </div>
    </>
  );
}


