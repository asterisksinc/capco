"use client";

import { Plus, Search, QrCode } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Package, Scissors, ArrowRight, CheckCircle } from "lucide-react";
import { stockService } from "@/src/services/stockService";
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
import { productionStageService } from "@/src/services/productionStageService";

type StockRow = {
  stockId: string;
  linkedWoId: string;
  weight: string;
  grossWeight: string;
  usedWeight: string;
  width: string;
  micron: string;
  grade: string;
  stage: string;
  timestamp: string;
  coilNo: string;
};

const STAGE_OPTIONS = ["Slitting", "Ready for Winding", "Completed"];

const statusFilter: EnumFilter = { label: "Stage", key: "stage", options: STAGE_OPTIONS };
const textFilters: TextFilter[] = [
  { label: "Product No", key: "stockId", placeholder: "Search..." },
  { label: "Linked WO ID", key: "linkedWoId", placeholder: "Search..." },
  { label: "Grade", key: "grade" },
];
const numberFilters: NumberRangeFilter[] = [
  { label: "Weight", minKey: "weightMin", maxKey: "weightMax" },
  { label: "Width", minKey: "widthMin", maxKey: "widthMax" },
  { label: "Micron", minKey: "micronMin", maxKey: "micronMax" },
];

const filterConfig: FilterConfig = {
  enums: [statusFilter],
  texts: textFilters,
  numberRanges: numberFilters,
};

const stockConfig: TableConfig<StockRow> = {
  columns: [
    { key: "stockId", label: "Product No", type: "text", sortable: true },
    { key: "width", label: "Width", type: "text", sortable: true },
    { key: "micron", label: "Micron", type: "text", sortable: true },
    { key: "weight", label: "Weight", type: "text", sortable: true },
    { key: "grossWeight", label: "Gross Weight", type: "text", sortable: true },
    { key: "usedWeight", label: "Used Weight", type: "text", sortable: true },
    { key: "grade", label: "Grade", type: "text", sortable: true },
    { key: "stage", label: "Stage", type: "enum", sortable: false, filter: "dropdown", options: ["Slitting", "Ready for Winding", "Completed"] },
    { key: "timestamp", label: "Timestamp", type: "date", sortable: true },
    { key: "qr", label: "QR", type: "text", sortable: false },
    { key: "options", label: "Action", type: "text", sortable: false },
  ],
};

export default function OperatorSlittingStockPage() {
  const [data, setData] = useState<StockRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [rows, slittingRows] = await Promise.all([
          stockService.list(),
          productionStageService.listSlitting()
        ]);

        const slittingById = new Map((slittingRows as any[]).map((s) => [s.id, s]));

        setData(rows.map((row: any) => {
          const slitting = slittingById.get(row.slitting_id);

          return {
            stockId: row.stock_no || row.id,
            coilNo: slitting?.metallisation?.coil_no || slitting?.metallisation?.metallisation_no || "-",
            linkedWoId: row.work_orders?.work_order_no || "-",
            width: row.width_m ? String(row.width_m) : "-",
            micron: row.micron ? String(row.micron) : "-",
            weight: row.weight_kg ? String(row.weight_kg) : "-",
            grossWeight: row.gross_weight_kg || row.slitting?.gross_weight_kg ? String(row.gross_weight_kg || row.slitting?.gross_weight_kg) : "-",
            usedWeight: row.used_weight_kg || row.slitting?.used_weight_kg ? String(row.used_weight_kg || row.slitting?.used_weight_kg) : "-",
            grade: row.grade || "-",
            stage: row.stage === "Stock" ? "Ready for Winding" : (row.stage || "Ready for Winding"),
            timestamp: new Date(row.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }),
          }
        }));
      } catch (err) {
        console.error("Failed to load stock data", err);
      } finally {
        setLoading(false);
      }
    }
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
  } = useTableControls({ data: data, config: stockConfig });

  const [searchQuery, setSearchQuery] = useState("");
  const [qrData, setQrData] = useState<QRModalData | null>(null);

  const [tableFilters, setTableFilters] = useState<FilterState>(() => {
    const state: FilterState = {};
    state.stage = [...STAGE_OPTIONS];
    state.stockId = "";
    state.linkedWoId = "";
    state.grade = "";
    state.weightMin = "";
    state.weightMax = "";
    state.widthMin = "";
    state.widthMax = "";
    state.micronMin = "";
    state.micronMax = "";
    return state;
  });

  const handleApplyFilters = (newFilters: FilterState) => {
    setTableFilters(newFilters);
  };

  const handleRemoveFilter = (key: string) => {
    if (key === "stage") {
      setTableFilters({ ...tableFilters, stage: [...STAGE_OPTIONS] });
    } else if (key === "stockId") {
      setTableFilters({ ...tableFilters, stockId: "" });
    } else if (key === "linkedWoId") {
      setTableFilters({ ...tableFilters, linkedWoId: "" });
    } else if (key === "grade") {
      setTableFilters({ ...tableFilters, grade: "" });
    } else if (key === "weightMin") {
      setTableFilters({ ...tableFilters, weightMin: "", weightMax: "" });
    } else if (key === "widthMin") {
      setTableFilters({ ...tableFilters, widthMin: "", widthMax: "" });
    } else if (key === "micronMin") {
      setTableFilters({ ...tableFilters, micronMin: "", micronMax: "" });
    }
  };

  const filteredData = processedData.filter((row) => {
    const f = tableFilters;
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
  });

  const { paginatedData, totalPages, validPage: currentPage } = getPaginatedData(filteredData);

  const totalLots = data.length;
  const slittingLots = data.filter((row) => row.stage === "Slitting").length;
  const windingReadyLots = data.filter((row) => row.stage === "Ready for Winding").length;
  const completedLots = data.filter((row) => row.stage === "Completed").length;
  const gradeALots = data.filter((row) => row.grade === "A").length;

  const kpiStats = [
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
              placeholder="Search by Stock ID..."
              className="h-[40px] w-full pl-9 pr-3 bg-white border border-[#EBEBEB] rounded-[8px] text-[14px] text-[#171717] placeholder:text-[#A1A1AA] focus:outline-none focus:border-[#00B6E2]"
            />
          </div>
          <TableToolbar
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            onExport={(scope = "all") => {
              const dataToExport = scope === "all" ? filteredData : paginatedData;
              const exportData = dataToExport.map(row => ({
                "Stock ID": row.stockId,
                "Linked WO ID": row.linkedWoId,
                "Width": row.width,
                "Micron": row.micron,
                "Weight": row.weight,
                "Gross Weight": row.grossWeight,
                "Used Weight": row.usedWeight,
                "Grade": row.grade,
                "Stage": row.stage,
                "Timestamp": row.timestamp,
              }));
              exportToExcel(exportData, "stock", "Stock");
            }}
            filterConfig={filterConfig}
            filters={tableFilters}
            onApplyFilters={handleApplyFilters}
          />
        </section>

        <FilterChips config={filterConfig} filters={tableFilters} onRemove={handleRemoveFilter} />

        <section className="bg-white rounded-[12px] flex flex-col gap-4 overflow-hidden">
          <div className="border border-[#EAECF0] rounded-[8px] overflow-x-auto min-h-[300px]">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-[#F5F7FA] border-b border-[#EBEBEB]">
                  {stockConfig.columns.map((col) => (
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
                {paginatedData.length > 0 ? paginatedData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-4 py-4 text-[14px] font-medium text-[#00B6E2] whitespace-nowrap">
                      <Link href={`/person-a/stock/${row.stockId}`} className="hover:underline cursor-pointer">
                        {row.stockId}
                      </Link>
                    </td>
                    <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.width}</td>
                    <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.micron}</td>
                    <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.weight}kgs</td>
                    <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.grossWeight}kgs</td>
                    <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.usedWeight}kgs</td>
                    <td className="px-4 py-4 text-[14px] font-medium text-[#171717] whitespace-nowrap">{row.grade}</td>
                    <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">
                      <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-[6px] text-xs font-medium tracking-wide">
                        {row.stage}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.timestamp}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button onClick={() => setQrData({ id: row.stockId, type: "PM", data: { coilId: row.coilNo, weight: row.weight ?? "", grade: row.grade ?? "", date: row.timestamp ?? "", stage: row.stage ?? "" } })} className="text-[#5C5C5C] hover:text-[#00B6E2] transition-colors">
                        <QrCode className="w-4 h-4" />
                      </button>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <OptionsDropdown
                        status="Yet to Start"
                        onEdit={() => { }}
                        onDelete={() => { }}
                      />
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-[#5C5C5C] text-[14px]">
                      No stock available. Complete slitting on a work order to generate stock.
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
