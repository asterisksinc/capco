"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftFromLine,
  LayoutDashboard,
  Calendar,
  BarChart2,
  Share2,
  LogOut,
} from "lucide-react";
import Image from "next/image";

export function SupervisorSidebar() {
  const pathname = usePathname();

  const navItems = [
    { name: "Overview", href: "/supervisor/overview", icon: LayoutDashboard },
    { name: "Work Orders", href: "/supervisor/workorder", icon: Calendar },
    { name: "Stock", href: "/supervisor/stock", icon: BarChart2 },
    { name: "Pipeline", href: "/supervisor/pipeline", icon: Share2 },
  ];

  return (
    <aside className="w-[260px] bg-[#F5F7FA] h-screen hidden md:flex flex-col border-r border-[#EBEBEB] fixed left-0 top-0 font-dm-sans z-20">
      <div className="h-[72px] px-6 flex items-center justify-between border-b border-[#EBEBEB] bg-[#F5F7FA]">
        <div className="flex items-center gap-2">
          {/* Logo Placeholder */}
          <div className="flex flex-col text-[#00B6E2] font-bold text-xl leading-none">
            <span className="tracking-tighter">Capco<sup className="text-xs">&reg;</sup></span>
            <span className="text-[10px] tracking-widest uppercase font-normal mt-0.5">Capacitors</span>
          </div>
        </div>
        <button className="text-[#171717] hover:bg-white transition-colors bg-transparent border border-[#EBEBEB] rounded p-1.5 shadow-sm">
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
              className={`flex items-center space-x-3 px-4 py-[10px] rounded-[6px] transition-colors text-[14px] ${
                isActive 
                  ? "bg-[#FFFFFF] text-[#00A0E3] font-medium border border-[#EBEBEB] shadow-sm" 
                  : "text-[#5C5C5C] font-normal hover:bg-[#EAEFF4] hover:text-[#171717]"
              }`}
            >
              <item.icon strokeWidth={isActive ? 2 : 1.5} className={`w-[18px] h-[18px] ${isActive ? "text-[#00B6E2]" : "text-[#5C5C5C]"}`} />
              <span className={isActive ? "text-[#00B6E2]" : ""}>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-5 border-t border-[#EBEBEB] bg-[#F5F7FA] mt-auto">
        <div className="flex items-center justify-between">
          <div className="flex flex-col overflow-hidden">
            <span className="text-[14px] font-semibold text-[#171717] leading-tight truncate">Capco Capacitors</span>
            <span className="text-[12px] font-normal text-[#5C5C5C] leading-tight truncate mt-1">example@gmail.com</span>
          </div>
          <button
            className="text-[#FB3748] hover:bg-[#FEF2F2] p-2 flex items-center justify-center rounded-[6px] transition-colors flex-shrink-0 border border-[#EBEBEB] bg-white shadow-sm"
            aria-label="Sign out"
          >
            <LogOut className="w-[18px] h-[18px]" strokeWidth={2} />
          </button>
        </div>
      </div>
    </aside>
  );
}
