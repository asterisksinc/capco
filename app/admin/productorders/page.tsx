"use client";

import { useState, useEffect, useMemo } from "react";
import { Search, QrCode, Loader2 } from "lucide-react";
import { QRCodeModal, type QRModalData } from "@/components/QRCodeModal";
import Link from "next/link";
import { productOrderService } from "@/src/services/productOrderService";
import { MobileHeader } from "@/components/MobileHeader";
import type { TableConfig } from "@/hooks/useTableControls";
import { TablePagination } from "@/components/table/TablePagination";
import { useTableControls } from "@/hooks/useTableControls";
import { SortableHeader } from "@/components/table/SortableHeader";
import { TableToolbar } from "@/components/table/TableToolbar";
import { exportToExcel } from "@/lib/exportExcel";

type ProductOrderSummary = {
  id: string;
  code: string;
  type: string;
  grade: string;
  batchSize: string;
  status: string;
  stage: string;
  timestamp: string;
};

const productOrderConfig: TableConfig<ProductOrderSummary> = {
  columns: [
    { key: "id", label: "Order ID", type: "text", sortable: true },
    { key: "code", label: "Product Code", type: "text", sortable: true },
    { key: "type", label: "Capacitor Type", type: "text", sortable: true },
    { key: "grade", label: "Grade", type: "text", sortable: true },
    { key: "batchSize", label: "Batch Size", type: "number", sortable: true },
    { key: "status", label: "Status", type: "enum", sortable: false, filter: "dropdown", options: ["Yet to Start", "In-progress", "Completed"] },
    { key: "stage", label: "Stage", type: "enum", sortable: false, filter: "dropdown", options: ["Yet to Start", "Raw Material", "Metallisation", "Slitting", "Completed"] },
    { key: "timestamp", label: "Created Timestamp", type: "date", sortable: true },
    { key: "qr", label: "QR", type: "text", sortable: false },
    { key: "options", label: "Action", type: "text", sortable: false }
  ]
};

export default function ProductOrdersPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ProductOrderSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [qrData, setQrData] = useState<QRModalData | null>(null);

  useEffect(() => {
    async function fetchOrders() {
      try {
        const data = await productOrderService.list();
        const formatted = (data as any[]).map(po => ({
          id: po.product_order_no,
          code: po.product_code || "-",
          type: po.capacitor_type || "-",
          grade: po.grade || "-",
          batchSize: String(po.batch_size || po.quantity || 0),
          status: po.status || "Yet to Start",
          stage: po.stage || "Raw Material",
          timestamp: new Date(po.created_at).toLocaleDateString("en-GB")
        }));
        setRows(formatted);
      } catch (error) {
        console.error("Failed to fetch product orders", error);
      } finally {
        setLoading(false);
      }
    }
    fetchOrders();
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
  } = useTableControls({ data: rows, config: productOrderConfig });

  const filteredData = useMemo(() => {
    return processedData.filter((row) => {
      if (searchQuery && !row.id.toLowerCase().includes(searchQuery.toLowerCase()) && !row.code.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [processedData, searchQuery]);

  const totalProductOrders = rows.length;
  const completedCount = rows.filter((row) => row.status === "Completed").length;
  const inProgressCount = rows.filter((row) => row.status === "In-progress").length;
  const yetToStartCount = rows.filter((row) => row.status === "Yet to Start").length;

  const { paginatedData, totalPages, validPage: currentPage } = getPaginatedData(filteredData);

  const kpiStats = [
    { label: "Total Product Orders", value: String(totalProductOrders), subtext: "All orders in store", subColor: "text-[#00B6E2]" },
    { label: "Yet to Start", value: String(yetToStartCount), subtext: "Not started yet", subColor: "text-[#FB3748]" },
    { label: "In-progress", value: String(inProgressCount), subtext: "Under execution", subColor: "text-[#E19242]" },
    { label: "Completed", value: String(completedCount), subtext: "Finished orders", subColor: "text-[#1CB061]" },
  ];

  return (
    <div className="font-dm-sans min-h-[calc(100vh-72px)] bg-white flex flex-col w-full max-w-full">
      {/* MOBILE TOP NAVIGATION BAR */}
      <MobileHeader title="Product Orders" />

      {/* MOBILE HEADER SPACER */}
      <div className="h-14 md:hidden"></div>

      {/* DESKTOP HEADER */}
      <section className="bg-white border-b border-[#EBEBEB] hidden md:block">
        <div className="px-6 py-6 flex flex-col">
          <h1 className="text-[20px] font-semibold text-[#171717]">Product Orders</h1>
          <p className="text-[14px] text-[#5C5C5C] mt-1">
            Track and manage product orders across their production stages
          </p>
        </div>
      </section>

      {/* MOBILE PAGE TITLE */}
      <section className="px-4 pt-4 sm:hidden">
        <h1 className="text-[16px] font-medium text-[#171717]">Product Orders</h1>
        <p className="text-[12px] text-[#5C5C5C] mt-1">
          Track and manage product orders across their production stages
        </p>
      </section>

      {/* STATS SECTION */}
      <section className="px-4 md:px-6 py-4 md:py-6">
        <div className="bg-white border border-[#EBEBEB] rounded-[12px] p-4 md:p-6 flex flex-col md:flex-row md:items-center gap-4 md:gap-0">
          {kpiStats.map((item, i) => (
            <div key={i} className="flex-1 flex flex-row md:flex-col justify-between md:justify-start items-center md:items-start border-b md:border-b-0 md:border-r border-[#EBEBEB] last:border-0 pb-3 md:pb-0 md:pl-6 first:pl-0">
              <div className="flex flex-col gap-1">
                <p className="text-[13px] text-[#5C5C5C]">{item.label}</p>
                <span className="text-[24px] font-semibold text-[#171717]">
                  {loading ? "-" : item.value}
                </span>
              </div>
              <span className={`text-[12px] font-medium ${item.subColor} md:mt-1`}>
                {item.subtext}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="px-4 md:px-6 pb-6 flex-1 flex flex-col">
        {/* TOOLBAR */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div className="relative w-full md:w-[400px]">
            <Search className="w-5 h-5 text-[#A1A1AA] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              placeholder="Search by Product Order ID or Code..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="h-[44px] w-full pl-10 pr-4 bg-white border border-[#EBEBEB] rounded-[8px] text-[14px] focus:outline-none focus:border-[#00B6E2]"
            />
          </div>

          <TableToolbar dateRange={dateRange} onDateRangeChange={setDateRange} onExport={(scope = "all") => {
            const dataToExport = scope === "all" ? filteredData : paginatedData;
            const exportData = dataToExport.map((row: any) => ({
              "Order ID": row.id ?? "",
              "Product Code": row.code ?? "",
              "Capacitor Type": row.type ?? "",
              "Grade": row.grade ?? "",
              "Batch Size": row.batchSize ?? "",
              "Status": row.status ?? "",
              "Stage": row.stage ?? "",
              "Created Timestamp": row.timestamp ?? "",
            }));
            exportToExcel(exportData, "product-orders", "Product Orders");
          }} />
        </div>

        {/* TABLE */}
        <div className="bg-white border border-[#EBEBEB] rounded-[12px] overflow-hidden flex-1 relative">
          <div className="overflow-x-auto min-h-[300px]">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="border-b border-[#EBEBEB] bg-[#F9FAFB]">
                  {productOrderConfig.columns.map((col) => (
                    <th key={String(col.key)} className="px-6 py-4 text-[13px] font-semibold text-[#171717]">
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
              <tbody className="divide-y divide-[#EBEBEB]">
                {loading ? (
                  <tr>
                    <td colSpan={productOrderConfig.columns.length} className="px-6 py-20 text-center">
                      <div className="flex justify-center items-center h-full">
                        <Loader2 className="w-8 h-8 animate-spin text-[#00B6E2]" />
                      </div>
                    </td>
                  </tr>
                ) : filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={productOrderConfig.columns.length} className="px-6 py-8 text-center text-[#5C5C5C]">
                      No product orders found
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-[#F9FAFB] transition-colors">
                      {productOrderConfig.columns.map((col) => {
                        if (String(col.key) === "id") {
                          return <td key={String(col.key)} className="px-6 py-4 text-[14px] text-[#5C5C5C] font-semibold">{row.id}</td>;
                        }
                        if (String(col.key) === "status") {
                          return (
                            <td key={String(col.key)} className="px-6 py-4">
                              {row.status === "Yet to Start" && (
                                <span className="inline-flex px-2.5 py-1 rounded-[12px] bg-[#FFF0F1] text-[#FB3748] text-[12px] font-medium whitespace-nowrap">
                                  Yet to Start
                                </span>
                              )}
                              {row.status === "In-progress" && (
                                <span className="inline-flex px-2.5 py-1 rounded-[12px] bg-[#FFF4ED] text-[#E19242] text-[12px] font-medium whitespace-nowrap">
                                  In-progress
                                </span>
                              )}
                              {row.status === "Completed" && (
                                <span className="inline-flex px-2.5 py-1 rounded-[12px] bg-[#E8F8F0] text-[#1CB061] text-[12px] font-medium whitespace-nowrap">
                                  Completed
                                </span>
                              )}
                            </td>
                          );
                        }
                        if (String(col.key) === "stage") {
                          return (
                            <td key={String(col.key)} className="px-6 py-4">
                              <span className="inline-flex px-2.5 py-0.5 rounded-[12px] bg-[#E6F8FC] text-[#00B6E2] text-[12px] font-medium">
                                {row.stage}
                              </span>
                            </td>
                          );
                        }
                        if (String(col.key) === "qr") {
                          const cleanId = row.id.replace('#', '');
                          return (
                            <td key={String(col.key)} className="px-6 py-4">
                              <button onClick={() => setQrData({ id: cleanId, type: "PO", data: { productCode: row.code, type: row.type, grade: row.grade, batchSize: row.batchSize, status: row.status } })} className="text-[#5C5C5C] hover:text-[#00B6E2] transition-colors p-1">
                                <QrCode className="w-4 h-4" />
                              </button>
                            </td>
                          );
                        }
                        if (String(col.key) === "options") {
                          const cleanId = row.id.replace('#', '');
                          return (
                            <td key={String(col.key)} className="px-6 py-4">
                              <Link
                                href={`/admin/productorders/${cleanId}`}
                                className="inline-flex items-center justify-center h-8 px-4 bg-[#00B6E2] text-white text-[13px] font-medium rounded-[6px] hover:bg-[#00A0E3] transition-colors"
                              >
                                View
                              </Link>
                            </td>
                          );
                        }
                        return <td key={String(col.key)} className="px-6 py-4 text-[14px] text-[#5C5C5C]">{(row as any)[col.key]}</td>;
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <TablePagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </div>
      </section>
      {qrData && <QRCodeModal id={qrData.id} type={qrData.type} data={qrData.data} onClose={() => setQrData(null)} />}
    </div>
  );
}
