"use client";

import { WO_STATUS_OPTIONS, WO_STAGE_OPTIONS } from "@/lib/constants";
import { StatusBadge } from "@/components/StatusBadge";
import { use, useState, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import { Plus, X, ChevronRight, Check, QrCode, Loader2 } from "lucide-react";
import { FileText, Ruler, Maximize2, Package } from "lucide-react";
import { useStore } from "@/hooks/useStore";
import { Scanner, type IDetectedBarcode, type IScannerError } from "@yudiel/react-qr-scanner";
import { computeWorkflowProgress } from "@/lib/data";
import type { TableConfig } from "@/hooks/useTableControls";
import { TablePagination } from "@/components/table/TablePagination";
import { useTableControls } from "@/hooks/useTableControls";
import { SortableHeader } from "@/components/table/SortableHeader";
import { TableToolbar } from "@/components/table/TableToolbar";
import { OptionsDropdown } from "@/components/table/OptionsDropdown";
import { MobileHeader } from "@/components/MobileHeader";
import { QRCodeModal, type QRModalData } from "@/components/QRCodeModal";
import { exportToExcel } from "@/lib/exportExcel";
import { workOrderService } from "@/src/services/workOrderService";
import { productionStageService } from "@/src/services/productionStageService";
import { useWorkOrderAccess } from "@/hooks/useWorkOrderAccess";
import { authService } from "@/src/services/authService";
import { slittingService } from "@/src/services/slittingService";
import { useEffect } from "react";

type DetailPageProps = {
  params: Promise<{ detailpage: string }>;
};

type TabType = "Raw Material" | "Metallisation" | "Slitting";

const rawMaterialConfig: TableConfig<any> = {
  columns: [
    { key: "rollNo", label: "Roll No", type: "text", sortable: true },
    { key: "netWeight", label: "Net Weight", type: "text", sortable: true },
    { key: "grossWeight", label: "Gross Weight", type: "text", sortable: true },
    { key: "thickness", label: "Micron", type: "text", sortable: true },
    { key: "width", label: "Width (m)", type: "text", sortable: true },
    { key: "temperature", label: "Temperature", type: "text", sortable: true },
    { key: "actualWeight", label: "Actual Weight", type: "text", sortable: true },
    { key: "damagedWeight", label: "Damaged Weight", type: "text", sortable: true },
    { key: "usedWeight", label: "Used Weight", type: "text", sortable: true },
    { key: "wastageWeight", label: "Wastage/Left Weight", type: "text", sortable: true },
    { key: "supplier", label: "Company/Supplier", type: "text", sortable: true },
    { key: "stage", label: "Stage", type: "enum", sortable: false, filter: "dropdown", options: ["Raw Material", "METALLISATION"] },
    { key: "status", label: "Status", type: "enum", sortable: false, filter: "dropdown", options: WO_STATUS_OPTIONS },
    { key: "qr", label: "QR", type: "text", sortable: false },
    { key: "options", label: "Action", type: "text", sortable: false },
  ],
};

// Slitting tab uses same columns as Metallisation tab
const metallisationConfig: TableConfig<any> = {
  columns: [
    { key: "coilNo", label: "Coil No.", type: "text", sortable: true },
    { key: "rmId", label: "RM ID", type: "text", sortable: true },
    { key: "rmWeight", label: "RM Weight", type: "text", sortable: true },
    { key: "factoryWastageWeight", label: "Factory Wastage Weight", type: "number", sortable: true },
    { key: "weight", label: "Metallisation Weight", type: "text", sortable: true },
    { key: "timestamp", label: "Timestamp", type: "date", sortable: true },
    { key: "nextStage", label: "Next Stage", type: "text", sortable: false },
    { key: "status", label: "Status", type: "enum", sortable: false, filter: "dropdown", options: WO_STATUS_OPTIONS },
    { key: "qr", label: "QR", type: "text", sortable: false },
    { key: "options", label: "Action", type: "text", sortable: false },
  ],
};

export default function OperatorSlittingDetailPage({ params }: DetailPageProps) {
  const { detailpage } = use(params);
  const orderId = detailpage.toUpperCase();

  const [loading, setLoading] = useState(true);
  const [woData, setWoData] = useState<any>(null);
  const [allWorkOrders, setAllWorkOrders] = useState<any[]>([]);

  const { isLocked } = useWorkOrderAccess(allWorkOrders);

  const fetchWorkOrder = async () => {
    try {
      const [data, allData] = await Promise.all([
        workOrderService.getByWorkOrderNo(orderId),
        workOrderService.list()
      ]);
      if (data) {
        setWoData(data);
      }
      if (allData) {
        setAllWorkOrders(allData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkOrder();
  }, [orderId]);

  const workOrderFlowData = useMemo(() => {
    if (!woData) return null;
    return {
      overview: {
        wordCount: 1,
        micron: woData.micron ? `${woData.micron}µ` : "-",
        width: woData.width_m ? `${woData.width_m}m` : (woData.width ? `${woData.width}mm` : "-"),
        quantity: woData.quantity ? `${woData.quantity}kg` : "-",
        date: new Date(woData.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
      },
      rawMaterialRows: (woData.work_order_materials || []).map((rm: any) => {
        const inv = rm.inventory || {};
        const actual = rm.quantity_kg ?? 0;
        const wastage = (woData?.metallisation as any[])
          ?.filter(m => m.raw_material_id === inv.id)
          .reduce((sum, m) => sum + (m.factory_wastage_kg || 0), 0) || 0;
        return {
          rollNo: inv.raw_material_code || inv.roll_no || "-",
          raw_material_id: inv.id || rm.raw_material_id,
          netWeight: inv.net_weight_kg != null ? `${inv.net_weight_kg}kgs` : "-",
          grossWeight: inv.gross_weight_kg != null ? `${inv.gross_weight_kg}kgs` : "-",
          thickness: inv.micron || "-",
          width: inv.width_m || "-",
          temperature: inv.temperature_c != null ? `${inv.temperature_c}°C` : "-",
          actualWeight: actual ? `${actual}kgs` : "-",
          damagedWeight: "-",
          usedWeight: actual ? `${actual}kgs` : "-",
          wastageWeight: wastage ? `${wastage}kgs` : "0kgs",
          supplier: inv.supplier || "-",
          stage: "Raw Material",
          status: rm.status || "Completed",
        };
      }),
      metallisationRows: (woData.metallisation || []).map((met: any) => ({
        coilNo: met.metallisation_no || met.id,
        metallisation_id: met.id,
        rmId: met.inventory?.raw_material_code || met.inventory?.roll_no || "-",
        rmWeight: met.inventory?.net_weight_kg ? `${met.inventory.net_weight_kg}kgs` : (met.inventory?.gross_weight_kg ? `${met.inventory.gross_weight_kg}kgs` : "-"),
        factoryWastageWeight: met.factory_wastage_kg || "0",
        weight: met.weight_kg || "0",
        timestamp: new Date(met.created_at).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }),
        nextStage: "Slitting",
        status: met.status || "Completed",
      })),
      // Slitting tab shows Metallisation coils that are Issued
      slittingRows: (woData.metallisation || [])
        .filter((met: any) => met.status === "Issued")
        .map((met: any) => ({
          coilNo: met.metallisation_no || met.id,
          metallisation_id: met.id,
          rmId: met.inventory?.raw_material_code || met.inventory?.roll_no || "-",
          rmWeight: met.inventory?.net_weight_kg ? `${met.inventory.net_weight_kg}kgs` : (met.inventory?.gross_weight_kg ? `${met.inventory.gross_weight_kg}kgs` : "-"),
          factoryWastageWeight: met.factory_wastage_kg || "0",
          weight: met.weight_kg || "0",
          timestamp: new Date(met.created_at).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }),
          nextStage: "Slitting",
          status: met.status || "Issued",
        })),
    };
  }, [woData]);

  const workflowProgress = {
    stage: woData?.stage || "Raw Material",
    status: woData?.status || "Yet to Start",
  };

  const [activeTab, setActiveTab] = useState<TabType>("Raw Material");
  const [qrData, setQrData] = useState<QRModalData | null>(null);

  // Scanner state
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [pendingScanData, setPendingScanData] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [invalidCoilId, setInvalidCoilId] = useState<string | null>(null);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const scanLockRef = useRef(false);

  const currentConfig = useMemo(() => {
    // Both Metallisation and Slitting tabs use the same column config
    switch (activeTab) {
      case "Raw Material": return rawMaterialConfig;
      case "Metallisation": return metallisationConfig;
      case "Slitting": return metallisationConfig;
      default: return rawMaterialConfig;
    }
  }, [activeTab]);

  const currentData = useMemo(() => {
    if (!workOrderFlowData) return [];
    switch (activeTab) {
      case "Raw Material": return workOrderFlowData.rawMaterialRows;
      case "Metallisation": return workOrderFlowData.metallisationRows;
      case "Slitting": return workOrderFlowData.slittingRows;
      default: return [];
    }
  }, [workOrderFlowData, activeTab]);

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
  const { paginatedData, totalPages, validPage: currentPage } = getPaginatedData(processedData);

  if (loading || !woData) return <div className="p-6 text-center text-[#5C5C5C]">Loading work order...</div>;

  if (isLocked(woData)) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center p-6">
        <div className="bg-white rounded-xl shadow-sm border border-[#EBEBEB] p-8 max-w-md w-full text-center flex flex-col items-center">
          <div className="w-16 h-16 bg-[#F5F7FA] rounded-full flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#A1A1AA]"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          </div>
          <h2 className="text-xl font-bold text-[#171717] mb-2">Work Order Locked</h2>
          <p className="text-[#5C5C5C] mb-6">
            This work order is locked. Please complete the active 'Yet to Start' work orders first.
          </p>
          <Link href="/slitting-operator/workorder" className="h-[40px] px-6 bg-[#00B6E2] text-white font-medium rounded-[8px] flex items-center justify-center hover:bg-[#0095B8] transition-colors">
            Back to Work Orders
          </Link>
        </div>
      </div>
    );
  }

  if (!workOrderFlowData) return <div className="p-6 text-center text-[#5C5C5C]">Work Order not found</div>;

  const openScanner = () => {
    setScanError(null);
    setPendingScanData(null);
    setInvalidCoilId(null);
    scanLockRef.current = false;
    setIsScannerOpen(true);
  };

  const closeScanner = () => {
    setIsScannerOpen(false);
    setScanError(null);
    setPendingScanData(null);
    setInvalidCoilId(null);
    scanLockRef.current = false;
  };

  const handleScan = async (detectedCodes: IDetectedBarcode[]) => {
    if (scanLockRef.current) return;
    const rawValue = detectedCodes[0]?.rawValue;
    if (!rawValue) return;
    scanLockRef.current = true;

    try {
      const scan = await slittingService.scanMetallisationCoil(rawValue);
      console.log(scan);
      
      if (isLocked(scan.work_order_id)) {
        setScanError(`Coil belongs to locked Work Order (${scan.work_order_id}). Complete active ones first.`);
        setPendingScanData(null);
        return;
      }

      if (scan.work_order_id !== woData.id) {
        // Wrong work order — show invalid coil error, keep scanner open for retry
        setInvalidCoilId(scan.coil_no || scan.metallisation_no || rawValue);
        setPendingScanData(null);
      } else {
        setInvalidCoilId(null);
        setPendingScanData(scan);
        setScanError(null);
      }
    } catch (err: any) {
      setScanError(err.message || "Failed to scan coil. Please try again.");
      setPendingScanData(null);
    } finally {
      setTimeout(() => { scanLockRef.current = false; }, 1500);
    }
  };

  const handleScanError = (err: IScannerError) => {
    const msg = err?.message || "";
    if (msg.includes("Permission") || msg.includes("permission") || msg.includes("denied")) {
      setScanError("Camera permission denied.");
    } else if (err.kind === "in-use") {
      setScanError("Camera is already in use by another application.");
    } else {
      setScanError(msg || "Failed to start camera.");
    }
  };

  const handleManualEntry = (value: string) => {
    if (!value.trim()) return;
    scanLockRef.current = false;
    handleScan([{ rawValue: value.trim() } as IDetectedBarcode]);
  };

  const handleConfirmCoil = async () => {
    if (!pendingScanData) return;
    try {
      setIsSubmitting(true);
      const profile = await authService.getCurrentProfile();
      const confirmRes = await slittingService.confirmMetallisationCoil({
        qr_value: pendingScanData.metallisation_no || pendingScanData.coil_no,
        work_order_id: pendingScanData.work_order_id,
        product_order_id: pendingScanData.product_order?.id,
        idempotency_key: `${pendingScanData.metallisation_id}:${profile?.id || "system"}:confirm`,
      });

      // Check if backend already updated the status; if not, update it ourselves
      const alreadyIssued =
        (confirmRes as any)?.confirmation?.status === "Issued" ||
        pendingScanData.metallisation_status === "Issued" ||
        confirmRes.duplicate;

      if (!alreadyIssued) {
        await productionStageService.updateMetallisation(pendingScanData.metallisation_id, {
          status: "Issued",
        } as any);
      }

      // Refresh work order data so Slitting tab shows the new coil
      await fetchWorkOrder();

      closeScanner();
      setSuccessModalOpen(true);
    } catch (err: any) {
      console.error(err);
      setScanError(err.message || "Failed to confirm coil. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const overviewFields = [
    { label: "Word Count", value: workOrderFlowData.overview.wordCount },
    { label: "Micron", value: workOrderFlowData.overview.micron },
    { label: "Width", value: workOrderFlowData.overview.width },
    { label: "Quantity", value: workOrderFlowData.overview.quantity },
    { label: "Stage", value: workflowProgress.stage },
    { label: "Date", value: workOrderFlowData.overview.date },
    { label: "Status", value: <StatusBadge status={workflowProgress.status} /> },
  ];

  const detailKpiStats = [
    { label: "Word Count", value: workOrderFlowData.overview.wordCount, icon: FileText, valClass: "text-[#171717]" },
    { label: "Micron", value: workOrderFlowData.overview.micron, icon: Ruler, valClass: "text-[#171717]" },
    { label: "Width", value: workOrderFlowData.overview.width, icon: Maximize2, valClass: "text-[#171717]" },
    { label: "Quantity", value: workOrderFlowData.overview.quantity, icon: Package, valClass: "text-[#171717]" },
  ];

  const detailChips = [
    { label: "Stage", value: workflowProgress.stage },
    { label: "Date", value: workOrderFlowData.overview.date },
    { label: "Status", value: <StatusBadge status={workflowProgress.status} /> },
  ];

  return (
    <div className="font-dm-sans min-h-[calc(100vh-72px)] bg-white flex flex-col relative overflow-x-hidden">
      <MobileHeader title="Work Orders details" />

      {/* ─── QR Scanner Overlay ─── */}
      {isScannerOpen && (
        <div className="fixed inset-0 z-[60] bg-[#171717]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[16px] w-full max-w-md overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-[#EBEBEB]">
              <h3 className="font-semibold text-[#171717]">Scan Metallisation Coil</h3>
              <button onClick={closeScanner} className="p-1 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5 text-[#5C5C5C]" />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-4">
              {/* Invalid work order error — keep scanner open for retry */}
              {invalidCoilId && (
                <div className="p-3 bg-[#FEF3F2] border border-[#FEE4E2] rounded-[10px] text-center">
                  <p className="text-[13px] font-medium text-[#D92D20] mb-1">Invalid Metallisation Coil</p>
                  <p className="text-[12px] text-[#D92D20]">
                    Metallisation Coil <strong>{invalidCoilId}</strong> is not available in the selected Work Order.
                    Please scan a valid Metallisation Coil for this Work Order.
                  </p>
                  <button
                    onClick={() => setInvalidCoilId(null)}
                    className="mt-3 text-[12px] font-medium text-[#D92D20] underline"
                  >
                    Scan again
                  </button>
                </div>
              )}

              {/* Scan error (camera / network error) */}
              {scanError && !invalidCoilId && (
                <div className="p-3 bg-[#FEF3F2] border border-[#FEE4E2] rounded-[10px] text-center">
                  <p className="text-[13px] text-[#D92D20]">{scanError}</p>
                  <button
                    onClick={() => { setScanError(null); scanLockRef.current = false; }}
                    className="mt-2 text-[12px] font-medium text-[#D92D20] underline"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Confirmation card — shown after a valid scan */}
              {pendingScanData ? (
                <div className="flex flex-col gap-4">
                  <p className="text-[14px] font-semibold text-[#171717]">Confirm Metallisation Coil</p>
                  <div className="rounded-[10px] border border-[#DDE1E8] bg-[#F5F7FA] p-4 flex flex-col gap-2 text-[13px]">
                    {[
                      ["Coil No.", pendingScanData.coil_no || "-"],
                      ["Work Order", pendingScanData.work_order_no || "-"],
                      ["Material", pendingScanData.material || "-"],
                      ["Micron", pendingScanData.micron != null ? `${pendingScanData.micron}µ` : "-"],
                      ["Width", pendingScanData.width_m != null ? `${pendingScanData.width_m} m` : "-"],
                      ["Metallisation Weight", pendingScanData.weight_kg != null ? `${pendingScanData.weight_kg} kg` : "-"],
                      ["Metallisation Status", pendingScanData.metallisation_status || "-"],
                      ["Existing Slitting Status", pendingScanData.existing_slitting_status || "None"],
                    ].map(([label, val]) => (
                      <div key={label} className="flex justify-between gap-4">
                        <span className="text-[#5C5C5C]">{label}</span>
                        <span className="font-medium text-[#171717] text-right">{val}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => { setPendingScanData(null); scanLockRef.current = false; }}
                      className="flex-1 h-[44px] bg-white border border-[#DDE1E8] hover:bg-[#F5F7FA] text-[#171717] rounded-[8px] font-medium text-[14px] transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirmCoil}
                      disabled={isSubmitting}
                      className="flex-1 h-[44px] bg-[#00B6E2] hover:bg-[#0092b5] disabled:bg-[#A7DDEB] text-white rounded-[8px] font-medium text-[14px] flex items-center justify-center gap-2 transition-colors"
                    >
                      {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                      {isSubmitting ? "Confirming..." : "Confirm Coil"}
                    </button>
                  </div>
                </div>
              ) : !invalidCoilId ? (
                /* Camera view */
                <>
                  <p className="text-[13px] text-center text-[#5C5C5C]">Scan the QR code on the Metallisation Coil.</p>
                  <div className="w-full aspect-[4/3] bg-black rounded-[12px] overflow-hidden relative shadow-inner">
                    <Scanner
                      onScan={handleScan}
                      onError={handleScanError}
                      allowMultiple={false}
                      constraints={{ facingMode: "environment", width: { ideal: 480 }, height: { ideal: 360 } }}
                      styles={{ container: { width: "100%", height: "100%" }, video: { objectFit: "cover" } }}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <p className="text-[12px] text-[#8B8BA2] text-center">Or enter coil number manually:</p>
                    <div className="flex gap-2">
                      <input
                        id="manualCoilInput"
                        type="text"
                        placeholder="Enter coil no. and press Enter"
                        className="flex-1 h-[42px] rounded-[8px] border border-[#DDE1E8] px-3 text-[14px]"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleManualEntry(e.currentTarget.value);
                        }}
                      />
                      <button
                        onClick={() => {
                          const el = document.getElementById("manualCoilInput") as HTMLInputElement;
                          if (el) handleManualEntry(el.value);
                        }}
                        className="h-[42px] px-4 bg-[#00B6E2] hover:bg-[#0092b5] text-white rounded-[8px] text-[14px] font-medium transition-colors"
                      >
                        Go
                      </button>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* ─── Success Modal ─── */}
      {successModalOpen && (
        <div className="fixed inset-0 z-[60] bg-[#171717]/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[16px] w-full max-w-sm shadow-2xl p-8 flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-[#E6F7FF] border border-[#9DDBF6] flex items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-[#00B6E2] flex items-center justify-center">
                <Check className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-[18px] font-semibold text-[#171717]">Coil Issued Successfully</p>
            <p className="text-[13px] text-[#5C5C5C]">The Metallisation Coil has been confirmed and marked as Issued.</p>
            <button
              onClick={() => { setSuccessModalOpen(false); setActiveTab("Slitting"); }}
              className="w-full h-[44px] bg-[#00B6E2] hover:bg-[#0092b5] text-white rounded-[8px] font-medium text-[14px] transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Desktop breadcrumb */}
      <section className="bg-white border-b border-[#EBEBEB] hidden md:block">
        <div className="px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[14px]">
            <Link href="/slitting-operator/workorder" className="text-[#5C5C5C] hover:text-black">Work Orders</Link>
            <ChevronRight className="w-4 h-4 text-[#8B8BA2]" />
            <span className="text-[#00B6E2] font-medium">Work order Details</span>
          </div>
        </div>
      </section>

      {/* Mobile KPI section */}
      <section className="grid grid-cols-2 gap-0 md:hidden mx-4 mt-[72px] bg-white border border-[#EBEBEB] rounded-[12px]">
        {detailKpiStats.map((stat, i) => {
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

      {/* Desktop overview row */}
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

      <section className="w-full px-4 md:px-6 py-6 flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <TableToolbar
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            onExport={() => {
              const exportData = currentData.map((row: any) => ({
                ...(activeTab === "Raw Material" ? {
                  "Roll No": row.rollNo ?? "",
                  "Net Weight": row.netWeight ?? row.weight ?? "",
                  "Gross Weight": row.grossWeight ?? "",
                  "Micron": row.thickness ?? "",
                  "Width (m)": row.width ?? "",
                  "Temperature": row.temperature ?? "",
                  "Supplier": row.supplier ?? "",
                  "Stage": row.stage ?? "",
                  "Status": row.status ?? "",
                } : {
                  "Coil No": row.coilNo ?? "",
                  "RM ID": row.rmId ?? "",
                  "RM Weight": row.rmWeight ?? "",
                  "Factory Wastage": row.factoryWastageWeight ?? "",
                  "Metallisation Weight": row.weight ?? "",
                  "Timestamp": row.timestamp ?? "",
                  "Next Stage": row.nextStage ?? "",
                  "Status": row.status ?? "",
                })
              }));
              exportToExcel(exportData, `workorder-detail-${activeTab.toLowerCase().replace(/\s+/g, "-")}`, activeTab);
            }}
          />

          {activeTab === "Slitting" && (
            <button
              onClick={openScanner}
              type="button"
              className="flex items-center justify-center gap-2 bg-[#00B6E2] text-white text-[14px] font-medium rounded-[6px] h-[40px] px-[18px] hover:bg-[#0092b5] transition-colors shrink-0 w-full sm:w-auto"
            >
              <Plus className="w-4 h-4 shrink-0" strokeWidth={2.5} />
              <span className="leading-tight truncate">Add Slitting</span>
            </button>
          )}
        </div>

        {/* Scrollable tab bar on mobile */}
        <div className="overflow-x-auto -mx-4 md:mx-0 px-4 md:px-0">
          <div className="flex items-center gap-2 border-b border-[#EBEBEB] pb-4 min-w-max">
            {(["Raw Material", "Metallisation", "Slitting"] as TabType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as TabType)}
                className={`px-4 py-2 text-[14px] font-medium rounded-[8px] transition-colors whitespace-nowrap ${
                  activeTab === tab
                    ? "bg-[#00B6E2] text-white"
                    : "bg-white text-[#5C5C5C] hover:bg-[#F5F7FA]"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white border border-[#EBEBEB] rounded-[12px] overflow-hidden">
          <div className="overflow-x-auto min-h-[300px]">
            <table className="w-full text-left border-collapse min-w-[900px]">
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
                {paginatedData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50 transition-colors group">
                    {currentConfig.columns.map((col) => {
                      if (String(col.key) === "qr") {
                        const isRM = activeTab === "Raw Material";
                        const rowId = isRM ? (row as any).rollNo : (row as any).coilNo;
                        const qrType = isRM ? "RM" : "MC";
                        const qrDetails: any = isRM
                          ? { rollNo: (row as any).rollNo ?? "", micron: (row as any).thickness ?? "", width: (row as any).width ?? "", netWeight: (row as any).netWeight.split('k')[0] ?? "", grossWeight: (row as any).grossWeight.split('k')[0] ?? "", supplier: (row as any).supplier ?? "", status: (row as any).status ?? "" }
                          : { coilNo: (row as any).coilNo ?? "", rmId: (row as any).rmId ?? "", factoryWastageWeight: (row as any).factoryWastageWeight ?? "", weight: (row as any).weight ?? "", date: (row as any).timestamp ?? "", status: (row as any).status ?? "" };
                        return (
                          <td key={String(col.key)} className="px-4 py-3 whitespace-nowrap">
                            <button
                              onClick={() => setQrData({ id: rowId, type: qrType, data: qrDetails })}
                              className="inline-flex items-center justify-center w-8 h-8 rounded-full hover:bg-[#F5F7FA] transition-colors text-[#5C5C5C] hover:text-[#00B6E2]"
                              title="Show QR Code"
                            >
                              <QrCode className="w-4 h-4" />
                            </button>
                          </td>
                        );
                      }
                      if (String(col.key) === "options") {
                        const isRM = activeTab === "Raw Material";
                        const rowId = isRM ? (row as any).rollNo : (row as any).coilNo;
                        const qrType = isRM ? "RM" : "MC";
                        const qrDetails: any = isRM
                          ? { rollNo: (row as any).rollNo ?? "", netWeight: (row as any).netWeight ?? "", status: (row as any).status ?? "" }
                          : { coilNo: (row as any).coilNo ?? "", rmId: (row as any).rmId ?? "", weight: (row as any).weight ?? "", status: (row as any).status ?? "" };
                        return (
                          <td key={String(col.key)} className="px-4 py-3 whitespace-nowrap">
                            {!isRM ? (
                              <OptionsDropdown
                                onEdit={() => alert(`Edit ${activeTab} Row ${idx}`)}
                                onDelete={() => alert(`Delete ${activeTab} Row ${idx}`)}
                                onQrCode={() => setQrData({ id: rowId, type: qrType, data: qrDetails })}
                                status={row.status}
                              />
                            ) : (
                              <button onClick={() => setQrData({ id: rowId, type: qrType, data: qrDetails })} className="text-[#5C5C5C] hover:text-[#00B6E2] transition-colors">
                                <QrCode className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        );
                      }
                      if (String(col.key) === "status") {
                        return (
                          <td key={String(col.key)} className="px-4 py-4 whitespace-nowrap">
                            <StatusBadge status={row[col.key]} />
                          </td>
                        );
                      }
                      const val = row[col.key];
                      let displayVal = val;
                      if (activeTab === "Raw Material" && !val) {
                        const fallbackWeight = (row as any).netWeight ?? (row as any).weight ?? "-";
                        if (col.key === "actualWeight") displayVal = fallbackWeight;
                        else if (col.key === "usedWeight") displayVal = fallbackWeight;
                        else if (col.key === "damagedWeight") displayVal = "0.0kgs";
                        else if (col.key === "wastageWeight") displayVal = "0.0kgs";
                      }
                      return (
                        <td key={String(col.key)} className={`px-4 py-4 text-[14px] ${['rollNo', 'coilNo'].includes(String(col.key)) ? 'text-[#00B6E2] font-semibold' : 'text-[#5C5C5C]'} whitespace-nowrap`}>
                          {displayVal}
                        </td>
                      );
                    })}
                  </tr>
                ))}
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
