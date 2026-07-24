"use client";

import { TablePagination } from "@/components/table/TablePagination";
import { Plus, Search, QrCode } from "lucide-react";
import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
import { Package, Scissors, ArrowRight, CheckCircle } from "lucide-react";
import { stockService } from "@/src/services/stockService";
import { productionStageService } from "@/src/services/productionStageService";
import type { TableConfig } from "@/hooks/useTableControls";
import { useTableControls } from "@/hooks/useTableControls";
import { SortableHeader } from "@/components/table/SortableHeader";
import { TableToolbar } from "@/components/table/TableToolbar";
import { OptionsDropdown } from "@/components/table/OptionsDropdown";
import { FilterChips, type FilterConfig, type FilterState, type EnumFilter, type TextFilter, type NumberRangeFilter } from "@/components/table/FilterPopover";
import { exportToExcel } from "@/lib/exportExcel";
import { MobileHeader } from "@/components/MobileHeader";
import { QRCodeModal, type QRModalData } from "@/components/QRCodeModal";
import { WO_STATUS_OPTIONS } from "@/lib/constants";
import { StatusBadge } from "@/components/StatusBadge";

type StockRow = {
  stockId: string;
  linkedWoId: string;
  weight: string;
  grossWeight?: string;
  usedWeight?: string;
  width: string;
  micron: string;
  grade: string;
  stage: string;
  timestamp: string;
};

type MetallisationRow = {
  originalId: string;
  coilNo: string;
  rmId: string;
  weight: string;
  grossWeight?: string;
  usedWeight?: string;
  factoryWastageWeight: string;
  timestamp: string;
  nextStage: string;
  status: string;
};

type TabType = "Metallisation" | "Slitting";

const STAGE_OPTIONS = ["Slitting", "Ready for Winding", "Completed"];

const statusFilterSlitting: EnumFilter = { label: "Stage", key: "stage", options: STAGE_OPTIONS };
const textFiltersSlitting: TextFilter[] = [
  { label: "Stock ID", key: "stockId", placeholder: "Search..." },
  { label: "Linked WO ID", key: "linkedWoId", placeholder: "Search..." },
  { label: "Grade", key: "grade" },
];
const numberFiltersSlitting: NumberRangeFilter[] = [
  { label: "Weight", minKey: "weightMin", maxKey: "weightMax" },
  { label: "Width", minKey: "widthMin", maxKey: "widthMax" },
  { label: "Micron", minKey: "micronMin", maxKey: "micronMax" },
];
const filterConfigSlitting: FilterConfig = {
  enums: [statusFilterSlitting],
  texts: textFiltersSlitting,
  numberRanges: numberFiltersSlitting,
};

const statusFilterMet: EnumFilter = { label: "Status", key: "status", options: WO_STATUS_OPTIONS };
const textFiltersMet: TextFilter[] = [
  { label: "Coil No.", key: "coilNo", placeholder: "Search..." },
  { label: "RM ID", key: "rmId", placeholder: "Search..." },
];
const numberFiltersMet: NumberRangeFilter[] = [
  { label: "Weight", minKey: "weightMin", maxKey: "weightMax" },
  { label: "Factory Wastage", minKey: "factoryWastageWeightMin", maxKey: "factoryWastageWeightMax" },
];
const filterConfigMet: FilterConfig = {
  enums: [statusFilterMet],
  texts: textFiltersMet,
  numberRanges: numberFiltersMet,
};

const stockConfig: TableConfig<any> = {
  columns: [
    { key: "stockId", label: "STOCK ID", type: "text", sortable: true },
    { key: "weight", label: "Weight", type: "text", sortable: true },
    { key: "grossWeight", label: "Gross Weight", type: "text", sortable: true },
    { key: "usedWeight", label: "Used Weight", type: "text", sortable: true },
    { key: "width", label: "Width", type: "text", sortable: true },
    { key: "micron", label: "Micron", type: "text", sortable: true },
    { key: "grade", label: "Grade", type: "text", sortable: true },
    { key: "stage", label: "Stage", type: "enum", sortable: false, filter: "dropdown", options: ["Slitting", "Ready for Winding", "Completed"] },
    { key: "timestamp", label: "Timestamp", type: "date", sortable: true },
    { key: "qr", label: "QR", type: "text", sortable: false },
    { key: "options", label: "Action", type: "text", sortable: false },
  ],
};

const metallisationConfig: TableConfig<any> = {
  columns: [
    { key: "coilNo", label: "Coil No.", type: "text", sortable: true },
    { key: "rmId", label: "RM ID", type: "text", sortable: true },
    { key: "weight", label: "Weight", type: "text", sortable: true },
    { key: "grossWeight", label: "Gross Weight", type: "text", sortable: true },
    { key: "usedWeight", label: "Used Weight", type: "text", sortable: true },
    { key: "factoryWastageWeight", label: "Factory Wastage Weight", type: "number", sortable: true },
    { key: "timestamp", label: "Timestamp", type: "date", sortable: true },
    { key: "nextStage", label: "Next Stage", type: "text", sortable: false },
    { key: "status", label: "Status", type: "enum", sortable: false, filter: "dropdown", options: WO_STATUS_OPTIONS },
    { key: "qr", label: "QR", type: "text", sortable: false },
    { key: "options", label: "Action", type: "text", sortable: false },
  ],
};

export default function OperatorStockPage() {
  const [activeTab, setActiveTab] = useState<"Metallisation" | "Slitting">("Metallisation");
  
  const [slittingData, setSlittingData] = useState<StockRow[]>([]);
  const [metallisationData, setMetallisationData] = useState<MetallisationRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [stockRows, metRows] = await Promise.all([
          stockService.list(),
          productionStageService.listMetallisation()
        ]);
        
        setSlittingData((stockRows as any[]).map((row: any) => ({
          stockId: row.stock_no || row.id,
          linkedWoId: row.work_orders?.work_order_no || "-",
          weight: row.weight_kg ? String(row.weight_kg) : "-",
          grossWeight: row.gross_weight_kg ? String(row.gross_weight_kg) : "-",
          usedWeight: row.used_weight_kg ? String(row.used_weight_kg) : "-",
          width: row.width_m ? String(row.width_m) : "-",
          micron: row.micron ? String(row.micron) : "-",
          grade: row.grade || "-",
          stage: row.stage === "Stock" ? "Ready for Winding" : (row.stage || "Ready for Winding"),
          timestamp: new Date(row.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }),
        })));
        
        setMetallisationData((metRows as any[]).map((met: any) => ({
          originalId: met.id,
          coilNo: met.coil_no || met.metallisation_no || met.id,
          rmId: met.inventory?.raw_material_code || met.inventory?.roll_no || "-",
          weight: met.weight_kg ? String(met.weight_kg) : "0",
          grossWeight: met.gross_weight_kg ? String(met.gross_weight_kg) : "-",
          usedWeight: met.used_weight_kg ? String(met.used_weight_kg) : "-",
          factoryWastageWeight: met.factory_wastage_kg ? String(met.factory_wastage_kg) : "0",
          timestamp: new Date(met.created_at).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }),
          nextStage: "Slitting",
          status: met.status || "Completed",
        })));
      } catch (err) {
        console.error("Failed to load stock data", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const currentConfig = activeTab === "Metallisation" ? metallisationConfig : stockConfig;
  const currentData = activeTab === "Metallisation" ? metallisationData : slittingData;
  const filterConfig = activeTab === "Metallisation" ? filterConfigMet : filterConfigSlitting;

  const {
    processedData,
    sortConfig,
    handleSort: handleSortRaw,
    filters,
    handleFilterChange,
    dateRange,
    setDateRange,
    getPaginatedData,
    setCurrentPage,
  } = useTableControls({ data: currentData, config: currentConfig });

  const handleSort = handleSortRaw as (key: string | number | symbol) => void;

  const [searchQuery, setSearchQuery] = useState("");
  const [qrData, setQrData] = useState<QRModalData | null>(null);

  const [tableFiltersSlitting, setTableFiltersSlitting] = useState<FilterState>(() => {
    const state: FilterState = {};
    state.stage = [...STAGE_OPTIONS];
    state.status = [...WO_STATUS_OPTIONS];
    state.stockId = "";
    state.linkedWoId = "";
    state.grade = "";
    state.coilNo = "";
    state.rmId = "";
    state.weightMin = "";
    state.weightMax = "";
    state.widthMin = "";
    state.widthMax = "";
    state.micronMin = "";
    state.micronMax = "";
    state.factoryWastageWeightMin = "";
    state.factoryWastageWeightMax = "";
    return state;
  });

  const [tableFiltersMet, setTableFiltersMet] = useState<FilterState>(() => {
    const state: FilterState = {};
    state.stage = [...STAGE_OPTIONS];
    state.status = [...WO_STATUS_OPTIONS];
    state.stockId = "";
    state.linkedWoId = "";
    state.grade = "";
    state.coilNo = "";
    state.rmId = "";
    state.weightMin = "";
    state.weightMax = "";
    state.widthMin = "";
    state.widthMax = "";
    state.micronMin = "";
    state.micronMax = "";
    state.factoryWastageWeightMin = "";
    state.factoryWastageWeightMax = "";
    return state;
  });

  const tableFilters = activeTab === "Metallisation" ? tableFiltersMet : tableFiltersSlitting;

  const handleApplyFilters = (newFilters: FilterState) => {
    if (activeTab === "Metallisation") {
      setTableFiltersMet(newFilters);
    } else {
      setTableFiltersSlitting(newFilters);
    }
  };

  const handleRemoveFilter = (key: string) => {
    if (activeTab === "Metallisation") {
      if (key === "status") {
        setTableFiltersMet({ ...tableFiltersMet, status: [...WO_STATUS_OPTIONS] });
      } else if (key === "coilNo") {
        setTableFiltersMet({ ...tableFiltersMet, coilNo: "" });
      } else if (key === "rmId") {
        setTableFiltersMet({ ...tableFiltersMet, rmId: "" });
      } else if (key === "weightMin") {
        setTableFiltersMet({ ...tableFiltersMet, weightMin: "", weightMax: "" });
      } else if (key === "factoryWastageWeightMin") {
        setTableFiltersMet({ ...tableFiltersMet, factoryWastageWeightMin: "", factoryWastageWeightMax: "" });
      }
    } else {
      if (key === "stage") {
        setTableFiltersSlitting({ ...tableFiltersSlitting, stage: [...STAGE_OPTIONS] });
      } else if (key === "stockId") {
        setTableFiltersSlitting({ ...tableFiltersSlitting, stockId: "" });
      } else if (key === "linkedWoId") {
        setTableFiltersSlitting({ ...tableFiltersSlitting, linkedWoId: "" });
      } else if (key === "grade") {
        setTableFiltersSlitting({ ...tableFiltersSlitting, grade: "" });
      } else if (key === "weightMin") {
        setTableFiltersSlitting({ ...tableFiltersSlitting, weightMin: "", weightMax: "" });
      } else if (key === "widthMin") {
        setTableFiltersSlitting({ ...tableFiltersSlitting, widthMin: "", widthMax: "" });
      } else if (key === "micronMin") {
        setTableFiltersSlitting({ ...tableFiltersSlitting, micronMin: "", micronMax: "" });
      }
    }
  };

  const filteredData = processedData.filter((row: any) => {
    if (activeTab === "Metallisation") {
      const f = tableFiltersMet;
      if (searchQuery && !row.coilNo.toLowerCase().includes(searchQuery.toLowerCase()) && !row.rmId.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (!(f.status as string[])?.includes(row.status)) return false;
      if (f.coilNo && !row.coilNo.toLowerCase().includes((f.coilNo as string).toLowerCase())) return false;
      if (f.rmId && !row.rmId.toLowerCase().includes((f.rmId as string).toLowerCase())) return false;
      const weightNum = parseFloat(row.weight);
      if (f.weightMin && !isNaN(weightNum) && weightNum < parseFloat(f.weightMin as string)) return false;
      if (f.weightMax && !isNaN(weightNum) && weightNum > parseFloat(f.weightMax as string)) return false;
      const fwwNum = parseFloat(row.factoryWastageWeight);
      if (f.factoryWastageWeightMin && !isNaN(fwwNum) && fwwNum < parseFloat(f.factoryWastageWeightMin as string)) return false;
      if (f.factoryWastageWeightMax && !isNaN(fwwNum) && fwwNum > parseFloat(f.factoryWastageWeightMax as string)) return false;
      return true;
    } else {
      const f = tableFiltersSlitting;
      if (searchQuery && !row.stockId.toLowerCase().includes(searchQuery.toLowerCase()) && !row.linkedWoId.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (!(f.stage as string[])?.includes(row.stage)) return false;
      if (f.stockId && !row.stockId.toLowerCase().includes((f.stockId as string).toLowerCase())) return false;
      if (f.linkedWoId && !row.linkedWoId.toLowerCase().includes((f.linkedWoId as string).toLowerCase())) return false;
      if (f.grade && row.grade !== (f.grade as string)) return false;
      const weightNum = parseFloat(row.weight);
      if (f.weightMin && !isNaN(weightNum) && weightNum < parseFloat(f.weightMin as string)) return false;
      if (f.weightMax && !isNaN(weightNum) && weightNum > parseFloat(f.weightMax as string)) return false;
      const widthNum = parseFloat(row.width);
      if (f.widthMin && !isNaN(widthNum) && widthNum < parseFloat(f.widthMin as string)) return false;
      if (f.widthMax && !isNaN(widthNum) && widthNum > parseFloat(f.widthMax as string)) return false;
      const micronNum = parseFloat(row.micron);
      if (f.micronMin && !isNaN(micronNum) && micronNum < parseFloat(f.micronMin as string)) return false;
      if (f.micronMax && !isNaN(micronNum) && micronNum > parseFloat(f.micronMax as string)) return false;
      return true;
    }
  });

  const { paginatedData, totalPages, validPage: currentPage } = getPaginatedData(filteredData);

  const totalLots = slittingData.length;
  const slittingLots = slittingData.filter((row) => row.stage === "Slitting").length;
  const windingReadyLots = slittingData.filter((row) => row.stage === "Ready for Winding").length;
  const completedLots = slittingData.filter((row) => row.stage === "Completed").length;
  const gradeALots = slittingData.filter((row) => row.grade === "A").length;

  const totalCoils = metallisationData.length;
  const completedCoils = metallisationData.filter(row => row.status === "Completed").length;

  const kpiStats = activeTab === "Metallisation" ? [
    { label: "Total Coils", value: String(totalCoils), icon: Package, valClass: "text-[#171717]", subtext: "All metallisation output coils" },
    { label: "Completed Coils", value: String(completedCoils), icon: CheckCircle, valClass: "text-[#171717]", subtext: "Available for next stage" },
  ] : [
    { label: "Total Product Lots", value: String(totalLots), icon: Package, valClass: "text-[#171717]", subtext: `${gradeALots} grade A lots` },
    { label: "Slitting Queue", value: String(slittingLots), icon: Scissors, valClass: "text-[#171717]", subtext: "Currently in cut processing" },
    { label: "Ready for Winding", value: String(windingReadyLots), icon: ArrowRight, valClass: "text-[#171717]", subtext: "Available for next stage" },
    { label: "Completed Lots", value: String(completedLots), icon: CheckCircle, valClass: "text-[#171717]", subtext: completedLots > 0 ? "Ready for dispatch" : "No completed lots" },
  ];

  if (loading) return <div className="p-6 text-center text-[#5C5C5C]">Loading stock data...</div>;

  return (
    <div className="font-dm-sans min-h-[calc(100vh-72px)] bg-white flex flex-col overflow-x-hidden">
      <MobileHeader title="Stock Management" />

      {/* Mobile KPI 2x2 */}
      <section className="grid grid-cols-2 gap-0 md:hidden mx-4 mt-6 bg-white border border-[#EBEBEB] rounded-[12px]">
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
      <section className={`hidden md:grid grid-cols-1 ${activeTab === "Metallisation" ? 'lg:grid-cols-2' : 'lg:grid-cols-4'} mx-4 md:mx-6 mt-6 bg-white border border-[#EBEBEB] rounded-[12px] items-center p-5`}>
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
              placeholder={`Search by ${activeTab === "Metallisation" ? "Coil No" : "Stock ID"}...`}
              className="h-[40px] w-full pl-9 pr-3 bg-white border border-[#EBEBEB] rounded-[8px] text-[14px] text-[#171717] placeholder:text-[#A1A1AA] focus:outline-none focus:border-[#00B6E2]"
            />
          </div>
          <TableToolbar
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            onExport={() => {
              if (activeTab === "Metallisation") {
                const exportData = filteredData.map((row: any) => ({
                  "Coil No": row.coilNo,
                  "RM ID": row.rmId,
                  "Weight": row.weight,
                  "Gross Weight": row.grossWeight,
                  "Used Weight": row.usedWeight,
                  "Factory Wastage": row.factoryWastageWeight,
                  "Timestamp": row.timestamp,
                  "Next Stage": row.nextStage,
                  "Status": row.status,
                }));
                exportToExcel(exportData, "metallisation_stock", "Metallisation Stock");
              } else {
                const exportData = filteredData.map((row: any) => ({
                  "Stock ID": row.stockId,
                  "Linked WO ID": row.linkedWoId,
                  "Weight": row.weight,
                  "Gross Weight": row.grossWeight,
                  "Used Weight": row.usedWeight,
                  "Width": row.width,
                  "Micron": row.micron,
                  "Grade": row.grade,
                  "Stage": row.stage,
                  "Timestamp": row.timestamp,
                }));
                exportToExcel(exportData, "slitting_stock", "Slitting Stock");
              }
            }}
            filterConfig={filterConfig}
            filters={tableFilters}
            onApplyFilters={handleApplyFilters}
          />
        </section>

        <FilterChips config={filterConfig} filters={tableFilters} onRemove={handleRemoveFilter} />

        {/* Tabs */}
        <div className="overflow-x-auto -mx-4 md:mx-0 px-4 md:px-0">
          <div className="flex items-center gap-2 border-b border-[#EBEBEB] pb-4 min-w-max">
            {(["Metallisation", "Slitting"] as TabType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as TabType)}
                className={`px-4 py-2 text-[14px] font-medium rounded-[8px] transition-colors whitespace-nowrap ${
                  activeTab === tab ? "bg-[#00B6E2] text-white" : "bg-white text-[#5C5C5C] hover:bg-[#F5F7FA]"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <section className="bg-white rounded-[12px] flex flex-col gap-4 overflow-hidden">
          <div className="border border-[#EAECF0] rounded-[8px] overflow-x-auto min-h-[300px]">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-[#F5F7FA] border-b border-[#EBEBEB]">
                  {currentConfig.columns.map((col) => (
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
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAECF0]">
                {paginatedData.length > 0 ? paginatedData.map((row: any, idx: number) => (
                  <tr key={idx} className="hover:bg-gray-50/50 transition-colors group">
                    {activeTab === "Metallisation" ? (
                      <>
                        <td className="px-4 py-4 text-[14px] font-medium text-[#171717] whitespace-nowrap">{row.coilNo}</td>
                        <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.rmId}</td>
                        <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap tabular-nums">{row.weight}kgs</td>
                        <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap tabular-nums">{row.grossWeight}kgs</td>
                        <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap tabular-nums">{row.usedWeight}kgs</td>
                        <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap tabular-nums">{row.factoryWastageWeight}kgs</td>
                        <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.timestamp}</td>
                        <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.nextStage}</td>
                        <td className="px-4 py-4 whitespace-nowrap"><StatusBadge status={row.status} /></td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <button onClick={() => setQrData({ id: row.coilNo, type: "MC", data: { coilNo: row.coilNo, rmId: row.rmId, weight: row.weight, status: row.status } })} className="text-[#5C5C5C] hover:text-[#00B6E2] transition-colors">
                            <QrCode className="w-4 h-4" />
                          </button>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <OptionsDropdown
                            status={row.status}
                            onEdit={() => {}}
                            onDelete={() => {}}
                          />
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-4 text-[14px] font-medium text-[#00B6E2] whitespace-nowrap">
                          <Link href={`/person-a/stock/${row.stockId}`} className="hover:underline cursor-pointer">
                            {row.stockId}
                          </Link>
                        </td>
                        <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.weight}</td>
                        <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.grossWeight}</td>
                        <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.usedWeight}</td>
                        <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.width}</td>
                        <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.micron}</td>
                        <td className="px-4 py-4 text-[14px] font-medium text-[#171717] whitespace-nowrap">{row.grade}</td>
                        <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">
                          <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-[6px] text-xs font-medium tracking-wide">
                              {row.stage}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.timestamp}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <button onClick={() => setQrData({ id: row.stockId, type: "RM", data: { rollNo: row.stockId, linkedWoId: row.linkedWoId, weight: row.weight, width: row.width, micron: row.micron, grade: row.grade, stage: row.stage } })} className="text-[#5C5C5C] hover:text-[#00B6E2] transition-colors">
                            <QrCode className="w-4 h-4" />
                          </button>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <OptionsDropdown
                            status="Yet to Start"
                            onEdit={() => {}}
                            onDelete={() => {}}
                          />
                        </td>
                      </>
                    )}
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={currentConfig.columns.length} className="px-4 py-8 text-center text-[#5C5C5C] text-[14px]">
                      No stock available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <TablePagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </div>
        </section>
      </div>
      {qrData && <QRCodeModal id={qrData.id} type={qrData.type} data={qrData.data} onClose={() => setQrData(null)} />}
    </div>
  );
}
