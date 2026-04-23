"use client";

import { Menu, Bell, User } from "lucide-react";
import { useMobileMenu } from "@/components/MobileMenuContext";

export function MobileHeader({ title }: { title: string }) {
  const { setIsMobileMenuOpen } = useMobileMenu();

  return (
    <section className="fixed top-0 left-0 right-0 h-14 bg-white border-b border-[#EBEBEB] px-4 flex items-center justify-between z-40 md:hidden">
      <button className="p-2 -ml-2" onClick={() => setIsMobileMenuOpen(true)}>
        <Menu className="w-5 h-5 text-[#171717]" />
      </button>
      <h1 className="text-[16px] font-medium text-[#171717]">{title}</h1>
      <div className="flex items-center gap-3">
        <button className="p-2">
          <Bell className="w-5 h-5 text-[#171717]" />
        </button>
        <div className="w-8 h-8 rounded-full bg-[#F5F7FA] flex items-center justify-center">
          <User className="w-4 h-4 text-[#5C5C5C]" />
        </div>
      </div>
    </section>
  );
}

export function MobileSpacer() {
  return <div className="hidden md:block h-14"></div>;
}