"use client";

import { Search, QrCode } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { productOrderService } from "@/src/services/productOrderService";
import type { TableConfig } from "@/hooks/useTableControls";
import { TablePagination } from "@/components/table/TablePagination";
import { useTableControls } from "@/hooks/useTableControls";
import { SortableHeader } from "@/components/table/SortableHeader";
import { TableToolbar } from "@/components/table/TableToolbar";
import { OptionsDropdown } from "@/components/table/OptionsDropdown";
import { FilterChips, type FilterConfig, type FilterState, type EnumFilter, type TextFilter } from "@/components/table/FilterPopover";
import { exportToExcel } from "@/lib/exportExcel";
import { MobileHeader } from "@/components/MobileHeader";
import { QRCodeModal, type QRModalData } from "@/components/QRCodeModal";

type ProductOrderRow = {
  id: string;
  code: string;
  type: string;
  grade: string;
  batchSize: string;
  status: string;
  stage: string;
  timestamp: string;
  [key: string]: string;
};

const STATUS_OPTIONS = ["Yet to Start", "In-progress", "Completed"];
const STAGE_OPTIONS = ["Yet to Start", "Raw Material", "Metallisation", "Slitting", "Completed"];

const statusFilter: EnumFilter = { label: "Status", key: "status", options: STATUS_OPTIONS };
const stageFilter: EnumFilter = { label: "Stage", key: "stage", options: STAGE_OPTIONS };
const textFilters: TextFilter[] = [
  { label: "Product Code", key: "productCode", placeholder: "Search..." },
  { label: "Grade", key: "grade" },
];

const filterConfig: FilterConfig = {
  enums: [statusFilter, stageFilter],
  texts: textFilters,
};

const config: TableConfig<ProductOrderRow> = {
  columns: [
    { key: "id", label: "Order ID", type: "text", sortable: true },
    { key: "code", label: "Product Code", type: "text", sortable: true },
    { key: "type", label: "Capacitor Type", type: "text", sortable: true },
    { key: "grade", label: "Grade", type: "text", sortable: true },
    { key: "batchSize", label: "Batch Size", type: "number", sortable: true },
    { key: "status", label: "Status", type: "enum", sortable: false, filter: "dropdown", options: STATUS_OPTIONS },
    { key: "stage", label: "Stage", type: "enum", sortable: false, filter: "dropdown", options: STAGE_OPTIONS },
    { key: "timestamp", label: "Created", type: "date", sortable: true },
    { key: "qr", label: "QR", type: "text", sortable: false },
    { key: "options", label: "Action", type: "text", sortable: false }
  ]
};

function StatusBadge({ status }: { status: string }) {
  if (status === "Yet to Start") return <span className="inline-flex items-center px-2 py-0.5 rounded-[12px] bg-[#FFF0F1] text-[#FB3748] text-[12px] font-medium">Yet to Start</span>;
  if (status === "In-progress") return <span className="inline-flex items-center px-2 py-0.5 rounded-[12px] bg-[#FFF4ED] text-[#E19242] text-[12px] font-medium">In-progress</span>;
  if (status === "Completed") return <span className="inline-flex items-center px-2 py-0.5 rounded-[12px] bg-[#E8F8F0] text-[#1CB061] text-[12px] font-medium">Completed</span>;
  return null;
}

export default function PersonAProductOrdersPage() {
  const [productOrders, setProductOrders] = useState<ProductOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [qrData, setQrData] = useState<QRModalData | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await productOrderService.list();
        setProductOrders(data.map((po: any) => ({
          id: po.product_order_no || po.id,
          originalId: po.id,
          code: po.product_code || "-",
          type: po.capacitor_type || "-",
          grade: po.grade || "-",
          batchSize: po.batch_size ? String(po.batch_size) : "-",
          status: po.status || "Yet to Start",
          stage: po.stage || "Raw Material",
          timestamp: new Date(po.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
        })));
      } catch (err) {
        console.error("Failed to load product orders", err);
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
  } = useTableControls({ data: productOrders, config });

  const handleSort = handleSortRaw as (key: string | number | symbol) => void;

  const [tableFilters, setTableFilters] = useState<FilterState>(() => {
    const state: FilterState = {};
    state.status = [...STATUS_OPTIONS];
    state.stage = [...STAGE_OPTIONS];
    state.productCode = "";
    state.grade = "";
    return state;
  });

  const handleApplyFilters = (newFilters: FilterState) => setTableFilters(newFilters);

  const handleRemoveFilter = (key: string) => {
    if (key === "status") setTableFilters({ ...tableFilters, status: [...STATUS_OPTIONS] });
    else if (key === "stage") setTableFilters({ ...tableFilters, stage: [...STAGE_OPTIONS] });
    else if (key === "productCode") setTableFilters({ ...tableFilters, productCode: "" });
    else if (key === "grade") setTableFilters({ ...tableFilters, grade: "" });
  };

  const filteredData = processedData.filter((row) => {
    const f = tableFilters;
    if (searchQuery && !row.id.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (!(f.status as string[])?.includes(row.status)) return false;
    if (!(f.stage as string[])?.includes(row.stage)) return false;
    if (f.productCode && !row.code.toLowerCase().includes((f.productCode as string).toLowerCase())) return false;
    if (f.grade && row.grade !== (f.grade as string)) return false;
    return true;
  });

  const { paginatedData, totalPages, validPage: currentPage } = getPaginatedData(filteredData);

  if (loading) return <div className="p-6 text-center text-[#5C5C5C]">Loading product orders...</div>;

  return (
    <div className="font-dm-sans min-h-[calc(100vh-72px)] bg-white flex flex-col overflow-x-hidden">
      <MobileHeader title="Product Orders" />

      <div className="w-full px-4 md:px-6 pt-[72px] md:pt-6 pb-6 flex flex-col gap-6">
        <section className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative max-w-[400px] w-full">
            <Search className="w-4 h-4 text-[#A1A1AA] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input type="text" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} placeholder="Search by Order ID..." className="h-[40px] w-full pl-9 pr-3 bg-white border border-[#EBEBEB] rounded-[8px] text-[14px] placeholder:text-[#A1A1AA] focus:outline-none focus:border-[#00B6E2]" />
          </div>
          <TableToolbar dateRange={dateRange} onDateRangeChange={setDateRange} onExport={(scope = "all") => {
            const dataToExport = scope === "all" ? filteredData : paginatedData;
            const exportData = dataToExport.map(row => ({
              "Order ID": row.id, "Product Code": row.code, "Type": row.type, "Grade": row.grade,
              "Batch Size": row.batchSize, "Status": row.status, "Stage": row.stage, "Created": row.timestamp,
            }));
            exportToExcel(exportData, "product-orders", "Product Orders");
          }} filterConfig={filterConfig} filters={tableFilters} onApplyFilters={handleApplyFilters} />
        </section>
        <FilterChips config={filterConfig} filters={tableFilters} onRemove={handleRemoveFilter} />

        <section className="bg-white rounded-[12px] flex flex-col gap-4 overflow-hidden">
          <div className="border border-[#EAECF0] rounded-[8px] overflow-x-auto min-h-[300px]">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-[#F5F7FA] border-b border-[#EBEBEB]">
                  {config.columns.map((col) => (
                    <th key={String(col.key)} className="px-4 py-[11px]">
                      <SortableHeader column={col} sortConfig={sortConfig} onSort={handleSort} filters={filters} onFilterChange={handleFilterChange} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAECF0]">
                {paginatedData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-4 py-4 text-[14px] font-medium text-[#00B6E2] whitespace-nowrap">
                      <Link href={`/person-a/product-orders/${row.id.replace('#', '')}`} className="hover:underline">{row.id}</Link>
                    </td>
                    <td className="px-4 py-4 text-[14px] text-[#5C5C5C]">{row.code}</td>
                    <td className="px-4 py-4 text-[14px] text-[#5C5C5C]">{row.type}</td>
                    <td className="px-4 py-4 text-[14px] text-[#5C5C5C]">{row.grade}</td>
                    <td className="px-4 py-4 text-[14px] text-[#5C5C5C]">{row.batchSize}</td>
                    <td className="px-4 py-4"><StatusBadge status={row.status} /></td>
                    <td className="px-4 py-4"><StatusBadge status={row.stage} /></td>
                    <td className="px-4 py-4 text-[14px] text-[#5C5C5C]">{row.timestamp}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => setQrData({ id: row.id, type: "PO", data: { productCode: row.code, type: row.type, grade: row.grade, batchSize: row.batchSize, status: row.status } })} className="text-[#5C5C5C] hover:text-[#00B6E2] transition-colors">
                        <QrCode className="w-4 h-4" />
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <OptionsDropdown viewHref={`/person-a/product-orders/${row.id.replace('#', '')}`} status={row.status} />
                    </td>
                  </tr>
                ))}
                {paginatedData.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-8 text-center text-[#5C5C5C]">No product orders.</td></tr>
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
