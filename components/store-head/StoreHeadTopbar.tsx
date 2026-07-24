"use client";

import { Search, Bell, ChevronRight } from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";
import { UserSwitcher } from "@/components/UserSwitcher";
import { TraceButton } from "@/components/TraceButton";

export function StoreHeadTopbar() {
  const pathname = usePathname();

  const getBreadcrumbs = () => {
    const paths = [];
    const segments = pathname.split("/").filter(Boolean);
    
    const StoreHeadIndex = segments.indexOf("StoreHead");
    if (StoreHeadIndex !== -1) {
      const relevantSegments = segments.slice(StoreHeadIndex + 1);
      
      for (let i = 0; i < relevantSegments.length; i++) {
        const segment = relevantSegments[i];
        let name = "Overview";
        let href = `/store-head/${relevantSegments.slice(0, i + 1).join("/")}`;
        
        if (segment === "workorder") name = "Work Orders";
        else if (segment === "stock") name = "Stock";
        else if (segment === "pipeline") name = "Pipeline";
        else if (segment === "overview") name = "Overview";
        else name = segment.toUpperCase();
        
        paths.push({ name, href });
      }
    }
    
    if (paths.length === 0) {
      paths.push({ name: "Overview", href: "/store-head/overview" });
    }
    
    return paths;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <header className="h-[72px] shrink-0 bg-white border-b border-[#EBEBEB] hidden md:flex items-center justify-between px-6 font-dm-sans sticky top-0 z-10 w-full">
      <div className="flex items-center gap-1 text-[12px] font-dm-sans">
        <Link href="/store-head/overview" className="text-[#5C5C5C] hover:text-[#171717] transition-colors">
          Home
        </Link>
        {breadcrumbs.map((bc, index) => (
          <Fragment key={bc.href}>
            <ChevronRight className="w-[14px] h-[14px] text-[#5C5C5C]" />
            {index === breadcrumbs.length - 1 ? (
              <span className="font-medium text-[#171717]">{bc.name}</span>
            ) : (
              <Link href={bc.href} className="text-[#5C5C5C] hover:text-[#171717] transition-colors">
                {bc.name}
              </Link>
            )}
          </Fragment>
        ))}
      </div>

      <div className="flex items-center gap-4">
        <div className="relative w-[291px] h-[40px] hidden lg:flex items-center border border-[#EBEBEB] rounded-[6px] px-[10px] gap-2 bg-white">
          <Search className="w-5 h-5 text-[#525866]" />
          <input
            type="text"
            placeholder="Search"
            className="w-full bg-transparent text-[14px] text-[#171717] placeholder:text-[#525866] focus:outline-none"
          />
        </div>

        <TraceButton />
        <UserSwitcher />
        <NotificationBell className="w-5 h-5 text-[#171717]" />
      </div>
    </header>
  );
}
