"use client";

import { use, useState, useEffect, useMemo } from "react";
import { ChevronRight, ArrowLeft, Loader2, QrCode } from "lucide-react";
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
import { RowImagesModal } from "@/components/RowImagesModal";
import { WO_STATUS_OPTIONS } from "@/lib/constants";

import { Plus, Check, Printer, X } from "lucide-react";
type ModalStep = 1 | 2 | 3;

type DetailPageProps = {
  params: Promise<{ id?: string, detailpage?: string }>;
};

type TabType = "Slitting" | "Winding" | "Spray";

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

const windingConfig: TableConfig<any> = {
  columns: [
    { key: "wdId", label: "WD-ID", type: "text", sortable: true },
    { key: "mfd", label: "MFD", type: "text", sortable: true },
    { key: "filmTurns", label: "Film Turns", type: "number", sortable: true },
    { key: "weightOfElement", label: "Weight of Element", type: "text", sortable: true },
    { key: "quantity", label: "Quantity", type: "number", sortable: true },
    { key: "totalFilmConsumed", label: "Total Film Consumed", type: "text", sortable: true },
    { key: "timestamp", label: "Timestamp", type: "date", sortable: true },
    { key: "nextStage", label: "Next Stage", type: "text", sortable: false },
    { key: "status", label: "Status", type: "enum", sortable: false, filter: "dropdown", options: WO_STATUS_OPTIONS },
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
  const [activeTab, setActiveTab] = useState<TabType>("Slitting");
  const [qrData, setQrData] = useState<QRModalData | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState<ModalStep>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showValidationHint, setShowValidationHint] = useState(false);
  const [capturedImage, setCapturedImage] = useState<{ url: string; name: string; id: string; file: File } | null>(null);


  const [sprayState, setSprayState] = useState({
    spId: "SP-0001",
    mfd: "",
    noOfCoats: "",
    thicknessMaintained: "",
  });


  const resetModalState = async () => {
    setModalStep(1);
    setIsSubmitting(false);
    setShowValidationHint(false);
    setCapturedImage(null);

    setSprayState({
      spId: "SP-000" + Math.floor(Math.random() * 9 + 1),
      mfd: "",
      noOfCoats: "",
      thicknessMaintained: "",
    });

  };

  const openModal = async () => {
    await resetModalState();
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    resetModalState();
  };

  const submitCurrentStage = async (print = false) => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setModalStep(3);
    }, 1500);
  };

  const addCurrentItemToDraft = () => {
    // Dummy draft handler
    resetModalState();
  };


  const isCurrentStepOneValid = sprayState.mfd && sprayState.noOfCoats && sprayState.thicknessMaintained;
  const isStepTwoValid = true;


  const renderStepHeader = () => {
    const labels = ["Spray Details", "Review Overview", "Submit Details"];
    return (
      <div className="px-6 py-5 border-b border-[#EBEBEB]">
        <div className="flex items-center justify-between gap-2">
          {labels.map((label, index) => {
            const step = (index + 1) as ModalStep;
            const isDone = modalStep > step;
            const isActive = modalStep === step;
            return (
              <div key={label} className="flex flex-1 items-center gap-2">
                <div className="flex flex-col items-center gap-1 min-w-[74px]">
                  <p className={`text-[11px] font-semibold ${isDone || isActive ? "text-[#00B6E2]" : "text-[#8B8BA2]"}`}>STEP {step}</p>
                  <div className={`w-6 h-6 rounded-full border flex items-center justify-center ${isDone ? "bg-[#00B6E2] border-[#00B6E2]" : isActive ? "border-[#00B6E2]" : "border-[#D4D4DB]"}`}>
                    {isDone ? <Check className="w-4 h-4 text-white" /> : <div className={`w-3 h-3 rounded-full ${isActive ? "bg-[#00B6E2]" : "bg-transparent"}`} />}
                  </div>
                  <p className={`text-[13px] text-center ${isDone || isActive ? "text-[#00B6E2] font-medium" : "text-[#6F6F85]"}`}>{label}</p>
                </div>
                {index < labels.length - 1 && <div className="h-px flex-1 bg-[#E5E7EB]" />}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderStepOneForm = () => {

    return (
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-[#171717]">SP ID</label>
            <input disabled value={sprayState.spId} className="h-[42px] bg-[#F5F7FA] text-[#5C5C5C] rounded-[8px] border border-[#DDE1E8] px-3 text-[14px]" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-[#171717]">MFD <span className="text-red-500">*</span></label>
            <select value={sprayState.mfd} onChange={(e) => setSprayState({ ...sprayState, mfd: e.target.value })} className={`h-[42px] rounded-[8px] border ${showValidationHint && !sprayState.mfd ? "border-red-500 bg-red-50" : "border-[#DDE1E8]"} px-3 text-[14px] bg-white`}>
              <option value="">Select MFD</option>
              <option value="Winding">Winding</option>
              <option value="Input">Input</option>
              <option value="Product">Product</option>
              <option value="Order Input">Order Input</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-[#171717]">No. of Coats <span className="text-red-500">*</span></label>
            <select value={sprayState.noOfCoats} onChange={(e) => setSprayState({ ...sprayState, noOfCoats: e.target.value })} className={`h-[42px] rounded-[8px] border ${showValidationHint && !sprayState.noOfCoats ? "border-red-500 bg-red-50" : "border-[#DDE1E8]"} px-3 text-[14px] bg-white`}>
              <option value="">Select</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="5">5</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-[#171717]">Thickness Maintained <span className="text-red-500">*</span></label>
            <input type="text" value={sprayState.thicknessMaintained} onChange={(e) => setSprayState({ ...sprayState, thicknessMaintained: e.target.value })} className={`h-[42px] rounded-[8px] border ${showValidationHint && !sprayState.thicknessMaintained ? "border-red-500 bg-red-50" : "border-[#DDE1E8]"} px-3 text-[14px]`} />
          </div>
        </div>
      </div>
    );

  };

  const renderReviewCards = () => {

    const fields = [
      { label: "SP ID", value: sprayState.spId },
      { label: "MFD", value: sprayState.mfd },
      { label: "No. of Coats", value: sprayState.noOfCoats },
      { label: "Thickness Maintained", value: sprayState.thicknessMaintained },
    ];

    return (
      <div className="rounded-[12px] border border-[#78CFFA] bg-[#F4FBFF] overflow-hidden flex flex-col">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-y-6 gap-x-4 p-5">
          {fields.map((field, i) => (
            <div key={i} className="flex flex-col gap-1">
              <span className="text-[12px] font-normal text-[#5C5C5C] leading-tight whitespace-nowrap">{field.label}</span>
              <div className="text-[14px] font-semibold text-[#171717] leading-tight flex items-center h-5">
                {field.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const [rowImagesData, setRowImagesData] = useState<any>(null);

  useEffect(() => {
    // Find the product order from the store, but simulate loading
    const order = store.productOrders.find((po) => po.id.replace("#", "").toUpperCase() === orderId);
    setPoData(order || null);
    setLoading(false);
  }, [orderId, store.productOrders]);

  const currentConfig = activeTab === "Slitting" ? slittingConfig
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

  const tabs: TabType[] = ["Slitting", "Winding", "Spray"];

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
        {/* <div className="hidden md:flex items-center gap-2 px-6 py-4 border-b border-[#EBEBEB] text-[13px] font-medium text-[#5C5C5C]">
                    <Link href=".." className="flex items-center gap-1 hover:text-[#171717] transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                        Back to Orders
                    </Link>
                </div> */}

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
        <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 w-full md:w-auto order-1 lg: order-2">
            <TableToolbar
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              onExport={(scope = "all") => {
                const dataToExport = scope === "all" ? processedData : paginatedData;
                exportToExcel(dataToExport, `po-${poData.id}-${activeTab.toLowerCase()}`, `${activeTab} Details`);
              }}
            />

            {activeTab === "Spray" && (
              <button
                onClick={openModal}
                className="flex items-center justify-center gap-2 bg-[#00B6E2] text-white text-[14px] font-medium rounded-[6px] h-[40px] px-[18px] hover:bg-[#0092b5] transition-colors shrink-0 w-full sm:w-auto"
              >
                <Plus className="w-4 h-4 shrink-0" strokeWidth={2.5} />
                <span className="leading-tight truncate">
                  Add Spray
                </span>
              </button>
            )}
          </div>

          {/* Tab bar */}
          <div className="flex items-center gap-2 overflow-x-auto overflow-y-hidden scrollbar-none order-2 lg:order-1">
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
                        const rowId = (row as any).productNo || (row as any).wdId || (row as any).spId || `PO-${idx}`;
                        const qrType = "PM";
                        const qrDetails: any = row;
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


      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#171717]/40 backdrop-blur-sm md:px-4">
          <div className="bg-white rounded-[16px] w-full max-w-[95%] sm:max-w-[80%] shadow-lg flex flex-col overflow-hidden">
            {renderStepHeader()}

            <div className="max-h-[58vh] overflow-y-auto px-6 py-5">
              {modalStep === 1 && renderStepOneForm()}
              {modalStep === 2 && (
                <div className="flex flex-col gap-4">
                  <div className="rounded-[10px] border border-[#DDE1E8] bg-[#FAFCFF] p-4">
                    <p className="text-[15px] font-semibold text-[#1F2937] mb-1">Review Overview</p>
                    <p className="text-[13px] text-[#6B7280]">Review details before saving to logs.</p>
                  </div>
                  {renderReviewCards()}
                  <div className="rounded-[12px] border border-[#DDE1E8] bg-white p-4 flex flex-col gap-3">
                    {!capturedImage ? (
                      <div className="flex items-center justify-between">
                        <label className="text-[13px] font-medium text-[#171717]">Attach Image</label>
                        <div className="flex items-center gap-2">
                          <div className="relative">
                            <input
                              type="file"
                              accept="image/*"
                              capture="environment"
                              id="cameraInput"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onload = (ev) => {
                                    const ext = file.name.split('.').pop() || 'jpeg';
                                    const randomId = Math.random().toString(36).substring(2, 8).toUpperCase();
                                    setCapturedImage({
                                      url: ev.target?.result as string,
                                      name: `IMG_${Date.now()}.${ext}`,
                                      id: randomId,
                                      file
                                    });
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                            <label
                              htmlFor="cameraInput"
                              className="flex items-center justify-center gap-2 bg-[#F5F7FA] border border-[#DDE1E8] text-[#5C5C5C] text-[13px] font-medium rounded-[6px] h-[36px] px-3 hover:bg-[#EBEBEB] transition-colors cursor-pointer"
                            >
                              Take Photo
                            </label>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start md:items-center justify-between gap-4 rounded-[8px]">
                        <div className="flex gap-2 flex-col md:flex-row">
                          <img src={capturedImage.url} alt="Preview" className="w-14 h-14 rounded-md border border-[#EBEBEB] object-cover shrink-0" />
                          <div className="flex flex-col gap-1">
                            <p className="text-[12px] md:text-[14px] font-semibold text-[#171717]">{capturedImage.name}</p>
                            <p className="text-[10px] md:text-[12px] text-[#6B7280]">ID: {capturedImage.id}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setCapturedImage(null)}
                          className="text-[#5C5C5C] hover:text-[#171717] transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {modalStep === 3 && (
                <div className="rounded-[16px] border border-[#D6EEF9] bg-[radial-gradient(circle_at_center,_#ECF8FD_0%,_#F8FCFF_45%,_#FFFFFF_100%)] p-10 flex flex-col items-center text-center gap-4">
                  <div className="w-13 md:w-16 h-13 md:h-16 rounded-full bg-[#E6F7FF] border border-[#9DDBF6] flex items-center justify-center">
                    <div className="w-7 md:w-10 h-7 md:h-10 rounded-full bg-[#00B6E2] flex items-center justify-center">
                      <Check className="w-4 md:w-6 h-4 md:h-6 text-white" />
                    </div>
                  </div>
                  <p className="text-[18px] md:text-[27px] leading-tight text-[#171717] font-semibold">Details submitted successfully.</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between px-6 py-5 bg-[#FAFAFA] border-t border-[#EBEBEB]">
              {modalStep === 1 && (
                <>
                  <button onClick={closeModal} className="h-[40px] px-2 md:px-4 bg-white border border-[#EBEBEB] text-[#171717] text-[10px] md:text-[14px] font-medium rounded-[6px] hover:bg-gray-50">Cancel</button>
                  <div className="flex items-center gap-2">
                    <button onClick={addCurrentItemToDraft} className="h-[40px] px-2 md:px-4 bg-white border border-[#00B6E2] text-[#00B6E2] text-[10px] md:text-[14px] font-medium rounded-[6px] hover:bg-[#F0FDFF]">Add More Items</button>
                    <button onClick={() => { if (!isCurrentStepOneValid) { setShowValidationHint(true); return; } setModalStep(2); }} className={`h-[40px] px-2 md:px-5 text-[10px] md:text-[14px] font-medium rounded-[6px] ${isCurrentStepOneValid ? "bg-[#00B6E2] text-white hover:bg-[#0092b5]" : "bg-[#A7DDEB] text-white cursor-not-allowed"}`}>Next</button>
                  </div>
                </>
              )}
              {modalStep === 2 && (
                <>
                  <button onClick={() => setModalStep(1)} disabled={isSubmitting} className="h-[40px] px-2 md:px-4 bg-white border border-[#EBEBEB] text-[#171717] text-[10px] md:text-[14px] font-medium rounded-[6px] hover:bg-gray-50">Back</button>
                  <button onClick={() => submitCurrentStage(false)} disabled={isSubmitting || !isStepTwoValid} className={`h-[40px] px-2 md:px-5 text-[10px] md:text-[14px] font-medium rounded-[6px] flex items-center justify-center gap-2 ${isStepTwoValid && !isSubmitting ? "bg-[#00B6E2] text-white hover:bg-[#0092b5]" : "bg-[#A7DDEB] text-white cursor-not-allowed"}`}>
                    {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    {isSubmitting ? "Submitting..." : "Submit Logs"}
                  </button>
                </>
              )}
              {modalStep === 3 && (
                <button onClick={closeModal} className="h-[40px] px-2 md:px-5 bg-[#00B6E2] text-white text-[10px] md:text-[14px] font-medium rounded-[6px] hover:bg-[#0092b5]">Done</button>
              )}
            </div>
          </div>
        </div>
      )}

      {qrData && <QRCodeModal id={qrData.id} type={qrData.type} data={qrData.data} onClose={() => setQrData(null)} />}
    </div>
  );
}