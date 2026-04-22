"use client";

import React, { useState, useRef, useEffect } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Filter } from "lucide-react";
import type { ColumnConfig } from "@/hooks/useTableControls";

export function SortableHeader<T>({
  column,
  sortConfig,
  onSort,
  filters = {},
  onFilterChange,
  className = "",
}: {
  column: ColumnConfig<T>;
  sortConfig: { key: keyof T; direction: "asc" | "desc" } | null;
  onSort: (key: keyof T) => void;
  filters?: Record<string, string>;
  onFilterChange?: (key: string, value: string) => void;
  className?: string;
}) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const isSorted = sortConfig?.key === column.key;
  const direction = sortConfig?.direction;
  const activeFilterValue = filters[String(column.key)] || "";

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    }
    if (isFilterOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isFilterOpen]);

  const hasFilter = !!column.filter && !!column.options;

  return (
    <div className={`relative flex items-center gap-1.5 ${className}`}>
      {column.sortable ? (
        <button
          onClick={() => onSort(column.key as keyof T)}
          className="flex items-center gap-1.5 text-[14px] font-semibold text-[#171717] hover:text-[#00B6E2] transition-colors"
        >
          {column.label}
          <span className="text-[#A1A1AA]">
            {isSorted ? (
              direction === "asc" ? <ArrowUp className="w-3.5 h-3.5 text-[#00B6E2]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#00B6E2]" />
            ) : (
              <ArrowUpDown className="w-3.5 h-3.5" />
            )}
          </span>
        </button>
      ) : (
        <span className="text-[14px] font-semibold text-[#171717]">{column.label}</span>
      )}

      {hasFilter && (
        <div className="relative" ref={filterRef}>
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`flex items-center justify-center p-1 rounded-md transition-colors ${
              activeFilterValue ? "text-[#00B6E2] bg-blue-50" : "text-[#A1A1AA] hover:text-[#171717] hover:bg-gray-100"
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
          </button>

          {isFilterOpen && (
            <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-[#EBEBEB] rounded-[8px] shadow-lg z-50 text-left overflow-hidden">
              <div 
                onClick={() => {
                  onFilterChange?.(String(column.key), "");
                  setIsFilterOpen(false);
                }}
                className={`px-4 py-2 text-[13px] cursor-pointer hover:bg-gray-50 transition-colors ${!activeFilterValue ? 'font-medium text-[#00B6E2]' : 'text-[#5C5C5C]'}`}
              >
                All
              </div>
              {column.options?.map((opt) => (
                <div
                  key={opt}
                  onClick={() => {
                    onFilterChange?.(String(column.key), opt);
                    setIsFilterOpen(false);
                  }}
                  className={`px-4 py-2 text-[13px] cursor-pointer hover:bg-gray-50 transition-colors border-t border-gray-50 ${activeFilterValue === opt ? 'font-medium text-[#00B6E2]' : 'text-[#5C5C5C]'}`}
                >
                  {opt}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
