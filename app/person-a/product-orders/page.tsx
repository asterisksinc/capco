"use client";

import { useState, useEffect, useMemo } from "react";
import { Search, QrCode, Loader2 } from "lucide-react";
import { QRCodeModal, type QRModalData } from "@/components/QRCodeModal";
import Link from "next/link";
import { MobileHeader } from "@/components/MobileHeader";
import type { TableConfig } from "@/hooks/useTableControls";
import { TablePagination } from "@/components/table/TablePagination";
import { useTableControls } from "@/hooks/useTableControls";
import { SortableHeader } from "@/components/table/SortableHeader";
import { TableToolbar } from "@/components/table/TableToolbar";
import { exportToExcel } from "@/lib/exportExcel";
import { OptionsDropdown } from "@/components/table/OptionsDropdown";
import { useStore } from "@/hooks/useStore";

type ProductOrderSummary = {
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
};

const productOrderConfig: TableConfig<ProductOrderSummary> = {
  columns: [
    { key: "id", label: "Order ID", type: "text", sortable: true },
    { key: "micron", label: "Micron", type: "text", sortable: true },
    { key: "width", label: "Width", type: "text", sortable: true },
    { key: "product", label: "Product", type: "text", sortable: true },
    { key: "grade", label: "Grade", type: "text", sortable: true },
    { key: "quantity", label: "Quantity", type: "number", sortable: true },
    { key: "customer", label: "Customer", type: "text", sortable: true },
    { key: "status", label: "Status", type: "enum", sortable: false, filter: "dropdown", options: ["Yet to Start", "In-progress", "Completed"] },
    { key: "stage", label: "Stage", type: "enum", sortable: false, filter: "dropdown", options: ["Yet to Start", "Raw Material", "Metallisation", "Slitting", "Winding", "Completed"] },
    { key: "timestamp", label: "Timestamp", type: "date", sortable: true },
    { key: "qr", label: "QR", type: "text", sortable: false },
    { key: "options", label: "Action", type: "text", sortable: false }
  ]
};

export default function PersonAProductOrdersPage() {
  const { store } = useStore();
  const productOrders = store.productOrders;
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<ProductOrderSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [qrData, setQrData] = useState<QRModalData | null>(null);

  useEffect(() => {
    setRows(productOrders);
  }, [productOrders]);

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
      if (searchQuery && !row.id.toLowerCase().includes(searchQuery.toLowerCase()) && !row.customer.toLowerCase().includes(searchQuery.toLowerCase()) && !row.product.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [processedData, searchQuery]);

  const { paginatedData, totalPages, validPage: currentPage } = getPaginatedData(filteredData);

  return (
    <div className="font-dm-sans min-h-[calc(100vh-72px)] bg-white flex flex-col w-full max-w-full">
      {/* MOBILE TOP NAVIGATION BAR */}
      <MobileHeader title="Product Orders" />

      {/* MOBILE HEADER SPACER */}
      <div className="h-14 md:hidden"></div>

      {/* DESKTOP HEADER */}
      <section className="bg-white border-b border-[#EBEBEB] hidden md:block">
        <div className="px-6 py-6 flex items-center justify-between">
          <div className="flex flex-col">
            <h1 className="text-[20px] font-semibold text-[#171717]">Product Orders</h1>
            <p className="text-[14px] text-[#5C5C5C] mt-1">
              Track and manage product orders across their production stages
            </p>
          </div>
        </div>
      </section>

      {/* MOBILE PAGE TITLE */}
      <section className="px-4 pt-4 sm:hidden">
        <h1 className="text-[16px] font-medium text-[#171717]">Product Orders</h1>
        <p className="text-[12px] text-[#5C5C5C] mt-1">
          Track and manage product orders across their production stages
        </p>
      </section>

      <section className="px-4 md:px-3 py-3 md:py-6 flex-1 flex flex-col">
        {/* TOOLBAR */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div className="relative w-full md:w-[400px]">
            <Search className="w-5 h-5 text-[#A1A1AA] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              placeholder="Search by Product Order ID, Product, or Customer..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="h-[44px] w-full pl-10 pr-4 bg-white border border-[#EBEBEB] rounded-[8px] text-[14px] focus:outline-none focus:border-[#00B6E2]"
            />
          </div>

          <TableToolbar dateRange={dateRange} onDateRangeChange={setDateRange} onExport={(scope = "all") => {
            const dataToExport = scope === "all" ? filteredData : paginatedData;
            const exportData = dataToExport.map((row: any) => ({
              "Order ID": row.id ?? "",
              "Micron": row.micron ?? "",
              "Width": row.width ?? "",
              "Product": row.product ?? "",
              "Grade": row.grade ?? "",
              "Quantity": row.quantity ?? "",
              "Customer": row.customer ?? "",
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
                    <th key={String(col.key)} className="px-3 py-3 text-[13px] font-semibold text-[#171717]">
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
                          return <td key={String(col.key)} className="px-3 py-3 text-[14px] text-[#5C5C5C] font-semibold">{row.id}</td>;
                        }
                        if (String(col.key) === "status") {
                          return (
                            <td key={String(col.key)} className="px-3 py-3">
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
                            <td key={String(col.key)} className="px-3 py-3">
                              <span className="inline-flex px-2.5 py-0.5 rounded-[12px] bg-[#E6F8FC] text-[#00B6E2] text-[12px] font-medium">
                                {row.stage}
                              </span>
                            </td>
                          );
                        }
                        if (String(col.key) === "qr") {
                          const cleanId = row.id.replace('#', '');
                          return (
                            <td key={String(col.key)} className="px-3 py-3">
                              <button onClick={() => setQrData({ id: cleanId, type: "PO", data: { micron: row.micron, width: row.width, product: row.product, grade: row.grade, quantity: row.quantity, customer: row.customer, status: row.status } })} className="text-[#5C5C5C] hover:text-[#00B6E2] transition-colors p-1">
                                <QrCode className="w-4 h-4" />
                              </button>
                            </td>
                          );
                        }
                        if (String(col.key) === "options") {
                          const cleanId = row.id.replace('#', '');
                          return (
                            <td key={String(col.key)} className="px-3 py-3">
                              <OptionsDropdown
                                viewHref={`/person-a/product-orders/${cleanId}`}
                                status={row.status}
                              />
                            </td>
                          );
                        }
                        return <td key={String(col.key)} className="px-3 py-3 text-[14px] text-[#5C5C5C]">{(row as any)[col.key]}</td>;
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
