"use client";

import { use, useState, useEffect, useMemo } from "react";
import { ChevronRight, ArrowLeft, Loader2, QrCode, Plus, X, Check, Package, Ruler, Maximize2, PackageSearchIcon, ShieldPlus, ContactRound } from "lucide-react";
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
import { stockService } from "@/src/services/stockService";
import { RowImagesModal } from "@/components/RowImagesModal";
import { WO_STATUS_OPTIONS } from "@/lib/constants";

type DetailPageProps = {
  params: Promise<{ id?: string, detailpage?: string }>;
};


const slittingConfig: TableConfig<any> = {
  columns: [
    { key: "productNo", label: "Product No", type: "text", sortable: true },
    { key: "micron", label: "Micron", type: "number", sortable: true },
    { key: "width", label: "Width", type: "number", sortable: true },
    { key: "weight", label: "Weight", type: "number", sortable: true },
    { key: "grade", label: "Grade", type: "text", sortable: true },
    { key: "timestampAdded", label: "Timestamp", type: "date", sortable: true },
    { key: "nextStage", label: "Next Stage", type: "text", sortable: false },
    { key: "status", label: "Status", type: "enum", sortable: false, filter: "dropdown", options: WO_STATUS_OPTIONS },
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
  const [qrData, setQrData] = useState<QRModalData | null>(null);
  const [rowImagesData, setRowImagesData] = useState<any>(null);

  // --- Modal State ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState<1 | 2 | 3>(1);
  const [showValidationHint, setShowValidationHint] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableSlittingBags, setAvailableSlittingBags] = useState<any[]>([]);
  const [selectedBagIds, setSelectedBagIds] = useState<string[]>([]);

  useEffect(() => {
    // Find the product order from the store, but simulate loading
    const order = store.productOrders.find((po) => po.id.replace("#", "").toUpperCase() === orderId);
    setPoData(order || null);
    setLoading(false);
  }, [orderId, store.productOrders]);

  useEffect(() => {
    // Load slitting bags
    stockService.list({ filters: { status: "Pending" } })
      .then(data => {
        const filtered = data.filter((item: any) =>
          Number(item.micron) === Number(poData?.micron) &&
          Number(item.width_m) === Number(poData?.width) &&
          String(item.grade).trim().toLowerCase() === String(poData?.grade).trim().toLowerCase()
        );

        // FIFO Order (oldest first)
        const sorted = filtered.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        setAvailableSlittingBags(sorted);
      })
      .catch(console.error);
  }, [poData]);

  const overviewFields = [
    { label: "Micron", value: poData?.micron || "-" },
    { label: "Width", value: poData?.width || "-" },
    { label: "Product", value: poData?.product || "-" },
    { label: "Target Quantity", value: poData?.quantity ? `${poData.quantity}kgs` : "-" },
    { label: "Grade", value: poData?.grade || "-" },
    { label: "Customer", value: poData?.customer || "-" },
    { label: "Current Stage", value: poData?.stage || "-" },
    { label: "Created Date", value: poData?.timestamp ? new Date(poData.timestamp).toLocaleDateString("en-GB") : "-" },
  ];

  const detailKpiStats = [
    { label: "Micron", value: poData?.micron || "-", icon: Ruler, valClass: "text-[#171717]" },
    { label: "Width", value: poData?.width || "-", icon: Maximize2, valClass: "text-[#171717]" },
    { label: "Product", value: poData?.product || "-", icon: PackageSearchIcon, valClass: "text-[#171717]" },
    { label: "Quantity", value: poData?.quantity ? `${poData.quantity}kgs` : "-", icon: Package, valClass: "text-[#171717]" },
    { label: "Grade", value: poData?.grade || "-", icon: ShieldPlus, valClass: "text-[#171717]" },
    { label: "Customer", value: poData?.customer || "-", icon: ContactRound, valClass: "text-[#171717]" },
  ];

  const detailChips = [
    { label: "Stage", value: poData?.stage },
    { label: "Date", value: poData?.timestamp ? new Date(poData.timestamp).toLocaleDateString("en-GB") : "-" },
  ];

  // --- Modal Handlers ---
  const resetModalState = () => {
    setModalStep(1);
    setShowValidationHint(false);
    setSelectedBagIds([]);
    setIsSubmitting(false);
  };

  const openModal = () => {
    resetModalState();
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isSubmitting) return;
    setIsModalOpen(false);
    resetModalState();
  };

  const isStepOneValid = selectedBagIds.length > 0;

  const toggleSelection = (id: string) => {
    setSelectedBagIds((prev) => {
      const index = availableSlittingBags.findIndex((i) => i.id === id);
      if (index === -1) return prev;
      if (prev.includes(id)) {
        // Deselecting: Keep only the ones before this index
        const idsToKeep = availableSlittingBags.slice(0, index).map((i) => i.id);
        return prev.filter((i) => idsToKeep.includes(i));
      } else {
        // Selecting: Add to selection
        return [...prev, id];
      }
    });
  };

  const submitCurrentStage = () => {
    if (!isStepOneValid) {
      setShowValidationHint(true);
      return;
    }
    setIsSubmitting(true);
    // Fake submission delay
    setTimeout(() => {
      setIsSubmitting(false);
      setModalStep(3);
    }, 1000);
  };

  const renderStepHeader = () => (
    <div className="flex items-center px-4 md:px-6 py-4 bg-white border-b border-[#EBEBEB] overflow-x-auto min-h-[72px]">
      {[
        { step: 1, label: "Select Items" },
        { step: 2, label: "Review & Submit" },
        { step: 3, label: "Done" },
      ].map((s, idx, arr) => {
        const isActive = modalStep === s.step;
        const isCompleted = modalStep > s.step;
        return (
          <div key={s.step} className="flex items-center shrink-0">
            <div className="flex items-center gap-2 md:gap-3">
              <div className={`w-6 md:w-8 h-6 md:h-8 rounded-full flex items-center justify-center text-[12px] md:text-[14px] font-semibold transition-colors ${isActive ? 'bg-[#00B6E2] text-white' : isCompleted ? 'bg-[#E6F8FD] text-[#00B6E2]' : 'bg-[#F5F7FA] text-[#A1A1AA]'}`}>
                {isCompleted ? <Check className="w-3 md:w-4 h-3 md:h-4" /> : s.step}
              </div>
              <span className={`text-[12px] md:text-[14px] font-medium ${isActive || isCompleted ? 'text-[#171717]' : 'text-[#A1A1AA]'}`}>{s.label}</span>
            </div>
            {idx < arr.length - 1 && <div className="w-8 md:w-16 h-[1px] bg-[#EBEBEB] mx-2 md:mx-4" />}
          </div>
        );
      })}
    </div>
  );

  const renderStepOneForm = () => (
    <div className="flex flex-col gap-3">
      <p className="text-[14px] font-medium text-[#171717]">Available Slitting Bags</p>
      {availableSlittingBags.length === 0 ? (
        <p className="text-[13px] text-[#5C5C5C] text-center py-4">No available slitting bags in stock.</p>
      ) : (
        availableSlittingBags.map((item, index) => {
          const isSelected = selectedBagIds.includes(item.id);
          const isSelectable = index === 0 || selectedBagIds.includes(availableSlittingBags[index - 1].id);
          const displayId = item.stock_no || item.id;
          return (
            <label
              key={item.id}
              onClick={(e) => {
                e.preventDefault();
                if (isSelectable) toggleSelection(item.id);
              }}
              className={`flex flex-col gap-3 p-4 rounded-[8px] border transition-colors ${isSelectable ? "cursor-pointer" : "cursor-not-allowed opacity-50"} ${isSelected ? "border-[#00B6E2] bg-[#F4FBFF]" : isSelectable ? "border-[#DDE1E8] bg-white hover:border-[#A7DDEB]" : "border-[#DDE1E8] bg-[#F9FAFB]"}`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-[4px] border flex items-center justify-center shrink-0 ${isSelected ? "bg-[#00B6E2] border-[#00B6E2]" : isSelectable ? "border-[#DDE1E8] bg-white" : "border-[#E5E7EB] bg-[#F3F4F6]"}`}>
                  {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                </div>
                <span className="text-[14px] font-semibold text-[#171717]">{displayId}</span>
              </div>
              <div className="flex items-center gap-4 text-[13px] text-[#5C5C5C] pl-8">
                <span>Weight: <span className="font-medium text-[#171717]">{item.weight_kg ?? "-"}kgs</span></span>
                <span className="w-[1px] h-3 bg-[#DDE1E8]"></span>
                <span>Micron: <span className="font-medium text-[#171717]">{item.micron ?? "-"}</span></span>
                <span className="w-[1px] h-3 bg-[#DDE1E8]"></span>
                <span>Width: <span className="font-medium text-[#171717]">{item.width_m ?? "-"}</span></span>
                <span className="w-[1px] h-3 bg-[#DDE1E8]"></span>
                <span>Grade: <span className="font-medium text-[#171717]">{item.grade ?? "-"}</span></span>
              </div>
            </label>
          );
        })
      )}
    </div>
  );

  const renderReviewCards = () => {
    const selectedItems = availableSlittingBags.filter((i) => selectedBagIds.includes(i.id));
    return (
      <div className="rounded-[12px] border border-[#78CFFA] bg-[#F4FBFF] p-4 flex flex-col gap-3">
        <p className="text-[14px] font-semibold text-[#171717]">Selected Slitting Bags</p>
        <ul className="list-disc pl-5 text-[13px] text-[#49526A] flex flex-col gap-1.5">
          {selectedItems.map((item, idx) => (
            <li key={`bag-${idx}`}>
              <span className="font-medium text-[#171717]">{item.stock_no || item.id}</span>
              <span className="text-[#6B7280]"> (Weight: {item.weight_kg ?? "-"}kgs, Grade: {item.grade ?? "-"}, Micron: {item.micron ?? "-"})</span>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  const renderModalBody = () => {
    if (modalStep === 1) {
      return (
        <div className="px-6 py-6 flex flex-col gap-5">
          {renderStepOneForm()}
          {showValidationHint && !isStepOneValid && <p className="text-[12px] text-[#D92D20]">Please select at least one bag to proceed.</p>}
          <p className="text-[12px] text-[#667085]">Items queued for review: {selectedBagIds.length}</p>
        </div>
      );
    }
    if (modalStep === 2) {
      return (
        <div className="px-6 py-6 flex flex-col gap-5">
          <div className="rounded-[10px] border border-[#DDE1E8] bg-[#FAFCFF] p-4">
            <p className="text-[15px] font-semibold text-[#1F2937] mb-1">Overview</p>
            <p className="text-[13px] text-[#6B7280]">Review all values before submitting.</p>
          </div>
          {renderReviewCards()}
        </div>
      );
    }
    return (
      <div className="px-6 py-8">
        <div className="rounded-[16px] border border-[#D6EEF9] bg-[radial-gradient(circle_at_center,_#ECF8FD_0%,_#F8FCFF_45%,_#FFFFFF_100%)] p-8 md:p-10 flex flex-col items-center text-center gap-4">
          <div className="w-13 md:w-16 h-13 md:h-16 rounded-full bg-[#E6F7FF] border border-[#9DDBF6] flex items-center justify-center">
            <div className="w-7 md:w-10 h-7 md:h-10 rounded-full bg-[#00B6E2] flex items-center justify-center">
              <Check className="w-4 md:w-6 h-4 md:h-6 text-white" />
            </div>
          </div>
          <p className="text-[14px] lg:text-[27px] leading-tight text-[#171717] font-semibold">Your details have been submitted successfully.</p>
          <p className="text-[10px] lg:text-[15px] text-[#667085] max-w-[460px]">The items have been queued. Backend integration is pending.</p>
        </div>
      </div>
    );
  };

  const currentConfig = slittingConfig;

  // Empty data for now
  const rows = useMemo(() => [], []);

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
    <div className="font-dm-sans min-h-[calc(100vh-72px)] bg-white flex flex-col relative overflow-x-hidden">
      <MobileHeader title="Product Order Details" />

      {/* HEADER SECTION */}
      <section className="bg-white border-b border-[#EBEBEB]">
        {/* Breadcrumb / Back button (Desktop) */}
        {/* <div className="hidden md:flex items-center gap-2 px-6 py-4 border-b border-[#EBEBEB] text-[13px] font-medium text-[#5C5C5C]">
                    <Link href=".." className="flex items-center gap-1 hover:text-[#171717] transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                        Back to Orders
                    </Link>
                </div> */}

        {/* Title row */}
        <div className="px-4 py-4 md:px-6 md:py-6 mt-[52px] md:mt-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center justify-between gap-4 w-full md:w-auto">
            <h1 className="flex flex-col sm:flex-row items-start gap-2 text-[16px] lg:text-[20px] font-semibold text-[#171717]">
              Product Order <span>#{poData.id}</span>
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

        {/* Mobile KPI section */}
        <section className="grid grid-cols-2 sm:grid-cols-3 gap-0 md:hidden mx-4 bg-white border border-[#EBEBEB] rounded-[12px]">
          {detailKpiStats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div key={i} className={`p-3 border-r border-b border-[#EBEBEB] rounded-[12px]`}>
                <div className="flex items-start gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#E6F8FD] flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-[#00B6E2]" />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <p className="text-[11px] font-medium text-[#5C5C5C]">{stat.label}</p>
                    <span className={`text-[13px] font-semibold ${stat.valClass}`}>{stat.value}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        {/* Mobile detail chips */}
        <section className="md:hidden mx-4 mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
          {detailChips.map((chip, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-[12px] font-medium text-[#5C5C5C]">{chip.label}:</span>
              <span className="text-[12px] font-semibold text-[#171717]">{chip.value}</span>
            </div>
          ))}
        </section>

        {/* Desktop Overview Row */}
        <section className="hidden md:flex w-full px-4 md:px-6 py-6 border-b border-[#EBEBEB]">
          <div className="flex items-center gap-6 w-full">
            {overviewFields.map((field, idx) => (
              <div key={idx} className="flex flex-col gap-[6px] min-w-0">
                <span className="text-[12px] font-normal text-[#5C5C5C] leading-tight whitespace-nowrap">{field.label}</span>
                <div className="text-[14px] font-semibold text-[#171717] leading-tight flex items-center h-5">
                  {field.value}
                </div>
              </div>
            ))}
          </div>
        </section>
      </section>

      {/* Tabs + Table */}
      <section className="bg-white w-full px-4 md:px-6 py-4 flex flex-col gap-6">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* <button
                  onClick={() => setIsDocModalOpen(true)}
                  className="flex items-center justify-center gap-2 bg-white border border-[#DDE1E8] text-[#171717] text-[13px] font-medium rounded-[8px] h-[36px] px-4 hover:bg-[#F5F7FA] transition-colors self-start sm:self-auto shadow-sm whitespace-nowrap"
                >
                  <FileText className="w-4 h-4 text-gray-600" />
                  Docs Uploaded
                </button> */}
          <TableToolbar
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            onExport={(scope = "all") => {
              const dataToExport = scope === "all" ? processedData : paginatedData;
              exportToExcel(dataToExport, `po-${poData.id}-slitting`, "Slitting Details");
            }}
          />
          <button
            onClick={openModal}
            className="flex items-center justify-center gap-2 bg-[#00B6E2] text-white text-[14px] font-medium rounded-[6px] h-[40px] px-4 sm:px-[18px] hover:bg-[#0092b5] transition-colors shrink-0 whitespace-nowrap w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 shrink-0" strokeWidth={2.5} />
            <span className="leading-tight">Assign Slitting</span>
          </button>
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
                        const rowId = (row as any).rollNo;
                        const qrType = "SL";
                        const qrDetails: any = { rollNo: (row as any).rollNo ?? "", micron: (row as any).thickness ?? "", width: (row as any).width ?? "", netWeight: (row as any).netWeight?.split("k")[0] ?? "", grossWeight: (row as any).grossWeight?.split("k")[0] ?? "", supplier: (row as any).supplier ?? "", status: (row as any).status ?? "" };
                        return (
                          <td key={key} className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <button onClick={() => setQrData({ id: rowId, type: qrType, data: qrDetails })} className="text-[#5C5C5C] hover:text-[#00B6E2] transition-colors p-1" title="Show QR Code">
                                <QrCode className="w-4 h-4" />
                              </button>
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
                      No Slitting records yet.
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

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#171717]/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-[16px] w-full max-w-[860px] shadow-lg flex flex-col overflow-hidden">
            <div className="flex items-start justify-between px-6 py-5 border-b border-[#EBEBEB]">
              <div className="flex flex-col gap-1">
                <h2 className="text-[18px] md:text-[28px] leading-tight font-semibold text-[#171717]">Add Slitting Details</h2>
                <p className="text-[11px] md:text-[15px] text-[#5C5C5C]">Assign slitting bags for Product Order {orderId}</p>
              </div>
              <button onClick={closeModal} className="text-[#5C5C5C] hover:text-[#171717] transition-colors p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {renderStepHeader()}
            <div className="max-h-[58vh] overflow-y-auto">{renderModalBody()}</div>

            <div className="flex items-center justify-between gap-3 px-6 py-5 bg-[#FAFAFA] border-t border-[#EBEBEB]">
              {modalStep === 1 && (
                <>
                  <button onClick={closeModal} className="h-[40px] px-4 bg-white border border-[#EBEBEB] text-[#171717] text-[14px] font-medium rounded-[6px] hover:bg-gray-50 transition-colors">Cancel</button>
                  <button
                    onClick={() => {
                      if (!isStepOneValid) {
                        setShowValidationHint(true);
                        return;
                      }
                      setShowValidationHint(false);
                      setModalStep(2);
                    }}
                    className={`h-[40px] px-5 text-[14px] font-medium rounded-[6px] transition-colors ${isStepOneValid ? "bg-[#00B6E2] text-white hover:bg-[#0092b5]" : "bg-[#A7DDEB] text-white cursor-not-allowed"}`}
                  >
                    Next
                  </button>
                </>
              )}
              {modalStep === 2 && (
                <>
                  <button onClick={() => setModalStep(1)} disabled={isSubmitting} className="h-[40px] px-4 bg-white border border-[#EBEBEB] text-[#171717] text-[14px] font-medium rounded-[6px] hover:bg-gray-50 transition-colors">Back</button>
                  <button
                    onClick={submitCurrentStage}
                    disabled={isSubmitting || !isStepOneValid}
                    className={`h-[40px] px-5 text-[14px] font-medium rounded-[6px] transition-colors flex items-center justify-center gap-2 ${isStepOneValid && !isSubmitting ? "bg-[#00B6E2] text-white hover:bg-[#0092b5]" : "bg-[#A7DDEB] text-white cursor-not-allowed"}`}
                  >
                    {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    {isSubmitting ? "Submitting..." : "Submit Details"}
                  </button>
                </>
              )}
              {modalStep === 3 && (
                <>
                  <button onClick={closeModal} className="h-[40px] px-4 bg-white border border-[#EBEBEB] text-[#171717] text-[14px] font-medium rounded-[6px] hover:bg-gray-50 transition-colors">Go to Dashboard</button>
                  <button onClick={closeModal} className="h-[40px] px-5 bg-[#00B6E2] text-white text-[14px] font-medium rounded-[6px] hover:bg-[#0092b5] transition-colors">View Details</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}