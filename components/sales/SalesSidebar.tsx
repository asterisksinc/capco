"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftFromLine,
  Home,
  ShieldCheck,
  ClipboardList,
  ReceiptText,
  LogOut,
  CheckSquare,
} from "lucide-react";
import Image from "next/image";
import { useLogout } from "@/hooks/useLogout";

export function SalesSidebar() {
  const pathname = usePathname();
  const { handleLogout } = useLogout();

  const navItems = [
    { name: "Overview", href: "/sales/overview", icon: Home },
    { name: "Registered Warranties", href: "/sales/warranties", icon: ShieldCheck },
    { name: "Warranty Claims", href: "/sales/claims", icon: ClipboardList },
    { name: "Invoices / CRM", href: "/sales/invoices", icon: ReceiptText },
  ];

  return (
    <aside className="w-[280px] bg-[#F9FAFB] h-screen hidden md:flex flex-col border-r border-[#EBEBEB] fixed left-0 top-0 font-dm-sans z-20">
      <div className="h-[72px] px-6 flex items-center justify-between border-b border-[#EBEBEB]">
        <div className="flex items-center gap-2">
          <Image src="/logo (2).svg" alt="Capco Capacitors" width={120} height={40} className="w-auto h-8" priority />
        </div>
        <button className="text-[#5C5C5C] hover:bg-gray-100 transition-colors bg-white border border-[#EBEBEB] rounded p-1.5 shadow-sm">
          <ArrowLeftFromLine className="w-4 h-4" />
        </button>
      </div>
      
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`relative flex items-center space-x-3 px-4 py-[12px] rounded-[8px] transition-colors text-[14px] ${
                isActive 
                  ? "bg-[#FFFFFF] text-[#00B6E2] font-medium border border-[#EBEBEB] shadow-sm" 
                  : "text-[#5C5C5C] font-normal hover:bg-[#EAEFF4] hover:text-[#171717] border border-transparent"
              }`}
            >
              {isActive && (
                <div className="absolute left-[-1px] top-1/2 -translate-y-1/2 w-1 h-6 bg-[#00B6E2] rounded-r-md"></div>
              )}
              <item.icon strokeWidth={isActive ? 2 : 1.5} className={`w-5 h-5 ${isActive ? "text-[#00B6E2]" : "text-[#5C5C5C]"}`} />
              <span className={isActive ? "text-[#00B6E2]" : ""}>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-6 border-t border-[#EBEBEB] bg-[#F9FAFB] mt-auto">
        <div className="flex items-center justify-between">
          <div className="flex flex-col overflow-hidden">
            <span className="text-[14px] font-semibold text-[#171717] leading-tight truncate">Capco Capacitors</span>
            <span className="text-[12px] font-normal text-[#5C5C5C] leading-tight truncate mt-1">example@gmail.com</span>
          </div>
          <button
            onClick={handleLogout}
            className="text-[#FB3748] hover:bg-[#FEF2F2] p-2 flex items-center justify-center rounded-[8px] transition-colors flex-shrink-0 border border-[#FB3748]/20 bg-white shadow-sm"
            aria-label="Sign out"
          >
            <LogOut className="w-5 h-5" strokeWidth={2} />
          </button>
        </div>
      </div>
    </aside>
  );
}
