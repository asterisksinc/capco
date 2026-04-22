"use client";

import type { ReactNode } from "react";

import { PersonBSidebar } from "./PersonBSidebar";
import { PersonBTopbar } from "./PersonBTopbar";

export function PersonBShell({ children }: { children: ReactNode }) {
  return (
    <>
      <PersonBSidebar />
      <div className="flex-1 ml-[0px] md:ml-[260px] flex flex-col min-h-screen">
        <PersonBTopbar />
        <main className="flex-1 w-full bg-[#FAFAFA]">
          {children}
        </main>
      </div>
    </>
  );
}


