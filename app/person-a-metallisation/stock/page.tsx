"use client";

import { Search } from "lucide-react";
import { useState, useEffect } from "react";
import { productionStageService } from "@/src/services/productionStageService";
import type { TableConfig } from "@/hooks/useTableControls";
import { TablePagination } from "@/components/table/TablePagination";
import { useTableControls } from "@/hooks/useTableControls";
import { SortableHeader } from "@/components/table/SortableHeader";
import { TableToolbar } from "@/components/table/TableToolbar";
import { OptionsDropdown } from "@/components/table/OptionsDropdown";
import { FilterChips, type FilterConfig, type TextFilter, type NumberRangeFilter, type EnumFilter, type FilterState } from "@/components/table/FilterPopover";
import { MobileHeader } from "@/components/MobileHeader";
import { WO_STATUS_OPTIONS } from "@/lib/constants";
import { QRCodeModal, type QRModalData } from "@/components/QRCodeModal";
import { exportToExcel } from "@/lib/exportExcel";
import { QrCode, Package, CheckCircle } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import Link from "next/link";

type MetallisationRow = {
  coilNo: string;
  rmId: string;
  weight: string;
  grossWeight: string;
  usedWeight: string;
  factoryWastageWeight: string;
  timestamp: string;
  nextStage: string;
  status: string;
  originalId: string;
};

const textFilters: TextFilter[] = [
  { label: "Coil No.", key: "coilNo", placeholder: "Search..." },
  { label: "RM ID", key: "rmId", placeholder: "Search..." },
];

const numberFilters: NumberRangeFilter[] = [
  { label: "Weight", minKey: "weightMin", maxKey: "weightMax" },
  { label: "Factory Wastage", minKey: "factoryWastageWeightMin", maxKey: "factoryWastageWeightMax" },
];

const statusFilter: EnumFilter = { label: "Status", key: "status", options: WO_STATUS_OPTIONS };

const filterConfig: FilterConfig = {
  texts: textFilters,
  numberRanges: numberFilters,
  enums: [statusFilter]
};

const metallisationConfig: TableConfig<MetallisationRow> = {
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

export default function OperatorMetallisationStockPage() {
  const [data, setData] = useState<MetallisationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrData, setQrData] = useState<QRModalData | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const rows = await productionStageService.listMetallisation();
        setData((rows as any[]).map((met: any) => ({
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
        console.error("Failed to load metallisation stock data", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

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
  } = useTableControls({ data, config: metallisationConfig });

  const handleSort = handleSortRaw as (key: string | number | symbol) => void;
  const [searchQuery, setSearchQuery] = useState("");
  
  const [tableFilters, setTableFilters] = useState<FilterState>(() => {
    const state: FilterState = {};
    state.status = [...WO_STATUS_OPTIONS];
    state.coilNo = "";
    state.rmId = "";
    state.weightMin = "";
    state.weightMax = "";
    state.factoryWastageWeightMin = "";
    state.factoryWastageWeightMax = "";
    return state;
  });

  const handleApplyFilters = (newFilters: FilterState) => {
    setTableFilters(newFilters);
  };

  const handleRemoveFilter = (key: string) => {
    if (key === "status") {
      setTableFilters({ ...tableFilters, status: [...WO_STATUS_OPTIONS] });
    } else if (key === "coilNo") {
      setTableFilters({ ...tableFilters, coilNo: "" });
    } else if (key === "rmId") {
      setTableFilters({ ...tableFilters, rmId: "" });
    } else if (key === "weightMin") {
      setTableFilters({ ...tableFilters, weightMin: "", weightMax: "" });
    } else if (key === "factoryWastageWeightMin") {
      setTableFilters({ ...tableFilters, factoryWastageWeightMin: "", factoryWastageWeightMax: "" });
    }
  };

  const filteredData = processedData.filter((row) => {
    const f = tableFilters;
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
  });

  const { paginatedData, totalPages, validPage: currentPage } = getPaginatedData(filteredData);

  const totalCoils = data.length;
  const completedCoils = data.filter(row => row.status === "Completed").length;

  const kpiStats = [
    { label: "Total Coils", value: String(totalCoils), icon: Package, valClass: "text-[#171717]", subtext: "All metallisation output coils" },
    { label: "Completed Coils", value: String(completedCoils), icon: CheckCircle, valClass: "text-[#171717]", subtext: "Available for next stage" },
  ];

  if (loading) return <div className="p-6 text-center text-[#5C5C5C]">Loading stock...</div>;

  return (
    <div className="font-dm-sans min-h-[calc(100vh-72px)] bg-white flex flex-col overflow-x-hidden">
      <MobileHeader title="Metallisation Stock" />

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
      <section className="hidden md:grid grid-cols-1 lg:grid-cols-2 mx-4 md:mx-6 mt-6 bg-white border border-[#EBEBEB] rounded-[12px] items-center p-5">
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
              placeholder="Search by Coil No..."
              className="h-[40px] w-full pl-9 pr-3 bg-white border border-[#EBEBEB] rounded-[8px] text-[14px] text-[#171717] placeholder:text-[#A1A1AA] focus:outline-none focus:border-[#00B6E2]"
            />
          </div>
          <TableToolbar
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            onExport={(scope = "all") => {
            const dataToExport = scope === "all" ? filteredData : paginatedData;
            const exportData = dataToExport.map(row => ({
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
                  {metallisationConfig.columns.map((col) => (
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
                    <td className="px-4 py-4 text-[14px] font-medium text-[#171717] whitespace-nowrap">{row.coilNo}</td>
                    <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.rmId}</td>
                    <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.weight}kgs</td>
                    <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.grossWeight}kgs</td>
                    <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.usedWeight}kgs</td>
                    <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.factoryWastageWeight}kgs</td>
                    <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.timestamp}</td>
                    <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.nextStage}</td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button onClick={() => setQrData({ id: row.coilNo, type: "MC", data: { coilNo: row.coilNo, rmId: row.rmId, factoryWastageWeight: row.factoryWastageWeight, weight: row.weight, date: row.timestamp, status: row.status } })} className="text-[#5C5C5C] hover:text-[#00B6E2] transition-colors">
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
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={metallisationConfig.columns.length} className="px-4 py-8 text-center text-[#5C5C5C] text-[14px]">
                      No coils available.
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
