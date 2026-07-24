"use client";

import { Search, Bell, ChevronRight } from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";
import { UserSwitcher } from "@/components/UserSwitcher";
import { TraceButton } from "@/components/TraceButton";

export function PersonBTopbar() {
  const pathname = usePathname();

  // Create breadcrumb from pathname
  const getBreadcrumbs = () => {
    const paths = [];
    const segments = pathname.split("/").filter(Boolean);
    
    const PersonBIndex = segments.indexOf("person-b");
    if (PersonBIndex !== -1) {
      const relevantSegments = segments.slice(PersonBIndex + 1);
      
      for (let i = 0; i < relevantSegments.length; i++) {
        const segment = relevantSegments[i];
        let name = "Overview";
        let href = `/person-b/${relevantSegments.slice(0, i + 1).join("/")}`;
        
        if (segment === "workorder") name = "Work Orders";
        else if (segment === "stock") name = "Stock";
        else if (segment === "pipeline") name = "Pipeline";
        else if (segment === "overview") name = "Overview";
        else name = segment.toUpperCase(); // For IDs like WO-0001
        
        paths.push({ name, href });
      }
    }
    
    if (paths.length === 0) {
      paths.push({ name: "Overview", href: "/person-b/overview" });
    }
    
    return paths;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <header className="hidden md:flex h-[72px] shrink-0 bg-white border-b border-[#EBEBEB] items-center justify-between px-4 md:px-6 font-dm-sans sticky top-0 z-10 w-full">
      <div className="flex items-center gap-1 text-[12px] font-dm-sans">
        <Link href="/person-b/overview" className="text-[#5C5C5C] hover:text-[#171717] transition-colors">
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
        {/* Search */}
        <div className="hidden lg:flex relative w-[291px] h-[40px] items-center border border-[#EBEBEB] rounded-[6px] px-[10px] gap-2 bg-white">
          <Search className="w-5 h-5 text-[#525866]" />
          <input
            type="text"
            placeholder="Search"
            className="w-full bg-transparent text-[14px] text-[#171717] placeholder:text-[#525866] focus:outline-none"
          />
        </div>

        {/* Trace */}
        <TraceButton />
        {/* Notifications */}
        <UserSwitcher />
        <NotificationBell className="w-5 h-5 text-[#171717]" />
      </div>
    </header>
  );
}


