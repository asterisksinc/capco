"use client";

import { Search, Bell, ChevronRight } from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";
import { UserSwitcher } from "@/components/UserSwitcher";
import { TraceButton } from "@/components/TraceButton";

export function SalesTopbar() {
  const pathname = usePathname();

  const getBreadcrumbs = () => {
    const paths = [];
    const segments = pathname.split("/").filter(Boolean);
    
    const salesIndex = segments.findIndex(s => s.toLowerCase() === "sales");
    if (salesIndex !== -1) {
      const relevantSegments = segments.slice(salesIndex + 1);
      
      for (let i = 0; i < relevantSegments.length; i++) {
        const segment = relevantSegments[i];
        let name = "Overview";
        let href = `/sales/${relevantSegments.slice(0, i + 1).join("/")}`;
        
        if (segment === "warranties") name = "Registered Warranties";
        else if (segment === "claims") name = "Warranty Claims";
        else if (segment === "invoices") name = "Invoices / CRM";
        else if (segment === "overview") name = "Overview";
        else name = segment.toUpperCase();
        
        paths.push({ name, href });
      }
    }
    
    if (paths.length === 0) {
      paths.push({ name: "Overview", href: "/sales/overview" });
    }
    
    return paths;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <header className="h-[72px] shrink-0 bg-white border-b border-[#EBEBEB] flex items-center justify-between px-8 font-dm-sans sticky top-0 z-10 w-full">
      <div className="flex items-center gap-2 text-[14px] font-dm-sans">
        <Link href="/sales/overview" className="text-[#5C5C5C] hover:text-[#171717] transition-colors">
          Home
        </Link>
        {breadcrumbs.map((bc, index) => (
          <Fragment key={bc.href}>
            <ChevronRight className="w-4 h-4 text-[#A1A1AA]" />
            {index === breadcrumbs.length - 1 ? (
              <span className="font-semibold text-[#171717]">{bc.name}</span>
            ) : (
              <Link href={bc.href} className="text-[#5C5C5C] hover:text-[#171717] transition-colors">
                {bc.name}
              </Link>
            )}
          </Fragment>
        ))}
      </div>

      <div className="flex items-center gap-4">
        <div className="relative w-[320px] h-[40px] flex items-center border border-[#EBEBEB] rounded-[8px] px-3 gap-2 bg-white shadow-sm">
          <Search className="w-4 h-4 text-[#A1A1AA]" />
          <input
            type="text"
            placeholder="Search"
            className="w-full bg-transparent text-[14px] text-[#171717] placeholder:text-[#A1A1AA] focus:outline-none"
          />
        </div>

        <TraceButton />
        <UserSwitcher />
        <NotificationBell className="w-5 h-5 text-[#171717]" />
      </div>
    </header>
  );
}
