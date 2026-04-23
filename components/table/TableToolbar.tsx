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
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-end gap-2 sm:gap-3 w-full">
      {hasDateCol && (
        <div className="flex items-center gap-1 sm:gap-2 w-full sm:w-auto">
          <input
            type="date"
            value={dateRange.from}
            onChange={(e) => onDateRangeChange({ ...dateRange, from: e.target.value })}
            className="h-9 sm:h-[40px] flex-1 sm:flex-none w-full sm:w-24 bg-white border border-[#EBEBEB] rounded-lg sm:rounded-[8px] px-2 sm:px-3 text-[12px] sm:text-[14px] text-[#5C5C5C] focus:outline-none focus:border-[#00B6E2]"
            title="From"
          />
          <span className="text-[#A1A1AA] text-[12px] hidden sm:inline">to</span>
          <input
            type="date"
            value={dateRange.to}
            onChange={(e) => onDateRangeChange({ ...dateRange, to: e.target.value })}
            className="h-9 sm:h-[40px] flex-1 sm:flex-none w-full sm:w-24 bg-white border border-[#EBEBEB] rounded-lg sm:rounded-[8px] px-2 sm:px-3 text-[12px] sm:text-[14px] text-[#5C5C5C] focus:outline-none focus:border-[#00B6E2]"
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

      <div className="flex items-center gap-2 w-full sm:w-auto">
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
          className="flex items-center justify-center gap-2 h-9 sm:h-[40px] px-3 sm:px-4 bg-white border border-[#EBEBEB] rounded-lg sm:rounded-[8px] text-[12px] sm:text-[14px] font-medium text-[#171717] hover:bg-gray-50 transition-colors"
        >
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">Export</span>
        </button>
      </div>
    </div>
  );
}