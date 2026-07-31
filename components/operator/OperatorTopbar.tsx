"use client";

import { Search, Bell, ChevronRight } from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";
import { UserSwitcher } from "@/components/UserSwitcher";
import { TraceButton } from "@/components/TraceButton";

export function OperatorTopbar() {
  const pathname = usePathname();

  // Create breadcrumb from pathname
  const getBreadcrumbs = () => {
    const paths = [];
    const segments = pathname.split("/").filter(Boolean);
    
    const basePaths = ["person-a", "person-a-slitting", "person-a-metallisation", "slitting-operator", "person-b-winding", "spray-operator", "spray-qc"];
    const baseIndex = segments.findIndex(seg => basePaths.includes(seg));
    
    if (baseIndex !== -1) {
      const basePath = segments[baseIndex];
      const relevantSegments = segments.slice(baseIndex + 1);
      
      for (let i = 0; i < relevantSegments.length; i++) {
        const segment = relevantSegments[i];
        let name = "Overview";
        let href = `/${basePath}/${relevantSegments.slice(0, i + 1).join("/")}`;
        
        if (segment === "workorder") name = "Work Orders";
        else if (segment === "productorder") name = "Product Orders";
        else if (segment === "stock") name = "Stock";
        else if (segment === "pipeline") name = "Pipeline";
        else if (segment === "overview") name = "Overview";
        else if (segment === "material-returns") name = "Material Returns";
        else if (segment === "material-requests") name = "Material Requests";
        else name = segment.toUpperCase(); // For IDs like WO-0001
        
        paths.push({ name, href });
      }
      
      if (paths.length === 0) {
        paths.push({ name: "Overview", href: `/${basePath}/overview` });
      }
    } else {
      paths.push({ name: "Overview", href: "/person-a/overview" });
    }
    
    return paths;
  };

  const breadcrumbs = getBreadcrumbs();
  const homeHref = breadcrumbs.length > 0 && breadcrumbs[0].href.includes("/slitting-operator") 
    ? "/slitting-operator/workorder" 
    : breadcrumbs.length > 0 && breadcrumbs[0].href.includes("/person-a-metallisation")
    ? "/person-a-metallisation/workorder"
    : breadcrumbs.length > 0 && breadcrumbs[0].href.includes("/person-a-slitting")
    ? "/person-a-slitting/workorder"
    : breadcrumbs.length > 0 && breadcrumbs[0].href.includes("/person-b-winding")
    ? "/person-b-winding/productorder"
    : breadcrumbs.length > 0 && breadcrumbs[0].href.includes("/spray-operator")
    ? "/spray-operator/productorder"
    : breadcrumbs.length > 0 && breadcrumbs[0].href.includes("/spray-qc")
    ? "/spray-qc/productorder"
    : "/person-a/overview";

  return (
    <header className="h-[72px] shrink-0 bg-white border-b border-[#EBEBEB] hidden md:flex items-center justify-between px-4 md:px-6 font-dm-sans sticky top-0 z-10 w-full">
      <div className="flex items-center gap-1 text-[12px] font-dm-sans">
        <Link href={homeHref} className="text-[#5C5C5C] hover:text-[#171717] transition-colors">
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
        <div className="relative w-[291px] h-[40px] hidden lg:flex items-center border border-[#EBEBEB] rounded-[6px] px-[10px] gap-2 bg-white">
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


