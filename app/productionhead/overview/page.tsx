"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { Search, ChevronDown, Download, Filter, Calendar, Plus, ChevronRight, Menu, Bell, User, X, Info } from "lucide-react";
import { ScannerInput } from "@/components/ScannerInput";
import { MobileHeader } from "@/components/MobileHeader";
import Link from "next/link";
import { exportToExcel } from "@/lib/exportExcel";
import type { EnumFilter, FilterConfig, FilterState } from "@/components/table/FilterPopover";
import { useMobileMenu } from "@/components/MobileMenuContext";
import { workOrderService } from "@/src/services/workOrderService";
import { productOrderService } from "@/src/services/productOrderService";
import { dashboardService } from "@/src/services/dashboardService";
import { Loader2 } from "lucide-react";
import { useStore } from "@/hooks/useStore";

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
        className={`flex items-center gap-2 h-[40px] px-4 bg-white border rounded-[8px] text-[14px] font-medium transition-colors shadow-sm ${hasActiveFilters()
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
  const { setIsMobileMenuOpen } = useMobileMenu();
  const { store, addProductOrder } = useStore();
  const [searchQuery, setSearchQuery] = useState("");

  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const productOrders = store.productOrders;
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [woData, dbStats] = await Promise.all([
        workOrderService.list(),
        dashboardService.productionHead()
      ]);
      setWorkOrders(woData || []);
      setStats(dbStats);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const [sortBy, setSortBy] = useState("name-asc");
  const [isCreateOrderOpen, setIsCreateOrderOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ micron: "", width: "", quantity: "" });
  const [isPOModalOpen, setIsPOModalOpen] = useState(false);
  const [poFormData, setPOFormData] = useState({
    poId: `PO-CC-${String(Date.now()).slice(-4)}`,
    micron: "",
    width: "",
    product: "",
    grade: "",
    specifications: "",
    quantity: "",
    customer: "",
    instructions: "",
  });

  const resetPOForm = () => ({
    poId: `PO-CC-${String(Date.now()).slice(-4)}`,
    micron: "",
    width: "",
    product: "",
    grade: "",
    specifications: "",
    quantity: "",
    customer: "",
    instructions: "",
  });

  const handleCreateProductOrder = async () => {
    if (!poFormData.micron || !poFormData.width || !poFormData.product || !poFormData.quantity) return;

    const nextIdNum = store.productOrders.reduce((maxId, row) => {
      const orderNo = row.id || "";
      const match = orderNo.match(/PO-CC-(\d+)/);
      const parsed = match ? Number.parseInt(match[1], 10) : NaN;
      return Number.isNaN(parsed) ? maxId : Math.max(maxId, parsed);
    }, 0) + 1;
    const newId = `PO-CC-${String(nextIdNum).padStart(4, "0")}`;

    addProductOrder({
      id: newId,
      micron: poFormData.micron,
      width: poFormData.width,
      product: poFormData.product,
      grade: poFormData.grade,
      specifications: poFormData.specifications,
      quantity: poFormData.quantity,
      customer: poFormData.customer,
      instructions: poFormData.instructions,
      status: "Yet to Start",
      stage: "Raw Material",
      timestamp: new Date().toISOString(),
    });

    setIsPOModalOpen(false);
    setPOFormData(resetPOForm());
  };

  const handleCreateWorkOrder = async () => {
    if (!formData.micron || !formData.width || !formData.quantity) return;

    const currentYear = new Date().getFullYear();

    const nextIdNum = workOrders.reduce((maxId, row) => {
      const orderNo = row.work_order_no || row.id || "";
      const match = orderNo.match(/WO-\d{4}-(\d+)/);
      const parsed = match ? Number.parseInt(match[1], 10) : NaN;
      return Number.isNaN(parsed) ? maxId : Math.max(maxId, parsed);
    }, 0) + 1;

    const newId = `WO-${currentYear}-${String(nextIdNum).padStart(3, "0")}`;

    try {
      await workOrderService.create({
        work_order_no: newId,
        micron: Number(formData.micron),
        width_m: Number(formData.width),
        quantity: Number(formData.quantity),
      });
      await loadData();
      setIsModalOpen(false);
      setFormData({ micron: "", width: "", quantity: "" });
    } catch (error) {
      console.error(error);
      alert("Failed to create work order");
    }
  };

  const SORT_OPTIONS = [
    { value: "name-asc", label: "Name (A-Z)" },
    { value: "name-desc", label: "Name (Z-A)" },
  ];

  const STAGE_OPTIONS = ["Raw Material", "Metallisation", "Slitting", "Winding", "Spray", "Epoxy", "Soldering", "Packaging", "QC"];
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

  const formatCardDate = (dateString?: string) => {
    if (!dateString) return "-";
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  };

  const personACards: Card[] = workOrders.filter((wo) => wo.status !== "Completed").map((wo) => ({
    id: wo.work_order_no || wo.id,
    stage: wo.stage || "Raw Material",
    date: formatCardDate(wo.created_at || wo.date),
    status: wo.status || "Yet to Start",
  }));

  const personBCards: Card[] = productOrders.map((po) => ({
    id: po.id,
    stage: po.stage || "Raw Material",
    date: formatCardDate(po.timestamp),
    status: po.status === "Completed" ? "Completed" : po.status === "In-progress" ? "In-progress" : "Yet to Start",
  }));

  const completedWOs = workOrders.filter((wo) => wo.status === "Completed");
  const personCCards: Card[] = completedWOs.map((wo) => ({
    id: wo.work_order_no || wo.id,
    stage: "Epoxy",
    date: formatCardDate(wo.created_at || wo.date),
    status: "Yet to Start",
  })).slice(0, 3);

  const personDCards: Card[] = completedWOs.map((wo) => ({
    id: wo.work_order_no || wo.id,
    stage: "Packaging",
    date: formatCardDate(wo.created_at || wo.date),
    status: "Yet to Start",
  })).slice(0, 3);

  const data: PersonColumn[] = [
    { name: "Person A", cards: personACards },
    { name: "Person B", cards: personBCards },
    { name: "Person C", cards: personCCards },
    { name: "Person D", cards: personDCards },
  ];

  const filteredColumns = useMemo(() => {
    let result = [...data];

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

    result = result.map(col => ({
      ...col,
      cards: col.cards.filter(card => stageFilter.includes(card.stage))
    })).filter(col => col.cards.length > 0);

    result = result.map(col => ({
      ...col,
      cards: col.cards.filter(card => statusFilter.includes(card.status))
    })).filter(col => col.cards.length > 0);

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-72px)] bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-[#00B6E2]" />
      </div>
    );
  }

  const woOpen = stats?.workOrdersOpen || workOrders.filter((w) => w.status !== "Completed").length;
  const poOpen = stats?.productOrdersOpen || productOrders.filter((p) => p.status !== "Completed").length;
  const woCompleted = stats?.workOrders?.completed || workOrders.filter((w) => w.status === "Completed").length;
  const poCompleted = stats?.productOrders?.completed || productOrders.filter((p) => p.status === "Completed").length;

  return (
    <div className="font-dm-sans min-h-[calc(100vh-72px)] bg-white flex flex-col w-full max-w-full">

      {/* MOBILE TOP NAVIGATION BAR */}
      <MobileHeader title="Overview" />

      {/* DESKTOP HEADER */}
      <section className="bg-white border-b border-[#EBEBEB] hidden md:block">
        <div className="px-6 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-[16px] font-medium text-[#171717]">Overview</h1>
            <p className="text-[14px] text-[#5C5C5C]">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit
            </p>
          </div>

          <div className="relative">
            <button
              onClick={() => setIsCreateOrderOpen(!isCreateOrderOpen)}
              className="h-[40px] px-4 flex items-center gap-2 bg-[#00B6E2] text-white rounded-[6px] text-[14px] font-medium"
            >
              <Plus className="w-4 h-4" />
              Create Order
              <ChevronDown className={`w-4 h-4 transition-transform ${isCreateOrderOpen ? 'rotate-180' : ''}`} />
            </button>
            {isCreateOrderOpen && (
              <div className="absolute right-0 top-full mt-1 w-[200px] bg-white border border-[#EBEBEB] rounded-[8px] shadow-lg z-50 overflow-hidden">
                <button
                  onClick={() => { setIsCreateOrderOpen(false); setIsModalOpen(true); }}
                  className="flex items-center justify-between w-full px-4 py-3 text-[14px] text-[#171717] hover:bg-[#F5F7FA] transition-colors"
                >
                  Work Order
                  <ChevronRight className="w-4 h-4 text-[#5C5C5C]" />
                </button>
                <button
                  onClick={() => { setIsCreateOrderOpen(false); setIsPOModalOpen(true); }}
                  className="flex items-center justify-between w-full px-4 py-3 text-[14px] text-[#171717] hover:bg-[#F5F7FA] transition-colors border-t border-[#EBEBEB]"
                >
                  Product Order
                  <ChevronRight className="w-4 h-4 text-[#5C5C5C]" />
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* MOBILE SPACER FOR FIXED HEADER */}
      {/* <div className="hidden sm:block h-14"></div> */}

      {/* MOBILE: PAGE HEADER */}
      <section className="px-4 pt-4 sm:hidden">
        <h1 className="text-[16px] font-medium text-[#171717]">Overview</h1>
        <p className="text-[12px] text-[#5C5C5C] mt-1">
          Lorem ipsum dolor sit amet
        </p>
      </section>

      {/* MOBILE: CREATE ORDER BUTTON */}
      <section className="px-4 mt-4 sm:hidden">
        <button
          onClick={() => setIsCreateOrderOpen(true)}
          className="w-full h-12 bg-[#00B6E2] text-white rounded-xl flex items-center justify-center gap-2 text-[14px] font-medium"
        >
          <Plus className="w-5 h-5" />
          Create Order
        </button>

        {/* MOBILE: CREATE ORDER BOTTOM SHEET */}
        {isCreateOrderOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-50 bg-[#171717]/40 backdrop-blur-sm"
              onClick={() => setIsCreateOrderOpen(false)}
            />

            {/* Bottom Sheet */}
            <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-[20px] shadow-lg animate-slide-up">
              <div className="flex flex-col">
                <div className="w-10 h-1.5 bg-[#E5E5E5] rounded-full mx-auto mt-3 mb-2"></div>

                <button
                  onClick={() => { setIsCreateOrderOpen(false); setIsModalOpen(true); }}
                  className="flex items-center justify-between w-full px-5 py-4 text-[15px] text-[#171717] hover:bg-[#F5F7FA] border-b border-[#EBEBEB]"
                >
                  Work Order
                  <ChevronRight className="w-5 h-5 text-[#5C5C5C]" />
                </button>
                <button
                  onClick={() => { setIsCreateOrderOpen(false); setIsPOModalOpen(true); }}
                  className="flex items-center justify-between w-full px-5 py-4 text-[15px] text-[#171717] hover:bg-[#F5F7FA] border-b border-[#EBEBEB]"
                >
                  Product Order
                  <ChevronRight className="w-5 h-5 text-[#5C5C5C]" />
                </button>

                <button
                  onClick={() => setIsCreateOrderOpen(false)}
                  className="h-14 text-[15px] text-[#5C5C5C] hover:bg-[#F5F7FA]"
                >
                  Cancel
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      {/* MOBILE: KPI CARDS (2x2 grid) */}
      <section className="grid grid-cols-2 gap-0 md:hidden bg-white border border-[#EBEBEB] rounded-[12px]">
        {[
          { title: "Product Orders Open", value: String(poOpen), valClass: "text-[#171717]", subtextClass: "text-[#1CB061] font-semibold", subtext: `${poCompleted} completed` },
          { title: "Work Orders Open", value: String(woOpen), valClass: "text-[#171717]", subtextClass: "text-[#1CB061] font-semibold", subtext: `${woCompleted} completed` },
          { title: "Orders Delayed", value: "0", valClass: "text-[#171717]", subtextClass: "text-[#5C5C5C]", subtext: "All on track" },
          { title: "Dispatch Ready Orders", value: String(woCompleted), valClass: "text-[#171717]", subtextClass: "text-[#1CB061] font-semibold", subtext: "Ready" },
        ].map((stat, i) => (
          <div key={i} className={`p-3 ${i % 2 === 0 ? 'border-r border-b border-[#EBEBEB]' : 'border-b border-[#EBEBEB]'}`}>
            <div className="flex flex-col gap-1">
              <p className="text-[11px] font-medium text-[#5C5C5C]">{stat.title}</p>
              <span className={`text-[16px] font-semibold ${stat.valClass}`}>{stat.value}</span>
              <span className={`text-[10px] ${stat.subtextClass}`}>{stat.subtext}</span>
            </div>
          </div>
        ))}
      </section>

      {/* DESKTOP: STATS */}
      <section className="px-6 py-6 hidden sm:block">
        <div className="bg-white border border-[#EBEBEB] rounded-[12px] p-6 flex items-center gap-4">

          {[
            { label: "Product Orders Open", value: String(poOpen), change: `${productOrders.length} total` },
            { label: "Work Orders Open", value: String(woOpen), change: `${workOrders.length} total` },
            { label: "Orders Delayed", value: "0", change: "All on track" },
            { label: "Dispatch Ready Orders", value: String(woCompleted), change: "Completed" },
          ].map((item, i) => (
            <div key={i} className="flex-1 flex items-center justify-between">
              <div className="flex flex-col gap-1.5">
                <p className="text-[12px] text-[#5C5C5C]">{item.label}</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-[14px] font-semibold text-[#171717]">{item.value}</span>
                  <span className="text-[12px] text-[#5C5C5C]">
                    {item.change}
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

      {/* MOBILE: SEARCH BAR */}
      <section className="px-4 mt-4 sm:hidden">
        <div className="relative">
          <Search className="w-4 h-4 text-[#A1A1AA] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-11 w-full pl-9 pr-3 bg-white border border-[#EBEBEB] rounded-xl text-[14px]"
          />
        </div>
      </section>

      {/* MOBILE: ACTION BUTTONS ROW */}
      <section className="px-4 mt-3 flex gap-2 sm:hidden">
        <div className="relative flex-1">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="h-10 w-full border border-[#EBEBEB] rounded-lg px-3 pr-8 text-[13px]"
          >
            {SORT_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
        <button
          onClick={handleExport}
          className="h-10 px-4 border border-[#00B6E2] text-[#00B6E2] rounded-lg flex items-center gap-2 text-[13px]"
        >
          <Download className="w-4 h-4" />
          Export
        </button>
        <FilterPopover
          config={filterConfig}
          filters={tableFilters}
          onApply={setTableFilters}
        />
      </section>

      {/* DESKTOP: TOOLBAR */}
      <section className="px-6 hidden sm:block">
        <div className="border-t border-[#EBEBEB]"></div>
      </section>

      {/* DESKTOP: TOOLBAR */}
      <section className="px-6 py-4 hidden sm:flex items-center justify-between">

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

      {/* MOBILE: KANBAN COLUMNS (VERTICAL STACK) */}
      <section className="px-4 mt-4 mb-6 sm:hidden">
        <div className="flex flex-col gap-4">

          {filteredColumns.map((col) => (
            <div
              key={col.name}
              className="bg-[#F5F7FA] rounded-2xl p-3"
            >

              {/* COLUMN HEADER */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-[15px] font-semibold text-[#1C1C1D]">
                  {col.name}
                </span>
                <span className="w-5 h-5 flex items-center justify-center rounded-full bg-[#DAE1EC] text-[11px]">
                  {col.cards.length}
                </span>
              </div>

              {/* CARDS */}
              <div className="flex flex-col gap-3">
                {col.cards.map((card) => (
                  <div
                    key={card.id}
                    className="bg-white rounded-xl p-3 shadow-sm"
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-[14px] font-medium text-[#171717]">
                        {card.id}
                      </span>
                      <StatusBadge status={card.status} />
                    </div>

                    <div className="border-t border-[#E7E7E9] my-2"></div>

                    <div className="flex items-center justify-between text-[13px] text-[#5C5C5C]">
                      <span>{card.stage}</span>

                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-[#5C5C5C]" />
                        <span className="text-[#171717] font-medium">
                          {card.date}
                        </span>
                      </div>
                    </div>

                    <Link
                      href={card.id.startsWith("WO") || card.id.includes("WO")
                        ? `/productionhead/workorder/${card.id}`
                        : `/productionhead/productorders/${card.id}`}
                      className="w-full h-10 border border-[#00B6E2] text-[#00B6E2] text-[14px] font-medium rounded-lg flex items-center justify-center mt-3"
                    >
                      View
                    </Link>
                  </div>
                ))}
              </div>

            </div>
          ))}

        </div>
      </section>

      {/* DESKTOP: KANBAN STYLE SCROLL */}
      <section className="px-6 py-6 hidden sm:block">
        <div className="flex gap-4 overflow-x-auto">

          {filteredColumns.map((col) => (
            <div
              key={col.name}
              className="w-[340px] flex-shrink-0 bg-white border border-[#E7E7E9] rounded-[12px] overflow-hidden"
            >

              {/* COLUMN HEADER */}
              <div className="px-5 py-3 bg-[#F5F7FA] border-b border-[#E7E7E9] flex items-center justify-between shrink-0">
                <span className="text-[16px] font-semibold text-[#1C1C1D]">
                  {col.name}
                </span>
                <span className="w-5 h-5 flex items-center justify-center rounded-full bg-[#DAE1EC] text-[12px]">
                  {col.cards.length}
                </span>
              </div>

              {/* CARDS */}
              <div className="p-5 flex flex-col gap-3.5 min-h-[430px]">
                {col.cards.map((card) => (
                  <div
                    key={card.id}
                    className="border border-[#E7E7E9] rounded-[12px] p-3.5 flex flex-col gap-3"
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-[14px] font-medium text-[#171717]">
                        {card.id}
                      </span>
                      <StatusBadge status={card.status} />
                    </div>

                    <div className="border-t border-[#E7E7E9] pt-3 flex items-center justify-between text-[14px] text-[#5C5C5C]">
                      <span>{card.stage}</span>

                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-[#5C5C5C]" />
                        <span className="text-[#171717] font-medium">
                          {card.date}
                        </span>
                      </div>
                    </div>

                    <Link
                      href={card.id.startsWith("WO") || card.id.includes("WO")
                        ? `/productionhead/workorder/${card.id}`
                        : `/productionhead/productorders/${card.id}`}
                      className="h-8 px-3.5 border border-[#00B6E2] text-[#00B6E2] text-[14px] font-medium rounded-[6px] flex items-center justify-center"
                    >
                      View
                    </Link>
                  </div>
                ))}
              </div>

            </div>
          ))}

        </div>
      </section>

      {/* Create Product Order Modal */}
      {isPOModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#171717]/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-[12px] w-full max-w-[700px] flex flex-col overflow-hidden max-h-[90vh]">
            {/* Header */}
            <div className="flex items-start justify-between px-6 py-5 border-b border-[#EBEBEB]">
              <div className="flex flex-col gap-1">
                <h2 className="text-[18px] font-semibold text-[#171717] leading-tight">Add New Product Order</h2>
                <p className="text-[14px] text-[#5C5C5C] leading-tight">Enter product specifications and planning details to create a new order.</p>
              </div>
              <button
                onClick={() => setIsPOModalOpen(false)}
                className="text-[#5C5C5C] hover:text-[#171717] transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex flex-col gap-8 px-6 py-6 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[14px] font-medium text-[#171717]">Product Order ID <span className="text-[#FB3748]">*</span></label>
                  <input type="text" disabled value={poFormData.poId} className="h-[40px] px-3 bg-[#F5F7FA] border border-[#EBEBEB] rounded-[8px] text-[14px] text-[#5C5C5C] focus:outline-none" />
                </div>
                <div className="flex flex-col gap-1.5 relative">
                  <label className="text-[14px] font-medium text-[#171717]">Micron <span className="text-[#FB3748]">*</span></label>
                  <select value={poFormData.micron} onChange={(e) => setPOFormData({ ...poFormData, micron: e.target.value })} className="h-[40px] pl-3 pr-9 bg-white border border-[#EBEBEB] rounded-[8px] text-[14px] text-[#171717] focus:outline-none focus:border-[#00B6E2] appearance-none">
                    <option value="" disabled>Select Micron</option>
                    {["3.5", "4 HT", "4.5 HT", "5.0", "5.5", "5.5 HT", "6.0", "6 HT", "6.5", "6.5 HT", "7.0", "7.5", "8.0", "9.0", "10.0", "12.0"].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-[#5C5C5C] absolute right-3 top-[34px] pointer-events-none" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5 relative">
                  <label className="text-[14px] font-medium text-[#171717]">Width <span className="text-[#FB3748]">*</span></label>
                  <select value={poFormData.width} onChange={(e) => setPOFormData({ ...poFormData, width: e.target.value })} className="h-[40px] pl-3 pr-9 bg-white border border-[#EBEBEB] rounded-[8px] text-[14px] text-[#171717] focus:outline-none focus:border-[#00B6E2] appearance-none">
                    <option value="" disabled>Select Width</option>
                    {["30", "37.5", "45", "50", "60", "75", "100"].map(w => (
                      <option key={w} value={w}>{w}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-[#5C5C5C] absolute right-3 top-[34px] pointer-events-none" />
                </div>
                <div className="flex flex-col gap-1.5 relative">
                  <label className="text-[14px] font-medium text-[#171717]">Product <span className="text-[#FB3748]">*</span></label>
                  <select value={poFormData.product} onChange={(e) => setPOFormData({ ...poFormData, product: e.target.value })} className="h-[40px] pl-3 pr-9 bg-white border border-[#EBEBEB] rounded-[8px] text-[14px] text-[#171717] focus:outline-none focus:border-[#00B6E2] appearance-none">
                    <option value="" disabled>Select Product</option>
                    {["MFD", "PP", "AL", "OIL TYPE", "BOX TYPE", "KVAR", "ROUND"].map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-[#5C5C5C] absolute right-3 top-[34px] pointer-events-none" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5 relative">
                  <label className="text-[14px] font-medium text-[#171717]">Grade <span className="text-[#FB3748]">*</span></label>
                  <select value={poFormData.grade} onChange={(e) => setPOFormData({ ...poFormData, grade: e.target.value })} className="h-[40px] pl-3 pr-9 bg-white border border-[#EBEBEB] rounded-[8px] text-[14px] text-[#171717] focus:outline-none focus:border-[#00B6E2] appearance-none">
                    <option value="" disabled>Select Grade</option>
                    {["AA", "A", "B", "C", "D"].map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-[#5C5C5C] absolute right-3 top-[34px] pointer-events-none" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[14px] font-medium text-[#171717]">Specifications <span className="text-[#FB3748]">*</span></label>
                  <input type="text" placeholder="Enter specs" value={poFormData.specifications} onChange={(e) => setPOFormData({ ...poFormData, specifications: e.target.value })} className="h-[40px] px-3 bg-white border border-[#EBEBEB] rounded-[8px] text-[14px] text-[#171717] focus:outline-none focus:border-[#00B6E2]" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[14px] font-medium text-[#171717]">Quantity <span className="text-[#FB3748]">*</span></label>
                  <input type="number" placeholder="Enter quantity" value={poFormData.quantity} onChange={(e) => setPOFormData({ ...poFormData, quantity: e.target.value })} className="h-[40px] px-3 bg-white border border-[#EBEBEB] rounded-[8px] text-[14px] text-[#171717] focus:outline-none focus:border-[#00B6E2]" />
                </div>
                <div className="flex flex-col gap-1.5 relative">
                  <label className="text-[14px] font-medium text-[#171717]">Customer <span className="text-[#FB3748]">*</span></label>
                  <select value={poFormData.customer} onChange={(e) => setPOFormData({ ...poFormData, customer: e.target.value })} className="h-[40px] pl-3 pr-9 bg-white border border-[#EBEBEB] rounded-[8px] text-[14px] text-[#171717] focus:outline-none focus:border-[#00B6E2] appearance-none">
                    <option value="" disabled>Select Customer</option>
                    {["OEM", "NON OEM"].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-[#5C5C5C] absolute right-3 top-[34px] pointer-events-none" />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[14px] font-medium text-[#171717]">Instructions</label>
                <textarea rows={3} placeholder="Add any special instructions..." value={poFormData.instructions} onChange={(e) => setPOFormData({ ...poFormData, instructions: e.target.value })} className="p-3 bg-white border border-[#EBEBEB] rounded-[8px] text-[14px] text-[#171717] focus:outline-none focus:border-[#00B6E2] resize-none"></textarea>
              </div>

            </div>

            {/* Footer / Action buttons */}
            <div className="flex items-center justify-between px-6 py-5 bg-white border-t border-[#EBEBEB]">
              <button
                onClick={() => setIsPOModalOpen(false)}
                className="h-[40px] px-4 bg-white border border-[#EBEBEB] text-[#171717] text-[14px] font-medium rounded-[6px] hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateProductOrder}
                className="h-[40px] px-5 bg-[#00B6E2] text-white text-[14px] font-medium rounded-[6px] hover:bg-[#0092b5] transition-colors"
              >
                Create Product Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Work Order Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#171717]/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-[12px] w-full max-w-[500px] shadow-lg flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-start justify-between px-6 py-5 border-b border-[#EBEBEB]">
              <div className="flex flex-col gap-1">
                <h2 className="text-[18px] font-semibold text-[#171717] leading-tight">New Work Order</h2>
                <p className="text-[14px] text-[#5C5C5C] leading-tight">Lorem ipsum dolor sit amet, consectetur adipiscing elit</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#5C5C5C] hover:text-[#171717] transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex flex-col gap-5 px-6 py-6 border-b border-[#EBEBEB]">
              {/* Micron Field */}
              <div className="flex flex-col gap-2">
                <label className="text-[12px] font-medium text-[#171717] uppercase tracking-wider">MICRON</label>
                <div className="relative">
                  <select
                    value={formData.micron}
                    onChange={(e) => setFormData({ ...formData, micron: e.target.value })}
                    className="w-full h-[44px] bg-white border border-[#EBEBEB] rounded-[8px] px-3 text-[14px] text-[#171717] appearance-none focus:outline-none focus:border-[#00B6E2] transition-colors"
                  >
                    <option value="" disabled hidden>Select micron...</option>
                    <option value="3.5">3.5 Micron</option>
                    <option value="4">4 Micron</option>
                    <option value="4.5">4.5 Micron</option>
                    <option value="5">5 Micron</option>
                    <option value="5.5">5.5 Micron</option>
                    <option value="6">6 Micron</option>
                    <option value="6.5">6.5 Micron</option>
                    <option value="7">7 Micron</option>
                    <option value="7.5">7.5 Micron</option>
                    <option value="8">8 Micron</option>
                    <option value="9">9 Micron</option>
                    <option value="10">10 Micron</option>
                    <option value="12">12 Micron</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-[#525866] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Width Field */}
              <div className="flex flex-col gap-2">
                <label className="text-[12px] font-medium text-[#171717] uppercase tracking-wider">WIDTH</label>
                <div className="relative">
                  <select
                    value={formData.width}
                    onChange={(e) => setFormData({ ...formData, width: e.target.value })}
                    className="w-full h-[44px] bg-white border border-[#EBEBEB] rounded-[8px] px-3 text-[14px] text-[#171717] appearance-none focus:outline-none focus:border-[#00B6E2] transition-colors"
                  >
                    <option value="" disabled hidden>Select width...</option>
                    <option value="30">30 Width</option>
                    <option value="37.5">37.5 Width</option>
                    <option value="45">45 Width</option>
                    <option value="50">50 Width</option>
                    <option value="60">60 Width</option>
                    <option value="75">75 Width</option>
                    <option value="100">100 Width</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-[#525866] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Quantity Field */}
              <div className="flex flex-col gap-2">
                <label className="text-[12px] font-medium text-[#171717] uppercase tracking-wider">QUANTITY</label>
                <input
                  type="number"
                  placeholder="Enter Quantity"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  className="w-full h-[44px] bg-white border border-[#EBEBEB] rounded-[8px] px-3 text-[14px] text-[#171717] placeholder:text-[#A1A1AA] focus:outline-none focus:border-[#00B6E2] transition-colors"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-6 py-5 bg-[#FAFAFA]">
              <button
                onClick={() => setIsModalOpen(false)}
                className="h-[40px] px-4 bg-white border border-[#EBEBEB] text-[#171717] text-[14px] font-medium rounded-[6px] hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateWorkOrder}
                className="h-[40px] px-5 bg-[#00B6E2] text-white text-[14px] font-medium rounded-[6px] hover:bg-[#0092b5] transition-colors"
              >
                Create Work Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}