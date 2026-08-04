"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { X } from "lucide-react";

import { PersonBSidebar } from "./PersonBSidebar";
import { PersonBTopbar } from "./PersonBTopbar";
import { MobileMenuProvider, useMobileMenu } from "@/components/MobileMenuContext";
import { LayoutDashboard, Calendar, BarChart2, Share2, ClipboardList, Undo2 } from "lucide-react";

const mobileNavItems = [
  { name: "Overview", href: "/person-b/overview", icon: LayoutDashboard },
  { name: "Work Orders", href: "/person-b/workorder", icon: Calendar },
  { name: "Product Orders", href: "/person-b/product-orders", icon: Calendar },
  { name: "Stock", href: "/person-b/stock", icon: BarChart2 },
  { name: "Material Requests", href: "/person-b/material-requests", icon: ClipboardList },
  { name: "Material Returns", href: "/person-b/material-returns", icon: Undo2 },
  { name: "Pipeline", href: "/person-b/pipeline", icon: Share2 },
];

function PersonBShellContent({ children }: { children: ReactNode }) {
  const { isMobileMenuOpen, setIsMobileMenuOpen } = useMobileMenu();

  return (
    <>
      <PersonBSidebar />

      <div className="flex-1 md:ml-[260px] flex flex-col min-h-screen">
        <div className="hidden md:block">
          <PersonBTopbar />
        </div>
        <main className="flex-1 w-full bg-[#FAFAFA]">
          {children}
        </main>
      </div>

      {isMobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-[#171717]/40 backdrop-blur-sm md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          <div className="fixed top-0 left-0 bottom-0 w-[260px] bg-[#F5F7FA] z-50 md:hidden overflow-y-auto animate-slide-in">
            <div className="h-[72px] px-4 flex items-center justify-between border-b border-[#EBEBEB] bg-[#F5F7FA]">
              <span className="text-[16px] font-semibold text-[#171717]">Capco</span>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 hover:bg-white rounded-lg"
              >
                <X className="w-5 h-5 text-[#171717]" />
              </button>
            </div>

            <nav className="flex-1 px-4 py-6 space-y-2">
              {mobileNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center space-x-3 px-4 py-[10px] rounded-[6px] transition-colors text-[14px] text-[#5C5C5C] hover:bg-[#EAEFF4] hover:text-[#171717]"
                  >
                    <Icon className="w-[18px] h-[18px]" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="p-4 border-t border-[#EBEBEB] bg-[#F5F7FA] mt-auto">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[14px] font-semibold text-[#171717]">Capco Capacitors</span>
                  <span className="text-[12px] text-[#5C5C5C]">example@gmail.com</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

export function PersonBShell({ children }: { children: ReactNode }) {
  return (
    <MobileMenuProvider>
      <PersonBShellContent>{children}</PersonBShellContent>
    </MobileMenuProvider>
  );
}


