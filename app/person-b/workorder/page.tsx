"use client";

import { WO_STATUS_OPTIONS, WO_STAGE_OPTIONS } from "@/lib/constants";
import { StatusBadge } from "@/components/StatusBadge";
import { Search, QrCode, Scan, X, Layers, Clock, Activity, CheckCircle } from "lucide-react";
import Link from "next/link";
import { useState, useRef, useEffect, useCallback } from "react";
import { useStore, type ComputedWorkOrderSummary } from "@/hooks/useStore";
import type { TableConfig } from "@/hooks/useTableControls";
import { TablePagination } from "@/components/table/TablePagination";
import { useTableControls } from "@/hooks/useTableControls";
import { SortableHeader } from "@/components/table/SortableHeader";
import { TableToolbar } from "@/components/table/TableToolbar";
import { OptionsDropdown } from "@/components/table/OptionsDropdown";
import { FilterChips, type FilterConfig, type FilterState, type EnumFilter, type TextFilter, type NumberRangeFilter } from "@/components/table/FilterPopover";
import { exportToExcel } from "@/lib/exportExcel";
import { MobileHeader } from "@/components/MobileHeader";
import { QRCodeModal, type QRModalData } from "@/components/QRCodeModal";




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

const workOrderConfig: TableConfig<ComputedWorkOrderSummary> = {
  columns: [
    { key: "id", label: "Work Orders ID", type: "text", sortable: true },
    { key: "micron", label: "Micron", type: "text", sortable: true },
    { key: "width", label: "Width", type: "text", sortable: true },
    { key: "qty", label: "Quantity", type: "number", sortable: true },
    { key: "stage", label: "Stage", type: "text", sortable: true },
    { key: "date", label: "Date", type: "date", sortable: true },
    { key: "status", label: "Status", type: "enum", sortable: false, filter: "dropdown", options: WO_STATUS_OPTIONS },
    { key: "options", label: "Action", type: "text", sortable: false }
  ]
};



export default function PersonBWorkOrderPage() {
  const { workOrders: rows, mounted, deleteWorkOrder } = useStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [qrData, setQrData] = useState<QRModalData | null>(null);

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
    if (!(f.status as string[])?.includes(row.status)) return false;
    if (f.stage && !(f.stage as string[])?.includes(row.stage)) return false;
    if (f.woId && !row.id.toLowerCase().includes((f.woId as string).toLowerCase())) return false;
    if (f.micron && row.micron !== (f.micron as string)) return false;
    if (f.width && row.width !== (f.width as string)) return false;
    if (f.qtyMin && parseInt(row.qty) < parseInt(f.qtyMin as string)) return false;
    if (f.qtyMax && parseInt(row.qty) > parseInt(f.qtyMax as string)) return false;
    return true;
  });

  const totalWorkOrders = rows.length;
  const completedCount = rows.filter((row) => row.status === "Completed").length;
  const inProgressCount = rows.filter((row) => row.status === "In-progress").length;
  const yetToStartCount = rows.filter((row) => row.status === "Yet to Start").length;
  const yetRawCount = rows.filter((row) => row.status === "Yet to Start" && row.stage.toLowerCase().includes("raw material")).length;
  const yetMetCount = rows.filter((row) => row.status === "Yet to Start" && row.stage.toLowerCase().includes("metallisation")).length;
  const yetSlitCount = rows.filter((row) => row.status === "Yet to Start" && row.stage.toLowerCase().includes("slitting")).length;
  const inProgressMetCount = rows.filter((row) => row.status === "In-progress" && row.stage.toLowerCase().includes("metallisation")).length;
  const inProgressSlitCount = rows.filter((row) => row.status === "In-progress" && row.stage.toLowerCase().includes("slitting")).length;
  const completedSlitCount = rows.filter((row) => row.status === "Completed" && row.stage.toLowerCase().includes("slitting")).length;

  const { paginatedData, totalPages, validPage: currentPage } = getPaginatedData(filteredData);

  const kpiStats = [
    { label: "Total Work Orders", value: String(totalWorkOrders), icon: Layers, valClass: "text-[#171717]", subtext: `Yet ${yetToStartCount} | In-progress ${inProgressCount} | Completed ${completedCount}` },
    { label: "Yet to Start", value: String(yetToStartCount), icon: Clock, valClass: "text-[#171717]", subtext: `Raw ${yetRawCount} | Met ${yetMetCount} | Slit ${yetSlitCount}` },
    { label: "In-progress", value: String(inProgressCount), icon: Activity, valClass: "text-[#171717]", subtext: `Met ${inProgressMetCount} | Slit ${inProgressSlitCount}` },
    { label: "Completed", value: String(completedCount), icon: CheckCircle, valClass: "text-[#171717]", subtext: `Slitting completed ${completedSlitCount}` },
  ];

  if (!mounted) return null;

  return (
    <div className="font-dm-sans min-h-[calc(100vh-72px)] bg-white flex flex-col relative overflow-x-hidden">
      <MobileHeader title="Work Orders" />

      {/* Mobile KPI 2x2 */}
      <section className="grid grid-cols-2 gap-0 md:hidden mx-4 mt-[72px] bg-white border border-[#EBEBEB] rounded-[12px]">
        {kpiStats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className={`p-3 ${i % 2 === 0 ? 'border-r border-b border-[#EBEBEB]' : 'border-b border-[#EBEBEB]'} ${i >= 2 ? 'border-b-0' : ''}`}>
              <div className="flex items-start gap-2">
                <div className="w-8 h-8 rounded-full bg-[#E6F8FD] flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-[#00B6E2]" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <p className="text-[11px] font-medium text-[#5C5C5C]">{stat.label}</p>
                  <span className={`text-[16px] font-semibold ${stat.valClass}`}>{stat.value}</span>
                  <span className="text-[10px] text-[#5C5C5C]">{stat.subtext}</span>
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* Desktop KPI row */}
      <section className="hidden md:grid grid-cols-1 lg:grid-cols-4 mx-4 md:mx-6 mt-6 bg-white border border-[#EBEBEB] rounded-[12px] items-center p-5">
        {kpiStats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="flex items-center gap-4 px-4 py-2">
              <div className="w-10 h-10 rounded-full bg-[#E6F8FD] flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-[#00B6E2]" />
              </div>
              <div className="flex flex-col gap-[2px]">
                <p className="text-[12px] font-medium text-[#5C5C5C] leading-tight">{stat.label}</p>
                <div className="flex items-baseline gap-2">
                  <span className={`text-[14px] font-semibold ${stat.valClass}`}>{stat.value}</span>
                  <span className="text-[12px] text-[#5C5C5C]">{stat.subtext}</span>
                </div>
              </div>
              {i < kpiStats.length - 1 && (
                <div className="hidden lg:block w-[1px] h-[37px] bg-[#EAECF0] ml-auto" />
              )}
            </div>
          );
        })}
      </section>

      <div className="w-full px-4 md:px-6 py-6 flex flex-col gap-6">
        <section className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative max-w-[400px] w-full">
            <Search className="w-4 h-4 text-[#A1A1AA] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder="Search by Work Order ID..." 
              className="h-[40px] w-full pl-9 pr-3 bg-white border border-[#EBEBEB] rounded-[8px] text-[14px] text-[#171717] placeholder:text-[#A1A1AA] focus:outline-none focus:border-[#00B6E2]" 
            />
          </div>
          <div className="flex items-center gap-2">
            <TableToolbar
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            onExport={(scope = "all") => {
            const dataToExport = scope === "all" ? filteredData : paginatedData;
            const exportData = dataToExport.map(row => ({
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
            filterConfig={filterConfig}
            filters={tableFilters}
            onApplyFilters={handleApplyFilters}
          />
          </div>
        </section>

        <FilterChips config={filterConfig} filters={tableFilters} onRemove={handleRemoveFilter} />

        <section className="bg-white rounded-[12px] flex flex-col gap-4 overflow-hidden">
          <div className="border border-[#EAECF0] rounded-[8px] overflow-x-auto min-h-[300px]">
            <table className="w-full text-left border-collapse min-w-[1000px]">
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
                {paginatedData.length > 0 ? paginatedData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-4 py-4 text-[14px] text-[#5C5C5C] font-medium whitespace-nowrap">
                      <Link href={`/person-b/workorder/${row.id}`} className="hover:text-[#00B6E2] hover:underline cursor-pointer">
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
                        viewHref={`/person-b/workorder/${row.id}`}
                        status={row.status}
                        onEdit={() => {}}
                        onDelete={() => {
                          if (confirm(`Are you sure you want to delete ${row.id}?`)) {
                            deleteWorkOrder(row.id);
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
                )) : (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-[#5C5C5C] text-[14px]">
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
