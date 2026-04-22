"use client";

import React, { useState, useRef, useEffect } from "react";
import { Filter, ChevronDown } from "lucide-react";

export type EnumFilter = {
  label: string;
  key: string;
  options: string[];
};

export type TextFilter = {
  label: string;
  key: string;
  placeholder?: string;
};

export type NumberRangeFilter = {
  label: string;
  minKey: string;
  maxKey: string;
};

export type DateRangeFilter = {
  label: string;
  key: string;
};

export type FilterConfig = {
  enums?: EnumFilter[];
  texts?: TextFilter[];
  numberRanges?: NumberRangeFilter[];
  dateRanges?: DateRangeFilter[];
};

export type FilterState = Record<string, string | string[]>;

function getDefaultFilters(config: FilterConfig): FilterState {
  const state: FilterState = {};
  config.enums?.forEach((e) => {
    state[e.key] = [...e.options];
  });
  config.texts?.forEach((t) => {
    state[t.key] = "";
  });
  config.numberRanges?.forEach((nr) => {
    state[nr.minKey] = "";
    state[nr.maxKey] = "";
  });
  config.dateRanges?.forEach((d) => {
    state[`${d.key}From`] = "";
    state[`${d.key}To`] = "";
  });
  return state;
}

function hasActiveFilters(config: FilterConfig, state: FilterState): boolean {
  for (const e of config.enums || []) {
    if ((state[e.key] as string[]).length < e.options.length) return true;
  }
  for (const t of config.texts || []) {
    if (state[t.key]) return true;
  }
  for (const nr of config.numberRanges || []) {
    if (state[nr.minKey] || state[nr.maxKey]) return true;
  }
  for (const d of config.dateRanges || []) {
    if (state[`${d.key}From`] || state[`${d.key}To`]) return true;
  }
  return false;
}

export function FilterPopover({
  config,
  filters,
  onApply,
  externalDateRange,
  onExternalDateRangeChange,
}: {
  config: FilterConfig;
  filters: FilterState;
  onApply: (filters: FilterState) => void;
  externalDateRange?: { from: string; to: string };
  onExternalDateRangeChange?: (range: { from: string; to: string }) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState<FilterState>(filters);
  const [localDateRange, setLocalDateRange] = useState(externalDateRange || { from: "", to: "" });
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  useEffect(() => {
    if (externalDateRange) {
      setLocalDateRange(externalDateRange);
    }
  }, [externalDateRange]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMultiSelect = (key: string, option: string) => {
    setLocalFilters((prev) => {
      const current = prev[key] as string[];
      const updated = current.includes(option)
        ? current.filter((v) => v !== option)
        : [...current, option];
      return { ...prev, [key]: updated };
    });
  };

  const handleTextChange = (key: string, value: string) => {
    setLocalFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleApply = () => {
    onApply(localFilters);
    if (onExternalDateRangeChange) {
      onExternalDateRangeChange(localDateRange);
    }
    setIsOpen(false);
  };

  const handleReset = () => {
    setLocalFilters(getDefaultFilters(config));
    setLocalDateRange({ from: "", to: "" });
    if (onExternalDateRangeChange) {
      onExternalDateRangeChange({ from: "", to: "" });
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 h-[40px] px-4 bg-white border rounded-[8px] text-[14px] font-medium transition-colors shadow-sm ${
          hasActiveFilters(config, localFilters)
            ? "border-[#00B6E2] text-[#00B6E2] bg-[#F0FDFF]"
            : "border-[#EBEBEB] text-[#171717] hover:bg-gray-50"
        }`}
      >
        <Filter className="w-4 h-4" />
        Filter
        {hasActiveFilters(config, localFilters) && (
          <span className="w-2 h-2 rounded-full bg-[#00B6E2]" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-[520px] bg-white border border-[#EBEBEB] rounded-[12px] shadow-lg z-50 overflow-hidden">
          <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
            {/* Enum Sections */}
            {config.enums?.map((enumFilter) => (
              <div key={enumFilter.key} className="px-4 py-2.5 border-b border-[#EBEBEB]">
                <h4 className="text-[12px] font-semibold text-[#171717] mb-2">{enumFilter.label}</h4>
                <div className="flex flex-wrap gap-1.5">
                  {enumFilter.options.map((option) => (
                    <label
                      key={option}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#F5F7FA] rounded-[4px] cursor-pointer hover:bg-[#EBEBEB] transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={(localFilters[enumFilter.key] as string[])?.includes(option)}
                        onChange={() => handleMultiSelect(enumFilter.key, option)}
                        className="w-3.5 h-3.5 rounded border-[#D1D5DB] text-[#00B6E2] focus:ring-[#00B6E2]"
                      />
                      <span className="text-[12px] text-[#5C5C5C]">{option}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}

            {/* Text Filters */}
            {config.texts && config.texts.length > 0 && (
              <div className="px-4 py-2.5 border-b border-[#EBEBEB]">
                <h4 className="text-[12px] font-semibold text-[#171717] mb-2">Search Filters</h4>
                <div className={`grid gap-2 ${config.texts.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
                  {config.texts.map((textFilter) => (
                    <div key={textFilter.key}>
                      <label className="text-[11px] text-[#5C5C5C] mb-1 block">{textFilter.label}</label>
                      <input
                        type="text"
                        value={(localFilters[textFilter.key] as string) || ""}
                        onChange={(e) => handleTextChange(textFilter.key, e.target.value)}
                        placeholder={textFilter.placeholder || "Search..."}
                        className="w-full h-[32px] px-2.5 bg-[#F5F7FA] border border-[#EBEBEB] rounded-[4px] text-[12px] text-[#171717] placeholder:text-[#A1A1AA] focus:outline-none focus:border-[#00B6E2]"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Number Range Filters */}
            {config.numberRanges && config.numberRanges.length > 0 && (
              <div className="px-4 py-2.5 border-b border-[#EBEBEB]">
                <h4 className="text-[12px] font-semibold text-[#171717] mb-2">Number Ranges</h4>
                <div className={`grid gap-2 ${config.numberRanges.length === 1 ? "grid-cols-2" : "grid-cols-3"}`}>
                  {config.numberRanges.map((nr) => (
                    <React.Fragment key={nr.minKey}>
                      <div>
                        <label className="text-[11px] text-[#5C5C5C] mb-1 block">{nr.label} Min</label>
                        <input
                          type="number"
                          value={(localFilters[nr.minKey] as string) || ""}
                          onChange={(e) => handleTextChange(nr.minKey, e.target.value)}
                          placeholder="Min"
                          className="w-full h-[32px] px-2.5 bg-[#F5F7FA] border border-[#EBEBEB] rounded-[4px] text-[12px] text-[#171717] placeholder:text-[#A1A1AA] focus:outline-none focus:border-[#00B6E2]"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-[#5C5C5C] mb-1 block">{nr.label} Max</label>
                        <input
                          type="number"
                          value={(localFilters[nr.maxKey] as string) || ""}
                          onChange={(e) => handleTextChange(nr.maxKey, e.target.value)}
                          placeholder="Max"
                          className="w-full h-[32px] px-2.5 bg-[#F5F7FA] border border-[#EBEBEB] rounded-[4px] text-[12px] text-[#171717] placeholder:text-[#A1A1AA] focus:outline-none focus:border-[#00B6E2]"
                        />
                      </div>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}

            {/* Date Range Filters */}
            {config.dateRanges && config.dateRanges.length > 0 && (
              <div className="px-4 py-2.5">
                <h4 className="text-[12px] font-semibold text-[#171717] mb-2">Date Ranges</h4>
                <div className={`grid gap-2 ${config.dateRanges.length === 1 ? "grid-cols-2" : "grid-cols-2"}`}>
                  {config.dateRanges.map((dr) => (
                    <div key={dr.key} className="flex items-center gap-1">
                      <label className="text-[11px] text-[#5C5C5C] w-16 shrink-0">{dr.label}</label>
                      <input
                        type="date"
                        value={localDateRange.from}
                        onChange={(e) => setLocalDateRange({ ...localDateRange, from: e.target.value })}
                        className="flex-1 h-[32px] px-2 bg-[#F5F7FA] border border-[#EBEBEB] rounded-[4px] text-[11px] text-[#5C5C5C] focus:outline-none focus:border-[#00B6E2]"
                      />
                      <span className="text-[#A1A1AA] text-[10px]">-</span>
                      <input
                        type="date"
                        value={localDateRange.to}
                        onChange={(e) => setLocalDateRange({ ...localDateRange, to: e.target.value })}
                        className="flex-1 h-[32px] px-2 bg-[#F5F7FA] border border-[#EBEBEB] rounded-[4px] text-[11px] text-[#5C5C5C] focus:outline-none focus:border-[#00B6E2]"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-[#F9FAFB] border-t border-[#EBEBEB]">
            <button
              onClick={handleReset}
              className="text-[13px] text-[#5C5C5C] font-medium hover:text-[#171717] transition-colors"
            >
              Reset
            </button>
            <button
              onClick={handleApply}
              className="h-[32px] px-5 bg-[#00B6E2] text-white text-[13px] font-medium rounded-[6px] hover:bg-[#0092b5] transition-colors"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function FilterChips({
  config,
  filters,
  onRemove,
}: {
  config: FilterConfig;
  filters: FilterState;
  onRemove: (key: string) => void;
}) {
  const chips: { key: string; label: string; value: string }[] = [];

  config.enums?.forEach((e) => {
    const selected = (filters[e.key] as string[]) || [];
    if (selected.length < e.options.length) {
      chips.push({ key: e.key, label: e.label, value: selected.join(", ") });
    }
  });

  config.texts?.forEach((t) => {
    if (filters[t.key]) {
      chips.push({ key: t.key, label: t.label, value: filters[t.key] as string });
    }
  });

  config.numberRanges?.forEach((nr) => {
    const min = filters[nr.minKey];
    const max = filters[nr.maxKey];
    if (min || max) {
      chips.push({ key: nr.minKey, label: nr.label, value: `${min || "0"} - ${max || "∞"}` });
    }
  });

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <div key={chip.key} className="flex items-center gap-1 px-2 py-1 bg-[#F0FDFF] border border-[#00B6E2]/30 rounded-full text-[12px] text-[#00B6E2]">
          <span>{chip.label}: {chip.value}</span>
          <button onClick={() => onRemove(chip.key)} className="hover:text-[#0092b5]">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}