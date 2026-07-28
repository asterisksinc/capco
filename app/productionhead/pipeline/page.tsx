"use client";

import { useMemo, useState } from "react";
import {
  Search,
  ChevronDown,
  Download,
  Filter,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { TableConfig } from "@/hooks/useTableControls";
import { TablePagination } from "@/components/table/TablePagination";
import { useTableControls } from "@/hooks/useTableControls";
import { SortableHeader } from "@/components/table/SortableHeader";
import { TableToolbar } from "@/components/table/TableToolbar";
import { FilterPopover, FilterChips, type FilterConfig, type FilterState, type EnumFilter } from "@/components/table/FilterPopover";
import { MobileHeader, MobileSpacer } from "@/components/MobileHeader";
import { useEffect } from "react";
import { workOrderService } from "@/src/services/workOrderService";
import { productOrderService } from "@/src/services/productOrderService";
import { Loader2 } from "lucide-react";
// Reusing StatusBadge exactly as established in your design system
function StatusBadge({ status }: { status: string }) {
  if (status === "Yet to Start") {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-[12px] bg-[#FFF0F1] text-[#FB3748] text-[12px] font-medium leading-tight">Yet to Start</span>;
  }
  if (status === "In-progress") {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-[12px] bg-[#FFF4ED] text-[#E19242] text-[12px] font-medium leading-tight">In-progress</span>;
  }
  if (status === "Completed") {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-[12px] bg-[#E8F8F0] text-[#1CB061] text-[12px] font-medium leading-tight">Completed</span>;
  }
  return <span className="inline-flex items-center px-2 py-0.5 rounded-[12px] bg-gray-100 text-gray-700 text-[12px] font-medium leading-tight">{status}</span>;
}

type ViewMode = "kanban" | "list";
type ListType = "Work Orders" | "Product Orders";

type WorkOrderRow = {
  id: string;
  micron: string;
  width: string;
  quantity: string;
  stage: string;
  date: string;
  status: string;
  action: string;
  [key: string]: string;
};

type ProductOrderRow = {
  id: string;
  micron: string;
  width: string;
  product: string;
  grade: string;
  specifications: string;
  quantity: string;
  customer: string;
  instructions: string;
  status: string;
  stage: string;
  timestamp: string;
  action: string;
  [key: string]: string;
};

type KanbanCard = {
  id: string;
  status: string;
  micron?: string;
  width?: string;
  quantity: string;
  date: string;
  product?: string;
  grade?: string;
};

const workOrderConfig: TableConfig<WorkOrderRow> = {
  columns: [
    { key: "id", label: "Work Orders ID", type: "text", sortable: true },
    { key: "micron", label: "Micron", type: "number", sortable: true },
    { key: "width", label: "Width", type: "number", sortable: true },
    { key: "quantity", label: "Quantity", type: "number", sortable: true },
    {
      key: "stage",
      label: "Stage",
      type: "enum",
      sortable: false,
      filter: "dropdown",
      options: ["Metallisation", "Slitting", "Winding", "Spray", "Packing"],
    },
    { key: "date", label: "Date", type: "date", sortable: true },
    {
      key: "status",
      label: "Status",
      type: "enum",
      sortable: false,
      filter: "dropdown",
      options: ["Yet to Start", "In-progress", "Completed"],
    },
    { key: "action", label: "Action", type: "text", sortable: false },
  ],
};

const productOrderConfig: TableConfig<ProductOrderRow> = {
  columns: [
    { key: "id", label: "Order ID", type: "text", sortable: true },
    { key: "micron", label: "Micron", type: "text", sortable: true },
    { key: "width", label: "Width", type: "text", sortable: true },
    { key: "product", label: "Product", type: "text", sortable: true },
    { key: "grade", label: "Grade", type: "text", sortable: true },
    { key: "quantity", label: "Quantity", type: "number", sortable: true },
    {
      key: "status",
      label: "Status",
      type: "enum",
      sortable: false,
      filter: "dropdown",
      options: ["Yet to Start", "In-progress", "Completed"],
    },
    {
      key: "stage",
      label: "Stage",
      type: "enum",
      sortable: false,
      filter: "dropdown",
      options: ["Metallisation", "Slitting", "Winding", "Spray", "Packing"],
    },
    { key: "timestamp", label: "Created Timestamp", type: "date", sortable: true },
    { key: "action", label: "Action", type: "text", sortable: false },
  ],
};

const stageOrder = [
  "Metallisation",
  "Slitting",
  "Winding",
  "Spray",
  "Packing",
  "Testing",
  "Dispatch",
  "QC Hold",
  "Rework",
  "Completed",
];

export default function PipelinePage() {
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [productOrders, setProductOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [woData, poData] = await Promise.all([
        workOrderService.list(),
        productOrderService.list()
      ]);
      setWorkOrders(woData || []);
      setProductOrders(poData || []);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [listType, setListType] = useState<ListType>("Work Orders");
  const [searchQuery, setSearchQuery] = useState("");

  const workOrderFilters: EnumFilter[] = [
    { label: "Status", key: "woStatus", options: ["Yet to Start", "In-progress", "Completed"] },
    { label: "Stage", key: "woStage", options: ["Metallisation", "Slitting", "Winding", "Spray", "Packing"] },
  ];
  const productOrderFilters: EnumFilter[] = [
    { label: "Status", key: "poStatus", options: ["Yet to Start", "In-progress", "Completed"] },
    { label: "Stage", key: "poStage", options: ["Metallisation", "Slitting", "Winding", "Spray", "Packing"] },
  ];

  const workFilterConfig: FilterConfig = {
    enums: workOrderFilters,
    texts: [
      { label: "Work Order ID", key: "woId", placeholder: "Search WO..." },
      { label: "Micron", key: "woMicron" },
      { label: "Width", key: "woWidth" },
    ],
    numberRanges: [{ label: "Qty", minKey: "woQtyMin", maxKey: "woQtyMax" }],
  };

  const productFilterConfig: FilterConfig = {
    enums: productOrderFilters,
    texts: [
      { label: "Product Code", key: "poCode", placeholder: "Search code..." },
      { label: "Capacitor Type", key: "poType" },
    ],
    numberRanges: [{ label: "Batch Size", minKey: "poBatchMin", maxKey: "poBatchMax" }],
  };

  const [activeFilters, setActiveFilters] = useState<FilterState>({
    woStatus: [...workOrderFilters[0].options],
    woStage: [...workOrderFilters[1].options],
    woId: "",
    woMicron: "",
    woWidth: "",
    woQtyMin: "",
    woQtyMax: "",
    poStatus: [...productOrderFilters[0].options],
    poStage: [...productOrderFilters[1].options],
    poCode: "",
    poType: "",
    poBatchMin: "",
    poBatchMax: "",
  });

  const formatCardDate = (dateString?: string) => {
    if (!dateString) return "-";
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  };

  const pipelineWorkOrders: WorkOrderRow[] = workOrders.map((wo) => ({
    id: wo.work_order_no || wo.id,
    micron: wo.micron?.toString() || "-",
    width: wo.width_m?.toString() || "-",
    quantity: wo.quantity?.toString() || "-",
    stage: wo.stage || "Raw Material",
    date: formatCardDate(wo.created_at || wo.date),
    status: wo.status || "Yet to Start",
    action: "View",
  }));

  const initialPOs: ProductOrderRow[] = productOrders.map((p: any) => ({
    id: p.id,
    micron: p.micron,
    width: p.width,
    product: p.product,
    specifications: p.specifications,
    grade: p.grade,
    quantity: p.quantity,
    customer: p.customer,
    instructions: p.instructions,
    status: p.status,
    stage: p.stage || "Not Started",
    timestamp: p.timestamp || p.date || new Date().toISOString().split("T")[0],
    action: "",
  }));

  const {
    processedData: processedWorkOrders,
    sortConfig: workSortConfig,
    handleSort: handleWorkSort,
    filters: workFilters,
    handleFilterChange: handleWorkFilter,
    getPaginatedData, setCurrentPage } = useTableControls({ data: pipelineWorkOrders, config: workOrderConfig });

  const {
    processedData: processedProductOrders,
    sortConfig: productSortConfig,
    handleSort: handleProductSort,
    filters: productFilters,
    handleFilterChange: handleProductFilter,
  } = useTableControls({ data: initialPOs, config: productOrderConfig });

  const searchedWorkOrders = processedWorkOrders.filter((row) =>
    row.id.toLowerCase().includes(searchQuery.toLowerCase())
  ).filter((row) => {
    const f = activeFilters;
    if (!(f.woStatus as string[])?.includes(row.status)) return false;
    if (f.woStage && !(f.woStage as string[])?.includes(row.stage)) return false;
    if (f.woId && !row.id.toLowerCase().includes((f.woId as string).toLowerCase())) return false;
    if (f.woMicron && !row.micron.includes(f.woMicron as string)) return false;
    if (f.woWidth && !row.width.includes(f.woWidth as string)) return false;
    if (f.woQtyMin && parseInt(row.quantity) < parseInt(f.woQtyMin as string)) return false;
    if (f.woQtyMax && parseInt(row.quantity) > parseInt(f.woQtyMax as string)) return false;
    return true;
  });

  const searchedProductOrders = processedProductOrders.filter((row) =>
    row.id.toLowerCase().includes(searchQuery.toLowerCase())
  ).filter((row) => {
    const f = activeFilters;
    if (!(f.poStatus as string[])?.includes(row.status)) return false;
    if (f.poStage && !(f.poStage as string[])?.includes(row.stage)) return false;
    if (f.poCode && !row.code.toLowerCase().includes((f.poCode as string).toLowerCase())) return false;
    if (f.poType && !row.type.toLowerCase().includes((f.poType as string).toLowerCase())) return false;
    if (f.poBatchMin && parseInt(row.batchSize) < parseInt(f.poBatchMin as string)) return false;
    if (f.poBatchMax && parseInt(row.batchSize) > parseInt(f.poBatchMax as string)) return false;
    return true;
  });

  const groupedKanban = useMemo(() => {
    const groups: Record<string, KanbanCard[]> = {};
    for (const stage of stageOrder) {
      groups[stage] = [];
    }

    for (const row of pipelineWorkOrders) {
      if (!groups[row.stage]) {
        groups[row.stage] = [];
      }
      groups[row.stage].push({
        id: row.id,
        status: row.status,
        micron: row.micron,
        width: row.width,
        quantity: row.quantity,
        date: row.date,
      });
    }

    for (const newPO of initialPOs) {
      if (!groups[newPO.stage]) {
        groups[newPO.stage] = [];
      }
      groups[newPO.stage].push({
        id: newPO.id,
        status: newPO.status,
        micron: newPO.micron,
        width: newPO.width,
        product: newPO.product,
        grade: newPO.grade,
        quantity: newPO.quantity,
        date: new Date().toISOString().split("T")[0],
      });
    }

    return groups;
  }, [pipelineWorkOrders, initialPOs]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-72px)] bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-[#00B6E2]" />
      </div>
    );
  }

  return (
    <div className="font-dm-sans min-h-[calc(100vh-72px)] bg-white flex flex-col relative w-full max-w-full">
      <MobileHeader title="Pipeline" />
      
      {/* Header section */}
      <section className="bg-white w-full flex justify-start border-b border-[#EBEBEB]">
        <div className="w-full px-4 md:px-6 pt-[72px] pb-4 md:pt-6 md:pb-4 flex flex-col gap-1">
          <div className="text-[16px] font-medium text-[#171717] leading-tight">Pipeline</div>
          <p className="text-[14px] font-normal text-[#5C5C5C] leading-tight hidden md:block">
            Lorem ipsum dolor sit amet
          </p>
        </div>
      </section>

      {/* Main Content */}
      <div className="w-full px-4 md:px-6 flex flex-col gap-4 pt-5` md:gap-6">
        
        {/* Stats Section - Mobile 2x2 grid */}
        <section className="grid grid-cols-2 gap-0 md:hidden bg-white border border-[#EBEBEB]  rounded-[12px]">
          {[
            { title: "Total Orders", value: String(workOrders.length + productOrders.length), valClass: "text-[#171717]", subtextClass: "text-[#5C5C5C]" },
            { title: "In Progress", value: String(workOrders.filter((w) => w.status === "In-progress").length + productOrders.filter((p) => p.status === "In-progress").length), valClass: "text-[#171717]", subtextClass: "text-[#5C5C5C]" },
            { title: "Completed", value: String(workOrders.filter((w) => w.status === "Completed").length + productOrders.filter((p) => p.status === "Completed").length), valClass: "text-[#171717]", subtextClass: "text-[#5C5C5C]" },
            { title: "Yet to Start", value: String(workOrders.filter((w) => (w.status || "Yet to Start") === "Yet to Start").length + productOrders.filter((p) => (p.status || "Yet to Start") === "Yet to Start").length), valClass: "text-[#171717]", subtextClass: "text-[#5C5C5C]" },
          ].map((stat, i) => (
            <div key={i} className={`p-3 ${i % 2 === 0 ? 'border-r border-b border-[#EBEBEB]' : 'border-b border-[#EBEBEB]'}`}>
              <div className="flex flex-col gap-1">
                <p className="text-[11px] font-medium text-[#5C5C5C]">{stat.title}</p>
                <span className={`text-[16px] font-semibold ${stat.valClass}`}>{stat.value}</span>
              </div>
            </div>
          ))}
        </section>

        {/* Desktop Stats */}
        <section className="hidden md:grid grid-cols-1 sm:grid-cols-3 bg-white border border-[#EBEBEB] rounded-[12px] items-center p-5">
          <div className="flex items-center justify-between px-6 py-2 sm:py-0">
            <div className="flex flex-col gap-[6px]">
              <p className="text-[12px] font-medium text-[#5C5C5C] leading-tight">Total Orders</p>
              <div className="flex items-baseline gap-3">
                <span className="text-[14px] font-semibold leading-tight text-[#171717]">{workOrders.length + productOrders.length}</span>
                <span className="text-[12px] leading-tight text-[#5C5C5C]">
                  {workOrders.length} WO &bull; {productOrders.length} PO
                </span>
              </div>
            </div>
            <div className="hidden sm:block w-[1px] h-[37px] bg-[#EAECF0]"></div>
          </div>
          
          <div className="flex items-center justify-between px-6 py-2 sm:py-0">
            <div className="flex flex-col gap-[6px]">
              <p className="text-[12px] font-medium text-[#5C5C5C] leading-tight">In Progress</p>
              <div className="flex items-baseline gap-3">
                <span className="text-[14px] font-semibold leading-tight text-[#171717]">{workOrders.filter((w) => w.status === "In-progress").length + productOrders.filter((p) => p.status === "In-progress").length}</span>
                <span className="text-[12px] leading-tight text-[#E19242]">
                  Active orders
                </span>
              </div>
            </div>
            <div className="hidden sm:block w-[1px] h-[37px] bg-[#EAECF0]"></div>
          </div>

          <div className="flex items-center justify-between px-6 py-2 sm:py-0">
            <div className="flex flex-col gap-[6px]">
              <p className="text-[12px] font-medium text-[#5C5C5C] leading-tight">Completed</p>
              <div className="flex items-baseline gap-3">
                <span className="text-[14px] font-semibold leading-tight text-[#171717]">{workOrders.filter((w) => w.status === "Completed").length + productOrders.filter((p) => p.status === "Completed").length}</span>
                <span className="text-[12px] leading-tight text-[#1CB061]">
                  Done
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* View Toggle */}
        <section className="flex items-center gap-2 bg-transparent">
          <button
            onClick={() => setViewMode("kanban")}
            className={`h-[36px] px-5 text-[14px] font-medium rounded-[6px] transition-colors ${
              viewMode === "kanban"
                ? "bg-[#00B6E2] text-white"
                : "bg-[#F2F4F7] text-[#667085]"
            }`}
          >
            Kanban View
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`h-[36px] px-5 text-[14px] font-medium rounded-[6px] transition-colors ${
              viewMode === "list"
                ? "bg-[#00B6E2] text-white"
                : "bg-[#F2F4F7] text-[#667085]"
            }`}
          >
            List View
          </button>
        </section>

        {/* Toolbar */}
        <section className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Search - full width on mobile, smaller on desktop */}
          <div className="relative w-full md:w-[280px] shrink-0">
            <Search className="w-4 h-4 text-[#A1A1AA] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder="Search..." 
              className="h-10 md:h-[40px] w-full pl-9 pr-3 bg-white border border-[#EBEBEB] rounded-lg md:rounded-[8px] text-[14px]" 
            />
          </div>
          
          {/* Controls - right aligned, wraps on mobile */}
          <div className="flex flex-wrap items-center gap-2">
            {viewMode === "list" && (
              <select
                value={listType}
                onChange={(e) => setListType(e.target.value as ListType)}
                className="h-10 md:h-[40px] bg-white border border-[#EBEBEB] rounded-lg md:rounded-[8px] pl-3 pr-8 text-[14px] appearance-none cursor-pointer"
              >
                <option value="Work Orders">Work Orders</option>
                <option value="Product Orders">Product Orders</option>
              </select>
            )}

            <div className="relative">
              <select className="h-10 md:h-[40px] bg-white border border-[#EBEBEB] rounded-lg md:rounded-[8px] pl-3 pr-8 text-[14px] appearance-none cursor-pointer">
                <option value="recent">Sort by</option>
                <option value="oldest">Oldest First</option>
              </select>
              <ChevronDown className="w-4 h-4 text-[#5C5C5C] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <FilterPopover
              config={listType === "Work Orders" ? workFilterConfig : productFilterConfig}
              filters={activeFilters}
              onApply={(filters) => {
                setActiveFilters((prev) => ({ ...prev, ...filters }));
              }}
            />

            <button className="h-10 md:h-[40px] px-4 flex items-center gap-2 bg-white border border-[#00B6E2] text-[#00B6E2] text-[14px] font-medium rounded-[6px] hover:bg-[#F0FAFD] transition-colors">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </section>

        {/* Active Filter Chips */}
        <FilterChips
          config={listType === "Work Orders" ? workFilterConfig : productFilterConfig}
          filters={activeFilters}
          onRemove={(key) => {
            const defaults = listType === "Work Orders" 
              ? { woStatus: [...workOrderFilters[0].options], woStage: [...workOrderFilters[1].options] }
              : { poStatus: [...productOrderFilters[0].options], poStage: [...productOrderFilters[1].options] };
            const baseKey = key.replace(/^(wo|po)/, "");
            const defaultVal = defaults[key as keyof typeof defaults];
            if (Array.isArray(defaultVal)) {
              setActiveFilters({ ...activeFilters, [key]: defaultVal });
            } else {
              setActiveFilters({ ...activeFilters, [key]: "" });
            }
          }}
        />

        {viewMode === "list" ? (
          <section className="bg-white border border-[#EBEBEB] rounded-[12px] flex flex-col gap-4 overflow-hidden ">
            <div className="border border-[#EAECF0] rounded-[8px] overflow-x-auto min-h-[420px]">
              {listType === "Work Orders" ? (
                <table className="w-full text-left border-collapse min-w-[900px]">
                  <thead>
                    <tr className="bg-[#F5F7FA] border-b border-[#EBEBEB]">
                      {workOrderConfig.columns.map((col) => (
                        <th key={String(col.key)} className="px-4 py-[11px]">
                          <SortableHeader
                            column={col}
                            sortConfig={workSortConfig}
                            onSort={handleWorkSort}
                            filters={workFilters}
                            onFilterChange={handleWorkFilter}
                          />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EAECF0]">
                    {searchedWorkOrders.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-4 text-[14px] text-[#5C5C5C] font-medium whitespace-nowrap">{row.id}</td>
                      <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.micron}</td>
                      <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.width}</td>
                      <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.quantity}</td>
                      <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.stage}</td>
                      <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.date}</td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <button className="h-[34px] min-w-[72px] px-3 rounded-[8px] bg-[#00B6E2] text-white text-[14px] font-medium hover:bg-[#0092b5] transition-colors">
                          View
                        </button>
                      </td>
                    </tr>
                  ))}

                    {searchedWorkOrders.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-1 py-8 text-center text-[14px] text-[#5C5C5C]">
                          No work orders found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-left border-collapse min-w-[1080px]">
                  <thead>
                    <tr className="bg-[#F5F7FA] border-b border-[#EBEBEB]">
                      {productOrderConfig.columns.map((col) => (
                        <th key={String(col.key)} className="px-4 py-[11px]">
                          <SortableHeader
                            column={col}
                            sortConfig={productSortConfig}
                            onSort={handleProductSort}
                            filters={productFilters}
                            onFilterChange={handleProductFilter}
                          />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EAECF0]">
                    {searchedProductOrders.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-4 text-[14px] text-[#5C5C5C] font-medium whitespace-nowrap">{row.id}</td>
                      <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.code}</td>
                      <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.type}</td>
                      <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.grade}</td>
                      <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.batchSize}</td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <StatusBadge status={row.stage} />
                      </td>
                      <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.timestamp}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <button className="h-[34px] min-w-[72px] px-3 rounded-[8px] bg-[#00B6E2] text-white text-[14px] font-medium hover:bg-[#0092b5] transition-colors">
                          View
                        </button>
                      </td>
                    </tr>
                  ))}

                    {searchedProductOrders.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-1 py-8 text-center text-[14px] text-[#5C5C5C]">
                        No product orders found.
                      </td>
                    </tr>
                  )}
                  </tbody>
                </table>
              )}
            </div>
          

            <div className="flex items-center justify-between border-t border-[#EAECF0] pt-4 mt-2">
              <p className="text-[14px] text-[#5C5C5C]">
                Showing <span className="font-semibold text-[#171717]">{listType === "Work Orders" ? searchedWorkOrders.length : searchedProductOrders.length}</span> documents
              </p>
              <div className="flex items-center gap-1">
                <button className="w-8 h-8 flex items-center justify-center rounded-[6px] border border-[#EBEBEB] text-[#5C5C5C] hover:bg-gray-50 transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button className="w-8 h-8 flex items-center justify-center rounded-[6px] bg-[#00B6E2] text-white font-medium text-[14px]">
                  1
                </button>
                <button className="w-8 h-8 flex items-center justify-center rounded-[6px] border border-[#EBEBEB] text-[#5C5C5C] hover:bg-gray-50 transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </section>
        ) : (
          <section className="overflow-x-auto pb-2">
            <div className="flex gap-4 min-w-max pr-4">
              {Object.entries(groupedKanban).map(([stage, cards]) => (
                <div key={stage} className="w-[320px] flex-shrink-0 flex flex-col rounded-[12px] border border-[#EBEBEB] bg-white overflow-hidden">
                  <div className="px-5 py-3.5 bg-[#F5F7FA] border-b border-[#EBEBEB] flex items-center gap-2">
                    <div className="text-[14px] font-semibold text-[#171717]">{stage}</div>
                    <span className="w-[22px] h-[22px] flex items-center justify-center rounded-full bg-[#EBEBEB] text-[#5C5C5C] text-[12px] font-medium">{cards.length}</span>
                  </div>

                  <div className="p-4 flex flex-col gap-4 min-h-[360px]">
                    {cards.map((card) => (
                      <div key={card.id} className="border border-[#EBEBEB] rounded-[8px] bg-white p-4 flex flex-col gap-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[14px] font-semibold text-[#171717] truncate">{card.id}</span>
                          <StatusBadge status={card.status} />
                        </div>

                        <div className="border-t border-[#EBEBEB] pt-3 grid grid-cols-2 gap-y-3 gap-x-2 text-[12px] text-[#5C5C5C]">
                          {card.micron ? (
                            <>
                              <div className="text-[#171717] font-medium col-span-1 text-[14px] truncate">{card.micron}</div>
                              <div className="text-[#171717] font-medium col-span-1 text-[14px] truncate">{card.width}</div>
                              <div className="flex items-center gap-1 text-[12px]"><span className="text-[#A1A1AA]">Grade:</span> <span className="text-[#171717] font-medium">{card.grade}</span></div>
                              <div className="flex items-center gap-1 text-[12px]"><span className="text-[#A1A1AA]">Batch Size:</span> <span className="text-[#171717] font-medium">{card.quantity}</span></div>
                            </>
                          ) : (
                            <>
                              <div className="flex items-center gap-1 text-[12px]"><span className="text-[#A1A1AA]">Micron:</span> <span className="text-[#171717] font-medium">{card.micron}</span></div>
                              <div className="flex items-center gap-1 text-[12px]"><span className="text-[#A1A1AA]">Width:</span> <span className="text-[#171717] font-medium">{card.width}</span></div>
                            </>
                          )}

                          <div className="flex items-center gap-1 text-[12px]"><span className="text-[#A1A1AA]">Quantity:</span> <span className="text-[#171717] font-medium">{card.quantity}</span></div>
                          <div className="flex items-center gap-1.5 text-[12px]"><Calendar className="w-3.5 h-3.5 text-[#A1A1AA]" /><span className="text-[#171717] font-medium">{card.date}</span></div>
                        </div>
                      </div>
                    ))}

                    {cards.length === 0 && (
                      <div className="border border-dashed border-[#D0D5DD] rounded-[8px] bg-[#FCFCFD] p-4 text-[14px] text-[#98A2B3] text-center">
                        No items in this stage
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

      </div>
    </div>
  );
}