"use client";

import { Plus, X, ChevronDown, Search, Download, QrCode } from "lucide-react";
import { ScannerInput } from "@/components/ScannerInput";
import Link from "next/link";
import { useState, useEffect } from "react";
import { type WorkOrderSummary } from "../../../lib/data";
import { type ComputedWorkOrderSummary } from "@/hooks/useStore";
import { workOrderService } from "@/src/services/workOrderService";
import { Loader2 } from "lucide-react";
import type { TableConfig } from "@/hooks/useTableControls";
import { TablePagination } from "@/components/table/TablePagination";
import { useTableControls } from "@/hooks/useTableControls";
import { SortableHeader } from "@/components/table/SortableHeader";
import { TableToolbar } from "@/components/table/TableToolbar";
import { OptionsDropdown } from "@/components/table/OptionsDropdown";
import { FilterPopover, FilterChips, type FilterConfig, type FilterState, type EnumFilter, type TextFilter, type NumberRangeFilter } from "@/components/table/FilterPopover";
import { exportToExcel } from "@/lib/exportExcel";
import { MobileHeader, MobileSpacer } from "@/components/MobileHeader";
import { QRCodeModal, type QRModalData } from "@/components/QRCodeModal";
import { StatusBadge } from "@/components/StatusBadge";
import { WO_STATUS_OPTIONS, WO_STAGE_OPTIONS } from "@/lib/constants";

const statusFilter: EnumFilter = { label: "Status", key: "status", options: WO_STATUS_OPTIONS };
const stageFilter: EnumFilter = { label: "Stage", key: "stage", options: WO_STAGE_OPTIONS };
const textFilters: TextFilter[] = [
  { label: "Work Order ID", key: "woId", placeholder: "Search..." },
  { label: "Micron", key: "micron" },
  { label: "Width", key: "width" },
];
const numberFilters: NumberRangeFilter[] = [
  { label: "Quantity", minKey: "qtyMin", maxKey: "qtyMax" },
];

const filterConfig: FilterConfig = {
  enums: [statusFilter, stageFilter],
  texts: textFilters,
  numberRanges: numberFilters,
};

export type WorkOrderRow = ComputedWorkOrderSummary & { uuid?: string };

const workOrderConfig: TableConfig<WorkOrderRow> = {
  columns: [
    { key: "id", label: "Work Orders ID", type: "text", sortable: true },
    { key: "micron", label: "Micron", type: "number", sortable: true },
    { key: "width", label: "Width", type: "number", sortable: true },
    { key: "qty", label: "Quantity", type: "number", sortable: true },
    { key: "stage", label: "Stage", type: "enum", sortable: false, filter: "dropdown", options: WO_STAGE_OPTIONS },
    { key: "date", label: "Timestamp", type: "date", sortable: true },
    { key: "status", label: "Status", type: "enum", sortable: false, filter: "dropdown", options: WO_STATUS_OPTIONS },
    { key: "options", label: "Action", type: "text", sortable: false }
  ]
};


export default function SupervisorWorkOrderPage() {
  const [rows, setRows] = useState<(ComputedWorkOrderSummary & { uuid?: string })[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [qrData, setQrData] = useState<QRModalData | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState({ micron: "", width: "", otherWidth: "", quantity: "" });
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await workOrderService.list();
      const mapped = data.map((wo: any) => ({
        uuid: wo.id,
        id: wo.work_order_no || wo.id,
        micron: wo.micron?.toString() || "-",
        width: wo.width_m?.toString() || "-",
        qty: wo.quantity?.toString() || "-",
        stage: wo.stage || "Raw Material",
        date: wo.created_at ? new Date(wo.created_at).toLocaleString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true }) : "-",
        status: wo.status || "Yet to Start"
      }));
      setRows(mapped);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const {
    processedData,
    sortConfig,
    handleSort,
    filters,
    handleFilterChange,
    dateRange,
    setDateRange,
    getPaginatedData,
    setCurrentPage,
  } = useTableControls({ data: rows, config: workOrderConfig });

  const [tableFilters, setTableFilters] = useState<FilterState>(() => {
    const state: FilterState = {};
    state.status = [...WO_STATUS_OPTIONS];
    state.stage = [...WO_STAGE_OPTIONS];
    state.woId = "";
    state.micron = "";
    state.width = "";
    state.qtyMin = "";
    state.qtyMax = "";
    return state;
  });

  const handleApplyFilters = (newFilters: FilterState) => {
    setTableFilters(newFilters);
  };

  const handleRemoveFilter = (key: string) => {
    if (key === "status") {
      setTableFilters({ ...tableFilters, status: [...WO_STATUS_OPTIONS] });
    } else if (key === "stage") {
      setTableFilters({ ...tableFilters, stage: [...WO_STAGE_OPTIONS] });
    } else if (key === "woId") {
      setTableFilters({ ...tableFilters, woId: "" });
    } else if (key === "micron") {
      setTableFilters({ ...tableFilters, micron: "" });
    } else if (key === "width") {
      setTableFilters({ ...tableFilters, width: "" });
    } else if (key === "qtyMin") {
      setTableFilters({ ...tableFilters, qtyMin: "", qtyMax: "" });
    }
  };

  const filteredData = processedData.filter((row) => {
    const f = tableFilters;
    if (searchQuery && !row.id.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (!(f.status as string[])?.includes(row.status)) return false;
    if (f.stage && !(f.stage as string[])?.includes(row.stage)) return false;
    if (f.woId && !row.id.toLowerCase().includes((f.woId as string).toLowerCase())) return false;
    if (f.micron && row.micron !== (f.micron as string)) return false;
    if (f.width && row.width !== (f.width as string)) return false;
    if (f.qtyMin && parseInt(row.qty) < parseInt(f.qtyMin as string)) return false;
    if (f.qtyMax && parseInt(row.qty) > parseInt(f.qtyMax as string)) return false;
    return true;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-72px)] bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-[#00B6E2]" />
      </div>
    );
  }
  
  const openEditWorkOrder = (order: ComputedWorkOrderSummary) => {
    setFormData({
      micron: order.micron,
      width: order.width,
      otherWidth: "",
      quantity: order.qty
    });
    setIsModalOpen(true);
  };

  const handleCreateWorkOrder = async () => {
  const finalWidth = formData.width === "Other" ? formData.otherWidth : formData.width;
  if (!formData.micron || !finalWidth || !formData.quantity) return;

  const currentYear = new Date().getFullYear();

  const nextIdNum = rows.reduce((maxId, row) => {
    const match = row.id.match(/WO-\d{4}-(\d+)/);
    const parsed = match ? Number.parseInt(match[1], 10) : NaN;
    return Number.isNaN(parsed) ? maxId : Math.max(maxId, parsed);
  }, 0) + 1;

  const newId = `WO-${currentYear}-${String(nextIdNum).padStart(3, "0")}`;

  try {
    await workOrderService.create({
      work_order_no: newId,
      micron: Number(formData.micron),
      width_m: Number(finalWidth),
      quantity: Number(formData.quantity),
    });
    await loadData();
    setIsModalOpen(false);
    setFormData({ micron: "", width: "", otherWidth: "", quantity: "" });
  } catch (error) {
    console.error(error);
    alert("Failed to create work order");
  }
};

  const totalWorkOrders = rows.length;
  const rawMaterialCount = rows.filter((row) => row.stage.toLowerCase().includes("raw material")).length;
  const metallisationCount = rows.filter((row) => row.stage.toLowerCase().includes("metallisation")).length;
  const slittingCount = rows.filter((row) => row.stage.toLowerCase().includes("slitting")).length;
  const yetToStartCount = rows.filter((row) => row.status === "Yet to Start").length;
  const inProgressCount = rows.filter((row) => row.status === "In-progress").length;
  const completedCount = rows.filter((row) => row.status === "Completed").length;
  const yetRawCount = rows.filter((row) => row.status === "Yet to Start" && row.stage.toLowerCase().includes("raw material")).length;
  const yetMetCount = rows.filter((row) => row.status === "Yet to Start" && row.stage.toLowerCase().includes("metallisation")).length;
  const yetSlitCount = rows.filter((row) => row.status === "Yet to Start" && row.stage.toLowerCase().includes("slitting")).length;
  const inProgressMetCount = rows.filter((row) => row.status === "In-progress" && row.stage.toLowerCase().includes("metallisation")).length;
  const inProgressSlitCount = rows.filter((row) => row.status === "In-progress" && row.stage.toLowerCase().includes("slitting")).length;
  const completedSlitCount = rows.filter((row) => row.status === "Completed" && row.stage.toLowerCase().includes("slitting")).length;

  const overviewStats = [
    {
      title: "Total Work Orders",
      value: String(totalWorkOrders),
      subtext: `Yet ${yetToStartCount} | In-progress ${inProgressCount} | Completed ${completedCount}`,
      subtextClass: "text-[#5C5C5C] font-normal",
      valClass: "text-[#171717]",
    },
    {
      title: "Yet to Start",
      value: String(yetToStartCount),
      subtext: `Raw ${yetRawCount} | Met ${yetMetCount} | Slit ${yetSlitCount}`,
      subtextClass: "text-[#E19242] font-semibold",
      valClass: "text-[#171717]",
    },
    {
      title: "In-progress",
      value: String(inProgressCount),
      subtext: `Met ${inProgressMetCount} | Slit ${inProgressSlitCount}`,
      subtextClass: "text-[#1CB061] font-semibold",
      valClass: "text-[#171717]",
    },
    {
      title: "Completed",
      value: String(completedCount),
      subtext: `Slitting completed ${completedSlitCount}`,
      subtextClass: "text-[#1CB061] font-semibold",
      valClass: "text-[#171717]",
    },
  ];

  const { paginatedData, totalPages, validPage: currentPage } = getPaginatedData(filteredData);

  return (
    <div className="font-dm-sans min-h-[calc(100vh-72px)] bg-white flex flex-col relative w-full max-w-full">
      <MobileHeader title="Work Orders" />

      {/* Modal Overlay */}
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
                    onChange={(e) => setFormData({...formData, micron: e.target.value})}
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
                    onChange={(e) => {
                      const newWidth = e.target.value;
                      setFormData({ ...formData, width: newWidth, otherWidth: newWidth !== "Other" ? "" : formData.otherWidth });
                    }}
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
                    <option value="Other">Other</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-[#525866] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                {formData.width === "Other" && (
                  <input
                    type="number"
                    placeholder="Enter width"
                    value={formData.otherWidth}
                    onChange={(e) => setFormData({ ...formData, otherWidth: e.target.value })}
                    className="w-full h-[44px] bg-white border border-[#EBEBEB] rounded-[8px] px-3 text-[14px] text-[#171717] placeholder:text-[#A1A1AA] focus:outline-none focus:border-[#00B6E2] transition-colors mt-1"
                    min="0"
                    step="any"
                  />
                )}
              </div>

              {/* Quantity Field */}
              <div className="flex flex-col gap-2">
                <label className="text-[12px] font-medium text-[#171717] uppercase tracking-wider">QUANTITY</label>
                <input 
                  type="number"
                  placeholder="Enter Quantity"
                  value={formData.quantity}
                  onChange={(e) => setFormData({...formData, quantity: e.target.value})}
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

      {/* Header section (Frame 66 style) */}
      <section className="bg-white w-full flex justify-start border-b border-[#EBEBEB]">
        <div className="w-full px-4 md:px-6 pt-[72px] pb-4 md:pt-6 md:pb-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 h-auto">
          <div className="flex flex-col gap-1">
            <h1 className="text-[16px] font-medium text-[#171717] leading-tight">Work Orders</h1>
            <p className="text-[14px] font-normal text-[#5C5C5C] leading-tight hidden md:block">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit
            </p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-[#00B6E2] text-white text-[14px] font-medium rounded-[6px] h-[40px] px-[18px] hover:bg-[#0092b5] transition-colors shrink-0 w-full sm:w-auto"
          >
            <Plus className="w-5 h-5 shrink-0" strokeWidth={2.5} />
            <span className="leading-tight">Add Work Order</span>
          </button>
        </div>
      </section>

      {/* Main Content */}
      <div className="w-full px-4 md:px-6 flex flex-col mt-5 gap-4 md:gap-6">
        {/* Stats Cards (Frame 70) - Desktop */}
        <section className="hidden md:grid grid-cols-1 lg:grid-cols-4 bg-white border border-[#EBEBEB] rounded-[12px] items-center p-5">
          {overviewStats.map((stat, i) => (
            <div key={i} className="flex items-center justify-between px-6 py-2 lg:py-0">
              <div className="flex flex-col gap-[6px]">
                <p className="text-[12px] font-medium text-[#5C5C5C] leading-tight">{stat.title}</p>
                <div className="flex items-baseline gap-3">
                  <span className={`text-[14px] font-semibold leading-tight ${stat.valClass}`}>{stat.value}</span>
                  <span className={`text-[12px] leading-tight ${stat.subtextClass}`}>{stat.subtext}</span>
                </div>
              </div>
              {i < overviewStats.length - 1 && (
                <div className="hidden lg:block w-[1px] h-[37px] bg-[#EAECF0]"></div>
              )}
            </div>
          ))}
        </section>

        {/* Stats Cards - Mobile */}
        <section className="grid grid-cols-2 gap-0 md:hidden bg-white border border-[#EBEBEB] rounded-[12px]">
          {overviewStats.map((stat, i) => (
            <div key={i} className={`p-3 ${i % 2 === 0 ? 'border-r border-b border-[#EBEBEB]' : 'border-b border-[#EBEBEB]'} ${i >= 2 ? '' : ''}`}>
              <div className="flex flex-col gap-1">
                <p className="text-[11px] font-medium text-[#5C5C5C]">{stat.title}</p>
                <span className={`text-[16px] font-semibold ${stat.valClass}`}>{stat.value}</span>
                <span className={`text-[10px] ${stat.subtextClass}`}>{stat.subtext}</span>
              </div>
            </div>
          ))}
        </section>

        {/* Filters Row - Mobile */}
        <section className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-[#A1A1AA] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder="Search..." 
              className="h-10 md:h-[40px] w-full pl-9 pr-3 bg-white border border-[#EBEBEB] rounded-lg md:rounded-[8px] text-[14px] text-[#171717] placeholder:text-[#A1A1AA] focus:outline-none focus:border-[#00B6E2]" 
            />
          </div>
          <div className="flex items-center gap-2">
            <FilterPopover
              config={filterConfig}
              filters={tableFilters}
              onApply={handleApplyFilters}
            />
            <button 
              onClick={() => {
                const exportData = paginatedData.map(row => ({
                  "Work Order ID": row.id,
                  "Micron": row.micron,
                  "Width": row.width,
                  "Quantity": row.qty,
                  "Stage": row.stage,
                  "Date": row.date,
                  "Status": row.status,
                }));
                exportToExcel(exportData, "work-orders", "Work Orders");
              }}
              className="h-10 md:h-[40px] px-3 flex items-center gap-2 border border-[#EBEBEB] text-[#5C5C5C] text-[13px] rounded-lg"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </section>

        {/* Active Filter Chips */}
        <FilterChips config={filterConfig} filters={tableFilters} onRemove={handleRemoveFilter} />

        {/* Data Table - Mobile Card View */}
        <section className="md:hidden flex flex-col gap-3">
          {paginatedData.map((row, idx) => (
            <div key={idx} className="bg-white border border-[#EBEBEB] rounded-lg p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[14px] font-medium text-[#00B6E2]">{row.id}</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setQrData({ id: row.id, type: "WO", data: { workOrderId: row.id, micron: row.micron, width: row.width, quantity: row.qty, date: row.date, status: row.status } })} className="text-[#5C5C5C] hover:text-[#00B6E2] transition-colors">
                    <QrCode className="w-4 h-4" />
                  </button>
                  <StatusBadge status={row.status} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[12px] text-[#5C5C5C]">
                <div>Micron: <span className="text-[#171717] font-medium">{row.micron}</span></div>
                <div>Width: <span className="text-[#171717] font-medium">{row.width}</span></div>
                <div>Qty: <span className="text-[#171717] font-medium">{row.qty}</span></div>
                <div>Stage: <span className="text-[#171717] font-medium">{row.stage}</span></div>
                <div>Date: <span className="text-[#171717] font-medium">{row.date}</span></div>
              </div>
              <Link href={`/productionhead/workorder/${row.id}`} className="w-full h-10 border border-[#00B6E2] text-[#00B6E2] text-[14px] font-medium rounded-lg flex items-center justify-center">
                View
              </Link>
            </div>
          ))}
          {paginatedData.length === 0 && (
            <div className="text-center py-8 text-[14px] text-[#5C5C5C]">No work orders found.</div>
          )}
        </section>

        {/* Data Table - Desktop */}
        <section className="hidden md:block bg-white rounded-[12px] flex flex-col gap-4 overflow-hidden">
          <div className="border border-[#EAECF0] rounded-[8px] overflow-x-auto min-h-[300px]">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-[#F5F7FA] border-b border-[#EBEBEB]">
                  {workOrderConfig.columns.map((col) => (
                    <th key={String(col.key)} className="px-4 py-[11px]">
                      <SortableHeader
                        column={col}
                        sortConfig={sortConfig}
                        onSort={handleSort}
                        filters={filters}
                        onFilterChange={handleFilterChange}
                      />
                    </th>
                  ))}
                  <th className="px-4 py-[11px]">
                    <span className="text-[13px] font-semibold text-[#667085]">QR</span>
                  </th>
                </tr>
              </thead>
<tbody className="divide-y divide-[#EAECF0]">
                {paginatedData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-4 py-4 text-[14px] text-[#5C5C5C] font-medium whitespace-nowrap">
                      <Link href={`/productionhead/workorder/${row.id}`} className="hover:text-[#00B6E2] hover:underline cursor-pointer">
                        {row.id}
                      </Link>
                    </td>
                    <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.micron}</td>
                    <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.width}</td>
                    <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.qty}</td>
                    <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.stage}</td>
                    <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.date}</td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <OptionsDropdown 
                        viewHref={`/productionhead/workorder/${row.id}`}
                        status={row.status}
                        onEdit={() => openEditWorkOrder(row)}
                        onDelete={async () => {
                          if (confirm(`Are you sure you want to delete ${row.id}?`)) {
                            if ((row as any).uuid) {
                              try {
                                await workOrderService.remove((row as any).uuid);
                                await loadData();
                              } catch (e) {
                                console.error(e);
                                alert("Failed to delete work order");
                              }
                            }
                          }
                        }}
                      />
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <button onClick={() => setQrData({ id: row.id, type: "WO", data: { workOrderId: row.id, micron: row.micron, width: row.width, quantity: row.qty, date: row.date, status: row.status } })} className="text-[#5C5C5C] hover:text-[#00B6E2] transition-colors">
                        <QrCode className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {paginatedData.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-[14px] text-[#5C5C5C]">
                      No work orders found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <TablePagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </section>
      </div>

      {qrData && <QRCodeModal id={qrData.id} type={qrData.type} data={qrData.data} onClose={() => setQrData(null)} />}
    </div>
  );
}
