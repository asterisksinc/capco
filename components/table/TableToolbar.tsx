import React, { useState, useRef, useEffect } from "react";
import { Download, ChevronDown } from "lucide-react";
import { FilterPopover, type FilterConfig, type FilterState } from "./FilterPopover";

export function TableToolbar({
  dateRange,
  onDateRangeChange,
  onExport,
  hasDateCol = true,
  filterConfig,
  filters,
  onApplyFilters,
}: {
  dateRange: { from: string; to: string };
  onDateRangeChange: (range: { from: string; to: string }) => void;
  onExport?: (scope?: "all" | "page") => void;
  hasDateCol?: boolean;
  filterConfig?: FilterConfig;
  filters?: FilterState;
  onApplyFilters?: (filters: FilterState) => void;
}) {
  const [isExportOpen, setIsExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(event.target as Node)) {
        setIsExportOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="flex items-center justify-center sm:justify-end gap-2 sm:gap-3 w-full">
      {hasDateCol && (
        <div className="flex items-center gap-1 sm:gap-2 w-full sm:w-auto">
          <input
            type="date"
            value={dateRange.from}
            onChange={(e) => onDateRangeChange({ ...dateRange, from: e.target.value })}
            className="h-9 sm:h-[40px] flex-1 sm:flex-none w-3 sm:w-24 bg-white border border-[#EBEBEB] rounded-lg sm:rounded-[8px] px-2 sm:px-3 text-[12px] sm:text-[14px] text-[#5C5C5C] focus:outline-none focus:border-[#00B6E2]"
            title="From"
          />
          <span className="text-[#A1A1AA] text-[12px] inline">to</span>
          <input
            type="date"
            value={dateRange.to}
            onChange={(e) => onDateRangeChange({ ...dateRange, to: e.target.value })}
            className="h-9 sm:h-[40px] flex-1 sm:flex-none w-9 sm:w-24 bg-white border border-[#EBEBEB] rounded-lg sm:rounded-[8px] px-2 sm:px-3 text-[12px] sm:text-[14px] text-[#5C5C5C] focus:outline-none focus:border-[#00B6E2]"
            title="To"
          />
          {(dateRange.from || dateRange.to) && (
            <button
              onClick={() => onDateRangeChange({ from: "", to: "" })}
              className="text-[#5C5C5C] hover:text-[#171717] text-[12px] sm:text-[14px] font-medium"
            >
              Clear
            </button>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 sm:w-auto relative">
        {filterConfig && filters && onApplyFilters && (
          <FilterPopover
            config={filterConfig}
            filters={filters}
            onApply={onApplyFilters}
            externalDateRange={dateRange}
            onExternalDateRangeChange={onDateRangeChange}
          />
        )}

        {onExport && (
          <div className="relative" ref={exportRef}>
            <button 
              onClick={() => setIsExportOpen(!isExportOpen)}
              className="flex items-center justify-center gap-2 h-9 sm:h-[40px] px-3 sm:px-4 bg-white border border-[#EBEBEB] rounded-lg sm:rounded-[8px] text-[12px] sm:text-[14px] font-medium text-[#171717] hover:bg-gray-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span className="inline">Export</span>
              <ChevronDown className="w-3 h-3 text-[#A1A1AA] ml-1" />
            </button>
            {isExportOpen && (
              <div className="absolute right-0 top-[calc(100%+4px)] w-[160px] bg-white border border-[#EBEBEB] shadow-lg rounded-[8px] overflow-hidden z-50">
                <button
                  className="w-full text-left px-4 py-2.5 text-[13px] text-[#171717] hover:bg-[#F5F7FA] hover:text-[#00B6E2] font-medium border-b border-[#F5F7FA] transition-colors"
                  onClick={() => {
                    setIsExportOpen(false);
                    onExport("all");
                  }}
                >
                  All Pages
                </button>
                <button
                  className="w-full text-left px-4 py-2.5 text-[13px] text-[#5C5C5C] hover:bg-[#F5F7FA] hover:text-[#00B6E2] transition-colors"
                  onClick={() => {
                    setIsExportOpen(false);
                    onExport("page");
                  }}
                >
                  Current Page
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}