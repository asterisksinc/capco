import React from "react";
import { Download } from "lucide-react";
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
  onExport?: () => void;
  hasDateCol?: boolean;
  filterConfig?: FilterConfig;
  filters?: FilterState;
  onApplyFilters?: (filters: FilterState) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-3 w-full sm:w-auto ml-auto">
      {hasDateCol && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateRange.from}
            onChange={(e) => onDateRangeChange({ ...dateRange, from: e.target.value })}
            className="h-[40px] bg-white border border-[#EBEBEB] rounded-[8px] px-3 text-[14px] text-[#5C5C5C] focus:outline-none focus:border-[#00B6E2]"
            title="From Date"
          />
          <span className="text-[#A1A1AA] text-[14px]">to</span>
          <input
            type="date"
            value={dateRange.to}
            onChange={(e) => onDateRangeChange({ ...dateRange, to: e.target.value })}
            className="h-[40px] bg-white border border-[#EBEBEB] rounded-[8px] px-3 text-[14px] text-[#5C5C5C] focus:outline-none focus:border-[#00B6E2]"
            title="To Date"
          />
          {(dateRange.from || dateRange.to) && (
            <button
              onClick={() => onDateRangeChange({ from: "", to: "" })}
              className="text-[#5C5C5C] hover:text-[#171717] text-[14px] font-medium"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {filterConfig && filters && onApplyFilters && (
        <FilterPopover
          config={filterConfig}
          filters={filters}
          onApply={onApplyFilters}
          externalDateRange={dateRange}
          onExternalDateRangeChange={onDateRangeChange}
        />
      )}

      <button 
        onClick={onExport}
        className="flex items-center gap-2 h-[40px] px-4 bg-white border border-[#EBEBEB] rounded-[8px] text-[14px] font-medium text-[#171717] hover:bg-gray-50 transition-colors shadow-sm ml-2"
      >
        <Download className="w-4 h-4 text-[#5C5C5C]" />
        Export
      </button>
    </div>
  );
}