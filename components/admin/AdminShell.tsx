"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

import { AdminSidebar } from "./AdminSidebar";
import { AdminTopbar } from "./AdminTopbar";
import { MobileMenuProvider, useMobileMenu } from "@/components/MobileMenuContext";

function AdminShellContent({ children }: { children: ReactNode }) {
  const { isMobileMenuOpen, setIsMobileMenuOpen } = useMobileMenu();

  return (
    <>
      {/* Desktop sidebar - hidden on mobile */}
      <div className="hidden md:block">
        <AdminSidebar />
      </div>
      
      <div className="flex-1 md:ml-[260px] flex flex-col min-h-screen">
        {/* Desktop topbar - hidden on mobile */}
        <div className="hidden md:block">
          <AdminTopbar />
        </div>
        <main className="flex-1 w-full bg-[#FAFAFA]">
          {children}
        </main>
      </div>

      {/* Mobile Sidebar Drawer */}
      {isMobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-50 bg-[#171717]/40 backdrop-blur-sm md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          
          {/* Sidebar Drawer */}
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
              {[
                { name: "Overview", href: "/admin/overview" },
                { name: "Work Orders", href: "/admin/workorders" },
                { name: "Product Orders", href: "/admin/productorders" },
                { name: "Inventory", href: "/admin/inventory" },
                { name: "Pipeline", href: "/admin/pipeline" },
                { name: "User Management", href: "/admin/users" },
                { name: "CRM", href: "/admin/crm" },
                { name: "Reports", href: "/admin/reports" },
                { name: "Invoices", href: "/admin/invoices" },
                { name: "Finished Goods", href: "/admin/finishedgoods" },
              ].map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center space-x-3 px-4 py-[10px] rounded-[6px] transition-colors text-[14px] text-[#5C5C5C] hover:bg-[#EAEFF4] hover:text-[#171717]"
                >
                  <span>{item.name}</span>
                </Link>
              ))}
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

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <MobileMenuProvider>
      <AdminShellContent>{children}</AdminShellContent>
    </MobileMenuProvider>
  );
}
