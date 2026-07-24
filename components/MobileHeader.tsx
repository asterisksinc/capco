"use client";

import { Menu, Bell, Fingerprint } from "lucide-react";
import { useState } from "react";
import { useMobileMenu } from "@/components/MobileMenuContext";
import { NotificationBell } from "@/components/NotificationBell";
import { UserSwitcher } from "@/components/UserSwitcher";
import { useStore } from "@/hooks/useStore";
import { UniversalTraceModal } from "@/components/UniversalTraceModal";

export function MobileHeader({ title, showMenu = true }: { title: string; showMenu?: boolean }) {
  const { setIsMobileMenuOpen } = useMobileMenu();
  const { store } = useStore();
  const [traceOpen, setTraceOpen] = useState(false);

  return (
    <section className="fixed top-0 left-0 right-0 h-14 bg-white border-b border-[#EBEBEB] px-4 flex items-center justify-between z-40 md:hidden">
      {showMenu ? (
        <button className="p-2 -ml-2" onClick={() => setIsMobileMenuOpen(true)}>
          <Menu className="w-5 h-5 text-[#171717]" />
        </button>
      ) : (
        <div className="w-9" />
      )}
      <h1 className="text-[16px] font-medium text-[#171717]">{title}</h1>
      <div className="flex items-center gap-3">
        <button className="p-2" onClick={() => setTraceOpen(true)}>
          <Fingerprint className="w-5 h-5 text-[#171717]" />
        </button>
        <NotificationBell />
        <UserSwitcher />
      </div>
      {traceOpen && (
        <UniversalTraceModal
          store={store}
          onClose={() => setTraceOpen(false)}
        />
      )}
    </section>
  );
}

export function MobileSpacer() {
  return <div className="hidden md:block h-14"></div>;
}