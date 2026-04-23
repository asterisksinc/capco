"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { Search, ChevronDown, Download, Filter, Calendar, Plus } from "lucide-react";
import { exportToExcel } from "@/lib/exportExcel";
import type { EnumFilter, FilterConfig, FilterState } from "@/components/table/FilterPopover";

function FilterPopover({
  config,
  filters,
  onApply,
}: {
  config: FilterConfig;
  filters: FilterState;
  onApply: (filters: FilterState) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState<FilterState>(filters);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

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

  const handleApply = () => {
    onApply(localFilters);
    setIsOpen(false);
  };

  const handleReset = () => {
    const defaultFilters: FilterState = {};
    config.enums?.forEach((e) => {
      defaultFilters[e.key] = [...e.options];
    });
    setLocalFilters(defaultFilters);
  };

  const hasActiveFilters = () => {
    for (const e of config.enums || []) {
      if ((localFilters[e.key] as string[])?.length < e.options.length) return true;
    }
    return false;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 h-[40px] px-4 bg-white border rounded-[8px] text-[14px] font-medium transition-colors shadow-sm ${
          hasActiveFilters()
            ? "border-[#00B6E2] text-[#00B6E2] bg-[#F0FDFF]"
            : "border-[#EBEBEB] text-[#171717] hover:bg-gray-50"
        }`}
      >
        <Filter className="w-4 h-4" />
        Filter
        {hasActiveFilters() && <span className="w-2 h-2 rounded-full bg-[#00B6E2]" />}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-[480px] bg-white border border-[#EBEBEB] rounded-[12px] shadow-lg z-50 overflow-hidden">
          <div className="max-h-[400px] overflow-y-auto p-4">
            {config.enums?.map((enumFilter) => (
              <div key={enumFilter.key} className="mb-4 last:mb-0">
                <h4 className="text-[12px] font-semibold text-[#171717] mb-2">{enumFilter.label}</h4>
                <div className="flex flex-wrap gap-2">
                  {enumFilter.options.map((option) => (
                    <label
                      key={option}
                      className="flex items-center gap-2 px-3 py-1.5 bg-[#F5F7FA] rounded-[6px] cursor-pointer hover:bg-[#EBEBEB] transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={(localFilters[enumFilter.key] as string[])?.includes(option)}
                        onChange={() => handleMultiSelect(enumFilter.key, option)}
                        className="w-4 h-4 rounded border-[#D1D5DB] text-[#00B6E2] focus:ring-[#00B6E2]"
                      />
                      <span className="text-[13px] text-[#5C5C5C]">{option}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between px-4 py-3 bg-[#F9FAFB] border-t border-[#EBEBEB]">
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

// Reuse SAME StatusBadge (DO NOT CHANGE)
function StatusBadge({ status }: { status: string }) {
  if (status === "Yet to Start") {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-[12px] bg-[#FFF0F1] text-[#FB3748] text-[12px] font-medium">Yet to Start</span>;
  }
  if (status === "In-progress") {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-[12px] bg-[#FFF4ED] text-[#E19242] text-[12px] font-medium">In-progress</span>;
  }
  if (status === "Completed") {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-[12px] bg-[#E8F8F0] text-[#1CB061] text-[12px] font-medium">Completed</span>;
  }
  return <span className="px-2 py-0.5 rounded-[12px] bg-gray-100 text-gray-700 text-[12px]">{status}</span>;
}

type Card = {
  id: string;
  stage: string;
  date: string;
  status: string;
};

type PersonColumn = {
  name: string;
  cards: Card[];
};

export default function OverviewPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("name-asc");
  
  const SORT_OPTIONS = [
    { value: "name-asc", label: "Name (A-Z)" },
    { value: "name-desc", label: "Name (Z-A)" },
  ];

  const STAGE_OPTIONS = ["Metallisation", "Slitting", "Winding", "Spray", "Epoxy", "Soldering", "Packaging", "QC"];
  const STATUS_OPTIONS = ["Yet to Start", "In-progress", "Completed"];
  
  const [tableFilters, setTableFilters] = useState<FilterState>(() => {
    const filters: FilterState = {};
    filters.stage = [...STAGE_OPTIONS];
    filters.status = [...STATUS_OPTIONS];
    return filters;
  });

  const filterConfig: FilterConfig = {
    enums: [
      { label: "Stage", key: "stage", options: STAGE_OPTIONS },
      { label: "Status", key: "status", options: STATUS_OPTIONS },
    ],
  };

  const stageFilter = (tableFilters.stage as string[]) || STAGE_OPTIONS;
  const statusFilter = (tableFilters.status as string[]) || STATUS_OPTIONS;
  
  const data: PersonColumn[] = [
    {
      name: "Person A",
      cards: [
        { id: "WO-0001", stage: "Metallisation", date: "10/01/2025", status: "Yet to Start" },
        { id: "WO-0002", stage: "Slitting", date: "10/01/2025", status: "Yet to Start" },
      ],
    },
    {
      name: "Person B",
      cards: [
        { id: "#PO-CC-4567", stage: "Winding", date: "10/01/2025", status: "In-progress" },
        { id: "#PO-CC-4567", stage: "Spray", date: "10/01/2025", status: "Completed" },
      ],
    },
    {
      name: "Person C",
      cards: [
        { id: "#PO-CC-4567", stage: "Epoxy", date: "10/01/2025", status: "In-progress" },
        { id: "#PO-CC-4567", stage: "Soldering", date: "10/01/2025", status: "In-progress" },
      ],
    },
    {
      name: "Person D",
      cards: [
        { id: "#PO-CC-8901", stage: "Packaging", date: "11/01/2025", status: "Completed" },
        { id: "#PO-CC-8902", stage: "QC", date: "11/01/2025", status: "Yet to Start" },
      ],
    },
  ];

  const filteredColumns = useMemo(() => {
    let result = [...data];
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.map(col => ({
        ...col,
        cards: col.cards.filter(card => 
          card.id.toLowerCase().includes(query) ||
          card.stage.toLowerCase().includes(query)
        )
      })).filter(col => col.cards.length > 0);
    }
    
    // Filter by stage
    result = result.map(col => ({
      ...col,
      cards: col.cards.filter(card => stageFilter.includes(card.stage))
    })).filter(col => col.cards.length > 0);
    
    // Filter by status
    result = result.map(col => ({
      ...col,
      cards: col.cards.filter(card => statusFilter.includes(card.status))
    })).filter(col => col.cards.length > 0);
    
    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "name-desc":
          return b.name.localeCompare(a.name);
        default:
          return 0;
      }
    });
    
    return result;
  }, [data, searchQuery, sortBy, stageFilter, statusFilter]);

  const handleExport = () => {
    const exportData: Record<string, string>[] = [];
    filteredColumns.forEach(col => {
      col.cards.forEach(card => {
        exportData.push({
          "Person": col.name,
          "Order ID": card.id,
          "Stage": card.stage,
          "Date": card.date,
          "Status": card.status,
        });
      });
    });
    exportToExcel(exportData, "overview-data", "Overview");
  };

  const stats = useMemo(() => [
    { label: "Product Orders Open", value: "124", change: "5%" },
    { label: "Work Orders Open", value: "42", change: "+0.2%" },
    { label: "Orders Delayed", value: "15", change: "+0.2%" },
    { label: "Dispatch Ready Orders", value: "15", change: "+0.2%" },
  ], []);
  
  const totalCards = filteredColumns.reduce((sum, col) => sum + col.cards.length, 0);
  
  return (
    <div className="font-dm-sans min-h-[calc(100vh-72px)] bg-[#FAFAFA] flex flex-col">

      {/* HEADER */}
      <section className="bg-white border-b border-[#EBEBEB]">
        <div className="px-6 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-[16px] font-medium text-[#171717]">Overview</h1>
            <p className="text-[14px] text-[#5C5C5C]">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit
            </p>
          </div>

          <button className="h-[40px] px-4 flex items-center gap-2 bg-[#00B6E2] text-white rounded-[6px] text-[14px] font-medium">
            <Plus className="w-4 h-4" />
            Create Order
          </button>
        </div>
      </section>

      {/* STATS */}
      <section className="px-6 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-4 bg-white border border-[#EBEBEB] rounded-[12px] p-5 shadow-sm">
          
          {[
            { label: "Product Orders Open", value: "124", change: "5%" },
            { label: "Work Orders Open", value: "42", change: "+0.2%" },
            { label: "Orders Delayed", value: "15", change: "+0.2%" },
            { label: "Dispatch Ready Orders", value: "15", change: "+0.2%" },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between px-6 py-2 sm:py-0">
              <div className="flex flex-col gap-[6px]">
                <p className="text-[12px] text-[#5C5C5C]">{item.label}</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-[14px] font-semibold text-[#171717]">{item.value}</span>
                  <span className="text-[12px] text-[#1CB061] font-semibold">
                    {item.change} vs Last Month
                  </span>
                </div>
              </div>
              {i < 3 && (
                <div className="hidden sm:block w-[1px] h-[37px] bg-[#EAECF0]"></div>
              )}
            </div>
          ))}

        </div>
      </section>

      {/* TOOLBAR */}
      <section className="px-6">
        <div className="border-t border-[#EBEBEB]"></div>
      </section>

      {/* TOOLBAR */}
      <section className="px-6 py-4 flex items-center justify-between">

        <div className="relative w-[320px]">
          <Search className="w-4 h-4 text-[#A1A1AA] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            placeholder="Search by order ID or stage..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-[40px] w-full pl-9 border border-[#EBEBEB] rounded-[8px] text-[14px]"
          />
        </div>

        <div className="flex items-center gap-3">
          
          <div className="relative">
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="h-[40px] border border-[#EBEBEB] rounded-[8px] px-3 pr-8 text-[14px]"
            >
              {SORT_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <button 
            onClick={handleExport}
            className="h-[40px] px-4 border border-[#00B6E2] text-[#00B6E2] rounded-[6px] flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </button>

          <FilterPopover
            config={filterConfig}
            filters={tableFilters}
            onApply={setTableFilters}
          />

        </div>
      </section>

      {/* ✅ KANBAN STYLE SCROLL */}
      <section className="px-6 py-6 overflow-x-auto">
        <div className="flex gap-4 min-w-max">

          {filteredColumns.map((col) => (
            <div
              key={col.name}
              className="w-[320px] flex-shrink-0 bg-white border border-[#EBEBEB] rounded-[12px] overflow-hidden"
            >

              {/* COLUMN HEADER */}
              <div className="px-5 py-3.5 bg-[#F5F7FA] border-b border-[#EBEBEB] flex items-center gap-2">
                <span className="text-[14px] font-semibold text-[#171717]">
                  {col.name}
                </span>
                <span className="w-[22px] h-[22px] flex items-center justify-center rounded-full bg-[#EBEBEB] text-[12px]">
                  {col.cards.length}
                </span>
              </div>

              {/* CARDS */}
              <div className="p-4 flex flex-col gap-4 min-h-[360px]">
                {col.cards.map((card) => (
                  <div
                    key={card.id}
                    className="border border-[#EBEBEB] rounded-[8px] p-4 flex flex-col gap-3"
                  >
                    <div className="flex justify-between">
                      <span className="text-[14px] font-semibold text-[#171717]">
                        {card.id}
                      </span>
                      <StatusBadge status={card.status} />
                    </div>

                    <div className="border-t border-[#EBEBEB] pt-3 flex items-center justify-between text-[12px] text-[#5C5C5C]">
                      <span>{card.stage}</span>

                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-[#A1A1AA]" />
                        <span className="text-[#171717] font-medium">
                          {card.date}
                        </span>
                      </div>
                    </div>

                    <button className="h-[34px] rounded-[8px] border border-[#00B6E2] text-[#00B6E2] text-[14px] font-medium">
                      View
                    </button>
                  </div>
                ))}
              </div>

            </div>
          ))}

        </div>
      </section>
    </div>
  );
}