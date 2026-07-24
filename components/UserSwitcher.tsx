"use client";

import { useState, useRef, useEffect } from "react";
import { Repeat, Shield, UserCircle, UserCheck, Factory, Store, TrendingUp, Receipt } from "lucide-react";
import Link from "next/link";

const userRoles = [
  { label: "Admin", href: "/admin", icon: Shield },
  { label: "Person A ", href: "/person-a", icon: UserCircle },
  { label: "Person A - Metallisation", href: "/person-a-metallisation", icon: UserCircle },
  { label: "Slitting Operator", href: "/slitting-operator", icon: UserCircle },
  { label: "Person A - Slitting", href: "/person-a-slitting", icon: UserCircle },
  { label: "Person B", href: "/person-b", icon: UserCheck },
  { label: "Production Head", href: "/productionhead", icon: Factory },
  { label: "Store Head", href: "/store-head", icon: Store },
  { label: "Sales", href: "/sales", icon: TrendingUp },
  { label: "Accountant", href: "/accountant", icon: Receipt },
];

export function UserSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-[40px] h-[40px] flex items-center justify-center border border-[#EBEBEB] rounded-[6px] bg-white transition-colors hover:bg-gray-50"
      >
        <Repeat className="w-5 h-5 text-[#171717]" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-[200px] bg-white border border-[#EBEBEB] rounded-[8px] shadow-lg py-2 z-50">
          {userRoles.map((role) => (
            <Link
              key={role.href}
              href={role.href}
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-[14px] text-[#171717] hover:bg-[#F5F7FA] transition-colors"
            >
              <role.icon className="w-4 h-4 text-[#5C5C5C]" />
              <span>{role.label}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
