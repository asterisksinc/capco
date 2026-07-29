"use client";

import { use, useState, useEffect, useMemo } from "react";
import { ChevronRight, ArrowLeft, Loader2, QrCode, FileText, ImageIcon } from "lucide-react";
import Link from "next/link";
import { MobileHeader } from "@/components/MobileHeader";
import type { TableConfig } from "@/hooks/useTableControls";
import { TablePagination } from "@/components/table/TablePagination";
import { useTableControls } from "@/hooks/useTableControls";
import { SortableHeader } from "@/components/table/SortableHeader";
import { TableToolbar } from "@/components/table/TableToolbar";
import { QRCodeModal, type QRModalData } from "@/components/QRCodeModal";
import { exportToExcel } from "@/lib/exportExcel";
import { StatusBadge } from "@/components/StatusBadge";
import { useStore } from "@/hooks/useStore";
import { productOrderService } from "@/src/services/productOrderService";
import { DocsUploadedModal } from "@/components/DocsUploadedModal";
import { RowImagesModal } from "@/components/RowImagesModal";

type DetailPageProps = {
  params: Promise<{ id?: string, detailpage?: string }>;
};

type TabType = "Raw Material" | "Metallisation" | "Slitting" | "Winding" | "Spray";

const rawMaterialConfig: TableConfig<any> = {
  columns: [
    { key: "rollNo", label: "Roll No", type: "text", sortable: true },
    { key: "netWeight", label: "Net Weight", type: "text", sortable: true },
    { key: "grossWeight", label: "Gross Weight", type: "text", sortable: true },
    { key: "thickness", label: "Micron", type: "number", sortable: true },
    { key: "width", label: "Width", type: "text", sortable: true },
    { key: "temperature", label: "Temperature", type: "text", sortable: true },
    { key: "supplier", label: "Supplier", type: "text", sortable: true },
    { key: "status", label: "Status", type: "text", sortable: true },
  ],
};

const metallisationConfig: TableConfig<any> = {
  columns: [
    { key: "coilNo", label: "Coil No", type: "text", sortable: true },
    { key: "rmId", label: "RM ID", type: "text", sortable: true },
    { key: "weight", label: "Weight", type: "number", sortable: true },
    { key: "opticalDensity", label: "Optical Density", type: "text", sortable: true },
    { key: "resistance", label: "Resistance", type: "text", sortable: true },
    { key: "timestamp", label: "Timestamp", type: "date", sortable: true },
    { key: "status", label: "Status", type: "text", sortable: true },
  ],
};

const slittingConfig: TableConfig<any> = {
  columns: [
    { key: "productNo", label: "Product No", type: "text", sortable: true },
    { key: "rmId", label: "Coil ID", type: "text", sortable: true },
    { key: "weight", label: "Weight", type: "number", sortable: true },
    { key: "grade", label: "Grade", type: "text", sortable: true },
    { key: "timestampAdded", label: "Timestamp", type: "date", sortable: true },
    { key: "status", label: "Status", type: "text", sortable: true },
  ],
};

const windingConfig: TableConfig<any> = {
  columns: [
    { key: "wdId", label: "WD-ID", type: "text", sortable: true },
    { key: "mfd", label: "MFD", type: "text", sortable: true },
    { key: "filmTurns", label: "Film Turns", type: "number", sortable: true },
    { key: "weightOfElement", label: "Weight of Element", type: "text", sortable: true },
    { key: "quantity", label: "Quantity", type: "number", sortable: true },
    { key: "totalFilmConsumed", label: "Total Film Consumed", type: "text", sortable: true },
    { key: "timestamp", label: "Timestamp", type: "date", sortable: true },
    { key: "nextStage", label: "Next Stage", type: "text", sortable: true },
    { key: "status", label: "Status", type: "text", sortable: true },
    { key: "qr", label: "QR", type: "text", sortable: false },
    { key: "options", label: "Action", type: "text", sortable: false },
  ],
};


const sprayConfig: TableConfig<any> = {
  columns: [
    { key: "spId", label: "SP-ID", type: "text", sortable: true },
    { key: "wdId", label: "WD-ID", type: "text", sortable: true },
    { key: "mfd", label: "MFD", type: "text", sortable: true },
    { key: "noOfCoats", label: "No. of Coats", type: "number", sortable: true },
    { key: "thicknessMaintained", label: "Thickness Maintained", type: "text", sortable: true },
    { key: "rejectedQuantity", label: "Rejected Quantity", type: "number", sortable: true },
    { key: "timestamp", label: "Timestamp", type: "date", sortable: true },
    { key: "nextStage", label: "Next Stage", type: "text", sortable: true },
    { key: "status", label: "Status", type: "text", sortable: true },
    { key: "qr", label: "QR", type: "text", sortable: false },
    { key: "options", label: "Action", type: "text", sortable: false },
  ],
};


export default function ProductOrderDetailPage({ params }: DetailPageProps) {
  const resolvedParams = use(params);
  const id = resolvedParams.id || resolvedParams.detailpage || "PO-0001";
  const orderId = id.toUpperCase();
  const { store } = useStore();

  const [poData, setPoData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("Raw Material");
  const [qrData, setQrData] = useState<QRModalData | null>(null);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [rowImagesData, setRowImagesData] = useState<any>(null);
  
  useEffect(() => {
    // Find the product order from the store, but simulate loading
    const order = store.productOrders.find((po) => po.id.replace("#", "").toUpperCase() === orderId);
    setPoData(order || null);
    setLoading(false);
  }, [orderId, store.productOrders]);

  const currentConfig = activeTab === "Raw Material" ? rawMaterialConfig
    : activeTab === "Metallisation" ? metallisationConfig
      : activeTab === "Slitting" ? slittingConfig
        : activeTab === "Winding" ? windingConfig
          : sprayConfig;

  // Empty data for now
  const rows = useMemo(() => [], [activeTab]);

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
  } = useTableControls({ data: rows, config: currentConfig });

  const { paginatedData, totalPages, validPage: currentPage } = getPaginatedData(processedData);

  const tabs: TabType[] = ["Raw Material", "Metallisation", "Slitting", "Winding", "Spray"];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-72px)] bg-[#F5F7FA]">
        <Loader2 className="w-8 h-8 animate-spin text-[#00B6E2]" />
      </div>
    );
  }

  if (!poData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-72px)] bg-[#F5F7FA]">
        <h2 className="text-[20px] font-semibold text-[#171717]">Product Order not found</h2>
        <Link href=".." className="mt-4 text-[#00B6E2] hover:underline">Go back</Link>
      </div>
    );
  }

  return (
    <div className="font-dm-sans min-h-[calc(100vh-72px)] bg-[#F5F7FA] flex flex-col">
      <MobileHeader title="Product Order Details" />

      {/* HEADER SECTION */}
      <section className="bg-white border-b border-[#EBEBEB]">
        {/* Breadcrumb / Back button (Desktop) */}
        <div className="hidden md:flex items-center gap-2 px-6 py-4 border-b border-[#EBEBEB] text-[13px] font-medium text-[#5C5C5C]">
          <Link href=".." className="flex items-center gap-1 hover:text-[#171717] transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Orders
          </Link>
        </div>

        {/* Title row */}
        <div className="px-4 py-4 md:px-6 md:py-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-[20px] font-semibold text-[#171717]">
              Product Order #{poData.id}
            </h1>
            <StatusBadge status={poData.status || "Yet to Start"} />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setQrData({ id: poData.id, type: "PO", data: poData })}
              className="flex items-center justify-center gap-2 bg-white border border-[#EBEBEB] text-[#5C5C5C] text-[14px] font-medium rounded-[8px] h-[40px] px-4 hover:bg-[#F9FAFB] transition-colors"
            >
              <QrCode className="w-4 h-4" />
              <span className="hidden sm:inline">View QR Code</span>
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="px-4 pb-4 md:px-6 md:pb-6">
          <div className="bg-[#F9FAFB] rounded-[12px] p-4 flex flex-wrap gap-x-8 gap-y-4">
            <div className="flex flex-col gap-1">
              <span className="text-[12px] font-medium text-[#5C5C5C]">Current Stage</span>
              <span className="text-[14px] font-semibold text-[#171717]">{poData.stage || "-"}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[12px] font-medium text-[#5C5C5C]">Target Quantity</span>
              <span className="text-[14px] font-semibold text-[#171717]">{poData.quantity ? `${poData.quantity}kgs` : "-"}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[12px] font-medium text-[#5C5C5C]">Customer</span>
              <span className="text-[14px] font-semibold text-[#171717]">{poData.customer || "-"}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[12px] font-medium text-[#5C5C5C]">Created Date</span>
              <span className="text-[14px] font-semibold text-[#171717]">
                {poData.timestamp ? new Date(poData.timestamp).toLocaleDateString("en-GB") : "-"}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Tabs + Table */}
      <section className="bg-white w-full px-4 md:px-6 py-4 flex flex-col gap-6">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <button
                  onClick={() => setIsDocModalOpen(true)}
                  className="flex items-center justify-center gap-2 bg-white border border-[#DDE1E8] text-[#171717] text-[13px] font-medium rounded-[8px] h-[36px] px-4 hover:bg-[#F5F7FA] transition-colors self-start sm:self-auto shadow-sm whitespace-nowrap"
                >
                  <FileText className="w-4 h-4 text-gray-600" />
                  Docs Uploaded
                </button>
          <TableToolbar
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            onExport={(scope = "all") => {
              const dataToExport = scope === "all" ? processedData : paginatedData;
              exportToExcel(dataToExport, `po-${poData.id}-${activeTab.toLowerCase()}`, `${activeTab} Details`);
            }}
          />
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-2 border-b border-[#EBEBEB] pb-4 overflow-x-auto overflow-y-hidden scrollbar-none">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 md:px-4 py-2 text-[13px] md:text-[14px] font-medium rounded-[8px] transition-colors whitespace-nowrap shrink-0 ${activeTab === tab
                ? "bg-[#00B6E2] text-white"
                : "bg-white text-[#5C5C5C] hover:bg-[#F5F7FA]"
                }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white border border-[#EBEBEB] rounded-[12px] overflow-hidden">
          <div className="overflow-x-auto min-h-[300px]">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-[#F5F7FA] border-b border-[#EBEBEB]">
                  {currentConfig.columns.map((col) => (
                    <th key={String(col.key)} className="px-4 py-[11px]">
                      <SortableHeader column={col} sortConfig={sortConfig} onSort={handleSort} filters={filters} onFilterChange={handleFilterChange} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAECF0]">
                {paginatedData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50 transition-colors group">
                    {currentConfig.columns.map((col) => {
                      const key = String(col.key);
                      if (key === "options") {
                        const isRM = activeTab === "Raw Material";
                        const isMC = activeTab === "Metallisation";
                        const rowId = isRM ? (row as any).rollNo : isMC ? (row as any).coilNo : (row as any).productNo;
                        const qrType = isRM ? "RM" : isMC ? "MC" : "PM";
                        const qrDetails: any = isRM
                          ? { rollNo: (row as any).rollNo ?? "", micron: (row as any).thickness ?? "", width: (row as any).width ?? "", netWeight: (row as any).netWeight.split("k")[0] ?? "", grossWeight: (row as any).grossWeight.split("k")[0] ?? "", supplier: (row as any).supplier ?? "", status: (row as any).status ?? "" }
                          : isMC
                            ? { coilNo: (row as any).coilNo ?? "", rmId: (row as any).rmId ?? "", factoryWastageWeight: (row as any).factoryWastageWeight ?? "", weight: (row as any).weight.split("k")[0] ?? "", date: (row as any).timestamp ?? "", status: (row as any).status ?? "" }
                            : { productNo: (row as any).productNo ?? "", coilId: (row as any).rmId ?? "", weight: (row as any).weight.split("k")[0] ?? "", grade: (row as any).grade ?? "", date: (row as any).timestampAdded ?? "", status: (row as any).status ?? "" };
                        return (
                          <td key={key} className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <button onClick={() => setQrData({ id: rowId, type: qrType, data: qrDetails })} className="text-[#5C5C5C] hover:text-[#00B6E2] transition-colors p-1" title="Show QR Code">
                                <QrCode className="w-4 h-4" />
                              </button>
                              {isMC && (
                                <button onClick={() => setRowImagesData(row)} className="text-[#5C5C5C] hover:text-[#00B6E2] transition-colors p-1" title="View Coil Images">
                                  <ImageIcon className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        );
                      }
                      if (key === "status") {
                        return (
                          <td key={key} className="px-4 py-4 whitespace-nowrap">
                            <StatusBadge status={(row as any)[key]} />
                          </td>
                        );
                      }
                      return (
                        <td key={key} className={`px-4 py-4 text-[14px] ${["rollNo", "coilNo", "productNo"].includes(key) ? "text-[#00B6E2] font-semibold" : "text-[#5C5C5C]"} whitespace-nowrap`}>
                          {(row as any)[key] ?? "-"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {paginatedData.length === 0 && (
                  <tr>
                    <td colSpan={currentConfig.columns.length} className="px-4 py-10 text-center text-[14px] text-[#5C5C5C]">
                      No {activeTab} records yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <TablePagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </div>
      </section>

      {qrData && <QRCodeModal id={qrData.id} type={qrData.type} data={qrData.data} onClose={() => setQrData(null)} />}

        <DocsUploadedModal
        isOpen={isDocModalOpen}
        onClose={() => setIsDocModalOpen(false)}
        activeTab={activeTab}
        // woData={woData}
      />

      <RowImagesModal
        isOpen={!!rowImagesData}
        onClose={() => setRowImagesData(null)}
        rowData={rowImagesData}
      />
    </div>
  );
}