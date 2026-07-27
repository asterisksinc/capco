"use client";

import { WO_STATUS_OPTIONS, WO_STAGE_OPTIONS } from "@/lib/constants";
import { StatusBadge } from "@/components/StatusBadge";
import { use, useState, useEffect, useMemo } from "react";
import { Plus, X, ChevronRight, Check, QrCode } from "lucide-react";
import { FileText, Ruler, Maximize2, Package, Loader2 } from "lucide-react";
import { ScannerInput } from "@/components/ScannerInput";
import { workOrderService } from "@/src/services/workOrderService";
import { productionStageService } from "@/src/services/productionStageService";
import { stockService } from "@/src/services/stockService";
import { authService } from "@/src/services/authService";
import type { TableConfig } from "@/hooks/useTableControls";
import { TablePagination } from "@/components/table/TablePagination";
import { useTableControls } from "@/hooks/useTableControls";
import { SortableHeader } from "@/components/table/SortableHeader";
import { TableToolbar } from "@/components/table/TableToolbar";
import { MobileHeader } from "@/components/MobileHeader";
import { QRCodeModal, type QRModalData } from "@/components/QRCodeModal";
import { exportToExcel } from "@/lib/exportExcel";

type DetailPageProps = {
  params: Promise<{ detailpage: string }>;
};

type TabType = "Raw Material" | "Metallisation" | "Slitting";
type ModalStep = 1 | 2 | 3;

type MetallisationForm = {
  coilNo: string;
  rmId: string;
  machineNo: string;
  weight: string;
  opticalDensity: string;
  resistance: string;
  nextStage: string;
};

type SlittingForm = {
  productNo: string;
  associatedRmId: string;
  micron: string;
  width: string;
  weight: string;
  grade: string;
  remarks: string;
};

const micronOptions = ["2", "2.5", "3", "3.5", "4", "4.5", "4.5HT", "5", "5.5", "6", "6.5", "7", "7.5"];
const gradeOptions = ["AA", "A", "B", "C", "D"];

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

const metallisationConfig: TableConfig<any> = {
  columns: [
    { key: "coilNo", label: "Coil No.", type: "text", sortable: true },
    { key: "rmId", label: "RM ID", type: "text", sortable: true },
    // { key: "machineNo", label: "Machine No.", type: "text", sortable: true },
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

const slittingConfig: TableConfig<any> = {
  columns: [
    { key: "productNo", label: "Product No", type: "text", sortable: true },
    { key: "rmId", label: "RM ID", type: "text", sortable: true },
    { key: "weight", label: "Weight", type: "text", sortable: true },
    { key: "thickness", label: "Thickness", type: "text", sortable: true },
    { key: "grade", label: "Grade", type: "text", sortable: true },
    { key: "timestampAdded", label: "Timestamp Added", type: "date", sortable: true },
    { key: "stage", label: "Stage", type: "enum", sortable: false, filter: "dropdown", options: ["Slitting", "Ready for Winding", "Completed"] },
    { key: "status", label: "Status", type: "enum", sortable: false, filter: "dropdown", options: WO_STATUS_OPTIONS },
    { key: "qr", label: "QR", type: "text", sortable: false },
    { key: "options", label: "Action", type: "text", sortable: false },
  ],
};

const defaultMetallisationForm: MetallisationForm = {
  coilNo: "",
  rmId: "",
  machineNo: "M-01",
  weight: "",
  opticalDensity: "2.4",
  resistance: "1.5",
  nextStage: "Slitting",
};

const defaultSlittingForm: SlittingForm = {
  productNo: "",
  associatedRmId: "",
  micron: "4.5",
  width: "1.0",
  weight: "",
  grade: "AA",
  remarks: "",
};



function generateId(prefix: string) {
  return `${prefix}-${Math.floor(Math.random() * 10000).toString().padStart(4, "0")}`;
}

function hasPositiveNumber(value: string) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0;
}

export default function OperatorWorkOrderDetailPage({ params }: DetailPageProps) {
  const { detailpage } = use(params);
  const orderId = detailpage.toUpperCase();

  // ── State (ALL hooks before any conditional return) ───────────────────────
  const [woData, setWoData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [activeTab, setActiveTab] = useState<TabType>("Raw Material");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState<ModalStep>(1);
  const [showValidationHint, setShowValidationHint] = useState(false);
  const [slittingReviewRemarks, setSlittingReviewRemarks] = useState("");
  const [modalImage, setModalImage] = useState<string | null>(null);
  const [qrData, setQrData] = useState<QRModalData | null>(null);

  const [metallisationRowsInput, setMetallisationRowsInput] = useState<MetallisationForm[]>([{ ...defaultMetallisationForm, coilNo: generateId("MC") }]);
  const [slittingRowsInput, setSlittingRowsInput] = useState<SlittingForm[]>([{ ...defaultSlittingForm, productNo: `PM-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}` }]);

  // ── Data fetch ────────────────────────────────────────────────────────────
  const refreshWoData = async () => {
    try {
      const data: any = await workOrderService.getByWorkOrderNo(orderId);
      if (data) {
        setWoData(data);
      }
    } catch (err) {
      console.error("Failed to load work order:", err);
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      await refreshWoData();
      setLoading(false);
    })();
  }, [orderId]);

  // ── Derived table data ────────────────────────────────────────────────────
  const rawMaterialRows = useMemo(() => {
    return (woData?.work_order_materials || []).map((rm: any) => {
      const inv = rm.inventory || {};
      const actual = rm.quantity_kg ?? 0;

      const wastage = (woData?.metallisation as any[])
        ?.filter(m => m.raw_material_id === inv.id)
        .reduce((sum, m) => sum + (m.factory_wastage_kg || 0), 0) || 0;

      return {
        rollNo: inv.raw_material_code || inv.roll_no || "-",
        raw_material_id: inv.id || rm.raw_material_id, // we need this for submission
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
    });
  }, [woData]);

  const metallisationRows = useMemo(() => {
    return ((woData?.metallisation as any[]) || []).map((m) => ({
      coilNo: m.metallisation_no || "-",
      rmId: m.inventory?.raw_material_code || m.inventory?.roll_no || "-",
      rmWeight: m.inventory?.net_weight_kg ? `${m.inventory.net_weight_kg}kgs` : (m.inventory?.gross_weight_kg ? `${m.inventory.gross_weight_kg}kgs` : "-"),
      factoryWastageWeight: m.factory_wastage_kg != null ? `${m.factory_wastage_kg}kgs` : "-",
      weight: m.weight_kg != null ? `${m.weight_kg}kgs` : "-",
      timestamp: m.created_at
        ? new Date(m.created_at).toLocaleString("en-GB", {
          day: "2-digit", month: "short", year: "numeric",
          hour: "2-digit", minute: "2-digit",
        })
        : "-",
      nextStage: m.next_stage || "Slitting",
      status: m.status || "-",
    }));
  }, [woData]);

  const slittingRows = useMemo(() => {
    return ((woData?.slitting as any[]) || []).map((s) => ({
      productNo: s.product_no || "-",
      rmId: s.metallisation?.metallisation_no || "-",
      weight: s.weight_kg != null ? `${s.weight_kg}kgs` : "-",
      thickness: s.thickness_micron || "-",
      grade: s.grade || "-",
      timestampAdded: s.created_at
        ? new Date(s.created_at).toLocaleDateString("en-GB")
        : "-",
      stage: s.stage || "-",
      status: s.status || "-",
    }));
  }, [woData]);

  // ── Lookup maps (for modal dropdowns + auto-fill) ─────────────────────────
  // rollNo → inventory UUID
  const rmIdByRollNo = useMemo(() => {
    const map = new Map<string, string>();
    for (const wom of (woData?.work_order_materials as any[]) || []) {
      if (wom.inventory?.roll_no && wom.inventory?.id) {
        map.set(wom.inventory.roll_no, wom.inventory.id);
      }
    }
    return map;
  }, [woData]);

  // rollNo → { weight, thickness, supplier }
  const rmLookup = useMemo(() => {
    const map = new Map<string, { weight: string; thickness: string; supplier: string }>();
    for (const wom of (woData?.work_order_materials as any[]) || []) {
      if (wom.inventory?.roll_no) {
        map.set(wom.inventory.roll_no, {
          weight: wom.inventory.current_weight_kg?.toString() ?? "",
          thickness: wom.inventory.micron?.toString() ?? "",
          supplier: wom.inventory.supplier ?? "",
        });
      }
    }
    return map;
  }, [woData]);

  // metallisation_no → metallisation UUID
  const metallisationIdByNo = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of (woData?.metallisation as any[]) || []) {
      if (m.metallisation_no && m.id) {
        map.set(m.metallisation_no, m.id);
      }
    }
    return map;
  }, [woData]);

  // metallisation_no → { weight, opticalDensity, resistance }
  const coilLookup = useMemo(() => {
    const map = new Map<string, { weight: string; opticalDensity: string; resistance: string }>();
    for (const m of (woData?.metallisation as any[]) || []) {
      if (m.metallisation_no) {
        map.set(m.metallisation_no, {
          weight: m.weight_kg?.toString() ?? "",
          opticalDensity: m.optical_density?.toString() ?? "",
          resistance: m.resistance_ohms?.toString() ?? "",
        });
      }
    }
    return map;
  }, [woData]);

  const availableRollIds = useMemo(
    () => Array.from(rmIdByRollNo.keys()),
    [rmIdByRollNo]
  );

  const availableCoilIds = useMemo(
    () => Array.from(metallisationIdByNo.keys()),
    [metallisationIdByNo]
  );

  // ── Current tab data + table controls ────────────────────────────────────
  const currentData = useMemo(() => {
    switch (activeTab) {
      case "Raw Material": return rawMaterialRows;
      case "Metallisation": return metallisationRows;
      case "Slitting": return slittingRows;
      default: return rawMaterialRows;
    }
  }, [activeTab, rawMaterialRows, metallisationRows, slittingRows]);

  const currentConfig = useMemo(() => {
    switch (activeTab) {
      case "Raw Material": return rawMaterialConfig;
      case "Metallisation": return metallisationConfig;
      case "Slitting": return slittingConfig;
      default: return rawMaterialConfig;
    }
  }, [activeTab]);

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
  } = useTableControls({ data: currentData, config: currentConfig });

  // ── Guard: loading / not found ────────────────────────────────────────────
  const { paginatedData, totalPages, validPage: currentPage } = getPaginatedData(processedData);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-72px)] bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-[#00B6E2]" />
      </div>
    );
  }

  if (!woData) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-72px)] bg-white">
        <p className="text-[#5C5C5C]">Work order not found.</p>
      </div>
    );
  }

  // ── Modal helpers ─────────────────────────────────────────────────────────
  const resetModalState = () => {
    setModalStep(1);
    setShowValidationHint(false);
    setModalImage(null);
    setSlittingReviewRemarks("");
    setMetallisationRowsInput([{ ...defaultMetallisationForm, coilNo: generateId("MC"), rmId: availableRollIds[0] ?? "" }]);
    setSlittingRowsInput([{ ...defaultSlittingForm, productNo: `PM-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`, associatedRmId: availableCoilIds[0] ?? "" }]);
  };

  const openModal = () => { resetModalState(); setIsModalOpen(true); };
  const closeModal = () => { setIsModalOpen(false); resetModalState(); };

  // ── Validation ────────────────────────────────────────────────────────────
  const isMetallisationRowValid = (row: MetallisationForm) =>
    Boolean(row.coilNo.trim() && row.rmId.trim() && row.machineNo.trim() && hasPositiveNumber(row.weight) && row.opticalDensity.trim() && row.resistance.trim() && row.nextStage.trim());

  const isSlittingRowValid = (row: SlittingForm) =>
    Boolean(row.productNo.trim() && row.associatedRmId.trim() && micronOptions.includes(row.micron.trim()) && row.width.trim() && hasPositiveNumber(row.weight) && row.grade.trim());

  const isCurrentStepOneValid =
    activeTab === "Metallisation"
      ? metallisationRowsInput.every(isMetallisationRowValid)
      : slittingRowsInput.every(isSlittingRowValid);

  const isStepTwoValid = activeTab === "Slitting" ? Boolean(slittingReviewRemarks.trim()) : true;

  const getCurrentDraftCount = () =>
    activeTab === "Metallisation" ? metallisationRowsInput.length : slittingRowsInput.length;

  // ── Row edit helpers ──────────────────────────────────────────────────────
  const addCurrentItemToDraft = () => {
    if (!isCurrentStepOneValid) { setShowValidationHint(true); return; }
    if (activeTab === "Metallisation") {
      setMetallisationRowsInput((prev) => [...prev, { ...defaultMetallisationForm, coilNo: generateId("MC"), rmId: availableRollIds[0] ?? "" }]);
      return;
    }
    setSlittingRowsInput((prev) => [...prev, { ...defaultSlittingForm, productNo: `PM-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`, associatedRmId: availableCoilIds[0] ?? "" }]);
  };

  const updateMetallisationRow = (index: number, patch: Partial<MetallisationForm>) => {
    setMetallisationRowsInput((prev) => prev.map((row, idx) => (idx === index ? { ...row, ...patch } : row)));
  };

  const updateSlittingRow = (index: number, patch: Partial<SlittingForm>) => {
    setSlittingRowsInput((prev) => prev.map((row, idx) => (idx === index ? { ...row, ...patch } : row)));
  };

  const removeCurrentRow = (index: number) => {
    if (activeTab === "Metallisation") {
      if (metallisationRowsInput.length === 1) return;
      setMetallisationRowsInput((prev) => prev.filter((_, idx) => idx !== index));
      return;
    }
    if (slittingRowsInput.length === 1) return;
    setSlittingRowsInput((prev) => prev.filter((_, idx) => idx !== index));
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const submitCurrentStage = async () => {
    if (!isCurrentStepOneValid || !isStepTwoValid) { setShowValidationHint(true); return; }
    setSubmitting(true);
    try {
      const user = await authService.getCurrentProfile();

      if (activeTab === "Metallisation") {
        const existingData = await productionStageService.listMetallisation();
        let maxMcId = 0;
        for (const row of existingData as any[]) {
          const match = row.metallisation_no?.match(/MC-(\d+)/);
          if (match) maxMcId = Math.max(maxMcId, parseInt(match[1], 10));
        }

        for (const item of metallisationRowsInput) {
          const rawMaterialId = rmIdByRollNo.get(item.rmId) ?? "";
          let success = false;
          let retries = 0;
          let currentMaxId = maxMcId;

          while (!success && retries < 3) {
            currentMaxId++;
            const finalId = `MC-${String(currentMaxId).padStart(4, "0")}`;
            try {
              await productionStageService.addMetallisation({
                metallisation_no: finalId,
                work_order_id: woData.id,
                raw_material_id: rawMaterialId,
                operator_id: user?.id,
                coil_no: finalId,
                machine_no: item.machineNo || undefined,
                weight_kg: parseFloat(item.weight) || 0,
                optical_density: parseFloat(item.opticalDensity) || undefined,
                resistance_ohms: parseFloat(item.resistance) || undefined,
              });
              success = true;
              maxMcId = currentMaxId;
            } catch (err: any) {
              if (err?.message?.toLowerCase().includes("duplicate") || err?.code === "23505") {
                retries++;
              } else {
                throw err;
              }
            }
          }
          if (!success) throw new Error("Failed to generate unique MC ID after multiple attempts.");
        }
      }

      if (activeTab === "Slitting") {
        const existingData = await productionStageService.listSlitting();
        let maxPmId = 0;
        for (const row of existingData as any[]) {
          const match = row.product_no?.match(/PM-(\d+)/);
          if (match) maxPmId = Math.max(maxPmId, parseInt(match[1], 10));
        }

        for (const item of slittingRowsInput) {
          const metallisationId = metallisationIdByNo.get(item.associatedRmId) ?? undefined;
          let success = false;
          let retries = 0;
          let currentMaxId = maxPmId;

          while (!success && retries < 3) {
            currentMaxId++;
            const finalId = `PM-${String(currentMaxId).padStart(4, "0")}`;
            try {
              const slittingRecord = await productionStageService.addSlitting({
                slitting_no: generateId("SL"),
                work_order_id: woData.id,
                metallisation_id: metallisationId,
                raw_material_id: metallisationId ? undefined : "",
                operator_id: user?.id,
                product_no: finalId,
                weight_kg: parseFloat(item.weight) || 0,
                thickness_micron: parseFloat(item.micron) || 0,
                width_m: parseFloat(item.width) || undefined,
                grade: item.grade,
                remarks: slittingReviewRemarks || undefined,
              });
              
              await stockService.create({
                stock_no: (slittingRecord as any).product_no || finalId,
                slitting_id: (slittingRecord as any).id,
                work_order_id: woData.id,
                weight_kg: parseFloat(item.weight) || 0,
                width_m: parseFloat(item.width) || undefined,
                micron: parseFloat(item.micron) || 0,
                grade: item.grade,
                quantity: 1,
                stage: "Stock",
              });
              
              success = true;
              maxPmId = currentMaxId;
            } catch (err: any) {
              if (err?.message?.toLowerCase().includes("duplicate") || err?.code === "23505") {
                retries++;
              } else {
                throw err;
              }
            }
          }
          if (!success) throw new Error("Failed to generate unique PM ID after multiple attempts.");
        }
      }

      setModalStep(3);
      await refreshWoData();
    } catch (err) {
      console.error("Submit failed:", err);
      alert("Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Overview fields ───────────────────────────────────────────────────────
  const overviewFields = [
    { label: "Work Order", value: woData.work_order_no },
    { label: "Micron", value: `${woData.micron}μ` },
    { label: "Width", value: `${woData.width_m}m` },
    { label: "Quantity", value: String(woData.quantity) },
    { label: "Stage", value: woData.stage },
    { label: "Date", value: new Date(woData.created_at).toLocaleDateString("en-GB") },
    { label: "Status", value: <StatusBadge status={woData.status} /> },
  ];

  const detailKpiStats = [
    { label: "Work Order", value: woData.work_order_no, icon: FileText, valClass: "text-[#171717]" },
    { label: "Micron", value: `${woData.micron}μ`, icon: Ruler, valClass: "text-[#171717]" },
    { label: "Width", value: `${woData.width_m}m`, icon: Maximize2, valClass: "text-[#171717]" },
    { label: "Quantity", value: String(woData.quantity), icon: Package, valClass: "text-[#171717]" },
  ];

  const detailChips = [
    { label: "Stage", value: woData.stage },
    { label: "Date", value: new Date(woData.created_at).toLocaleDateString("en-GB") },
    { label: "Status", value: <StatusBadge status={woData.status} /> },
  ];

  // ── Modal render helpers ──────────────────────────────────────────────────
  const renderStepHeader = () => {
    const labels = ["Input Details", "Review Overview", "Submit Details"];
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
    if (activeTab === "Metallisation") {
      return (
        <div className="flex flex-col gap-4">
          {metallisationRowsInput.map((row, idx) => (
            <div key={`met-step1-${idx}`} className="rounded-[12px] border border-[#DDE1E8] p-4 bg-white">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[13px] font-semibold text-[#344054]">Item {idx + 1}</p>
                {metallisationRowsInput.length > 1 && (
                  <button type="button" onClick={() => removeCurrentRow(idx)} className="text-[12px] text-[#D92D20] hover:underline">Remove</button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-medium text-[#171717]">Coil No.</label>
                  <ScannerInput
                    value={row.coilNo}
                    onChange={(e) => updateMetallisationRow(idx, { coilNo: e.target.value })}
                    onScanData={(data) => updateMetallisationRow(idx, { coilNo: data })}
                    placeholder="Scan or enter coil no"
                    className="h-[42px] rounded-[8px] border border-[#DDE1E8] pl-[36px] px-3 text-[14px]"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-medium text-[#171717]">RM ID</label>
                  <ScannerInput
                    value={row.rmId}
                    onChange={(e) => {
                      const id = e.target.value;
                      const rm = rmLookup.get(id);
                      updateMetallisationRow(idx, { rmId: id, weight: rm?.weight ?? row.weight });
                    }}
                    onScanData={(data) => {
                      const rm = rmLookup.get(data);
                      updateMetallisationRow(idx, { rmId: data, weight: rm?.weight ?? row.weight });
                    }}
                    list={`rm-list-${idx}`}
                    placeholder="Scan RM ID..."
                    className="h-[42px] rounded-[8px] border border-[#DDE1E8] pl-3 text-[14px]"
                  />
                  <datalist id={`rm-list-${idx}`}>
                    {availableRollIds.map((rollId) => (
                      <option key={rollId} value={rollId}>{rollId}</option>
                    ))}
                  </datalist>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-medium text-[#171717]">Machine No.</label>
                  <input value={row.machineNo} onChange={(e) => updateMetallisationRow(idx, { machineNo: e.target.value })} placeholder="Machine number" className="h-[42px] rounded-[8px] border border-[#DDE1E8] px-3 text-[14px]" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-medium text-[#171717]">Weight (kgs)</label>
                  <input value={row.weight} onChange={(e) => updateMetallisationRow(idx, { weight: e.target.value })} placeholder="Enter weight" className="h-[42px] rounded-[8px] border border-[#DDE1E8] px-3 text-[14px]" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-medium text-[#171717]">Optical Density</label>
                  <input value={row.opticalDensity} onChange={(e) => updateMetallisationRow(idx, { opticalDensity: e.target.value })} placeholder="Enter optical density" className="h-[42px] rounded-[8px] border border-[#DDE1E8] px-3 text-[14px]" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-medium text-[#171717]">Resistance</label>
                  <input value={row.resistance} onChange={(e) => updateMetallisationRow(idx, { resistance: e.target.value })} placeholder="Enter resistance" className="h-[42px] rounded-[8px] border border-[#DDE1E8] px-3 text-[14px]" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-medium text-[#171717]">Next Stage</label>
                  <select value={row.nextStage} onChange={(e) => updateMetallisationRow(idx, { nextStage: e.target.value })} className="h-[42px] rounded-[8px] border border-[#DDE1E8] px-3 text-[14px]">
                    <option value="Slitting">Slitting</option>
                    <option value="Quality Check">Quality Check</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-4">
        {slittingRowsInput.map((row, idx) => (
          <div key={`slit-step1-${idx}`} className="rounded-[12px] border border-[#DDE1E8] p-4 bg-white">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[13px] font-semibold text-[#344054]">Item {idx + 1}</p>
              {slittingRowsInput.length > 1 && (
                <button type="button" onClick={() => removeCurrentRow(idx)} className="text-[12px] text-[#D92D20] hover:underline">Remove</button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-medium text-[#171717]">Product Material ID</label>
                <ScannerInput
                  value={row.productNo}
                  onChange={(e) => updateSlittingRow(idx, { productNo: e.target.value })}
                  onScanData={(data) => updateSlittingRow(idx, { productNo: data })}
                  placeholder="Scan or enter product no"
                  className="h-[42px] rounded-[8px] border border-[#DDE1E8] pl-[36px] px-3 text-[14px]"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-medium text-[#171717]">Coil ID (from Metallisation)</label>
                <ScannerInput
                  value={row.associatedRmId}
                  onChange={(e) => {
                    const id = e.target.value;
                    const coil = coilLookup.get(id);
                    updateSlittingRow(idx, { associatedRmId: id, weight: coil?.weight ?? row.weight });
                  }}
                  onScanData={(data) => {
                    const coil = coilLookup.get(data);
                    updateSlittingRow(idx, { associatedRmId: data, weight: coil?.weight ?? row.weight });
                  }}
                  list={`coil-list-${idx}`}
                  placeholder="Scan Coil ID..."
                  className="h-[42px] rounded-[8px] border border-[#DDE1E8] pl-3 text-[14px]"
                />
                <datalist id={`coil-list-${idx}`}>
                  {availableCoilIds.map((coilId) => (
                    <option key={coilId} value={coilId}>{coilId}</option>
                  ))}
                </datalist>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-medium text-[#171717]">Micron</label>
                <select value={row.micron} onChange={(e) => updateSlittingRow(idx, { micron: e.target.value })} className="h-[42px] rounded-[8px] border border-[#DDE1E8] px-3 text-[14px]">
                  {micronOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-medium text-[#171717]">Width</label>
                <input type="number" step="0.1" value={row.width} onChange={(e) => updateSlittingRow(idx, { width: e.target.value })} placeholder="Enter width" className="h-[42px] rounded-[8px] border border-[#DDE1E8] px-3 text-[14px]" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-medium text-[#171717]">Weight (kgs)</label>
                <input value={row.weight} onChange={(e) => updateSlittingRow(idx, { weight: e.target.value })} placeholder="Enter weight" className="h-[42px] rounded-[8px] border border-[#DDE1E8] px-3 text-[14px]" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-medium text-[#171717]">Grade</label>
                <select value={row.grade} onChange={(e) => updateSlittingRow(idx, { grade: e.target.value })} className="h-[42px] rounded-[8px] border border-[#DDE1E8] px-3 text-[14px]">
                  {gradeOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderReviewCards = () => {
    if (activeTab === "Metallisation") {
      return metallisationRowsInput.map((item, idx) => (
        <div key={`met-${idx}`} className="rounded-[12px] border border-[#78CFFA] bg-[#F4FBFF] p-4 grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-6 text-[14px] text-[#49526A]">
          <p>Coil No: {item.coilNo || "Auto"}</p>
          <p>RM ID: {item.rmId || "-"}</p>
          <p>Machine: {item.machineNo}</p>
          <p>Weight: {item.weight || "0"} kgs</p>
          <p>Optical Density: {item.opticalDensity}</p>
          <p>Resistance: {item.resistance}</p>
          <p>Next Stage: {item.nextStage}</p>
        </div>
      ));
    }

    return slittingRowsInput.map((item, idx) => (
      <div key={`slit-${idx}`} className="rounded-[12px] border border-[#78CFFA] bg-[#F4FBFF] p-4 grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-6 text-[14px] text-[#49526A]">
        <p>Product No: {item.productNo || "Auto"}</p>
        <p>Coil ID: {item.associatedRmId || "-"}</p>
        <p>Micron: {item.micron}</p>
        <p>Width: {item.width}</p>
        <p>Weight: {item.weight || "0"} kgs</p>
        <p>Grade: {item.grade}</p>
        <p className="md:col-span-2">Remarks / Observation: {slittingReviewRemarks || "Pending in this step"}</p>
      </div>
    ));
  };

  const renderModalBody = () => {
    if (modalStep === 1) {
      return (
        <div className="px-6 py-6 flex flex-col gap-5">
          {renderStepOneForm()}
          <button onClick={addCurrentItemToDraft} className="h-[42px] rounded-[8px] bg-[#00B6E2] text-white text-[15px] font-medium hover:bg-[#0092b5] transition-colors">
            Add Item
          </button>
          {showValidationHint && !isCurrentStepOneValid && (
            <p className="text-[12px] text-[#D92D20]">All input fields are mandatory before adding an item or moving to the next step.</p>
          )}
          <p className="text-[12px] text-[#667085]">Items queued for review: {getCurrentDraftCount()}</p>
        </div>
      );
    }

    if (modalStep === 2) {
      return (
        <div className="px-6 py-6 flex flex-col gap-5">
          <div className="rounded-[10px] border border-[#DDE1E8] bg-[#FAFCFF] p-4">
            <p className="text-[15px] font-semibold text-[#1F2937] mb-1">Overview</p>
            <p className="text-[13px] text-[#6B7280]">Review all values before submitting to the workflow queue.</p>
          </div>
          {renderReviewCards()}
          <div className="rounded-[12px] border border-[#DDE1E8] bg-white p-4 flex flex-col gap-2">
            <label className="text-[13px] font-medium text-[#171717]">Attach Image</label>
            <input type="file" accept="image/*" onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = (ev) => setModalImage(ev.target?.result as string);
                reader.readAsDataURL(file);
              }
            }} className="text-[14px]" />
            {modalImage && (
              <img src={modalImage} alt="Preview" className="mt-2 max-h-[200px] rounded-[8px] border border-[#DDE1E8]" />
            )}
          </div>
          {activeTab === "Slitting" && (
            <div className="rounded-[12px] border border-[#DDE1E8] bg-white p-4 flex flex-col gap-2">
              <label className="text-[13px] font-medium text-[#171717]">Remarks / Observation</label>
              <textarea
                value={slittingReviewRemarks}
                onChange={(e) => setSlittingReviewRemarks(e.target.value)}
                placeholder="Add remarks for winding readiness"
                className="min-h-[92px] rounded-[8px] border border-[#DDE1E8] px-3 py-2 text-[14px] resize-none"
              />
              {showValidationHint && !isStepTwoValid && (
                <p className="text-[12px] text-[#D92D20]">Remarks / Observation is mandatory for slitting in step 2.</p>
              )}
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="px-6 py-8">
        <div className="rounded-[16px] border border-[#D6EEF9] bg-[radial-gradient(circle_at_center,_#ECF8FD_0%,_#F8FCFF_45%,_#FFFFFF_100%)] p-8 md:p-10 flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[#E6F7FF] border border-[#9DDBF6] flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-[#00B6E2] flex items-center justify-center">
              <Check className="w-6 h-6 text-white" />
            </div>
          </div>
          <p className="text-[27px] leading-tight text-[#171717] font-semibold">Your details have been submitted successfully.</p>
          <p className="text-[15px] text-[#667085] max-w-[460px]">We are reviewing this entry and notifying the next stage once processing is complete.</p>
        </div>
      </div>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="font-dm-sans min-h-[calc(100vh-72px)] bg-white flex flex-col relative pb-12 overflow-x-hidden">
      <MobileHeader title={woData.work_order_no} />

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#171717]/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-[16px] w-full max-w-[860px] shadow-lg flex flex-col overflow-hidden">
            <div className="flex items-start justify-between px-6 py-5 border-b border-[#EBEBEB]">
              <div className="flex flex-col gap-1">
                <h2 className="text-[28px] leading-tight font-semibold text-[#171717]">Add {activeTab} Details</h2>
                <p className="text-[15px] text-[#5C5C5C]">Capture the stage details for work order {woData.work_order_no}</p>
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
                      if (!isCurrentStepOneValid) { setShowValidationHint(true); return; }
                      setShowValidationHint(false);
                      setModalStep(2);
                    }}
                    className={`h-[40px] px-5 text-[14px] font-medium rounded-[6px] transition-colors ${isCurrentStepOneValid ? "bg-[#00B6E2] text-white hover:bg-[#0092b5]" : "bg-[#A7DDEB] text-white cursor-not-allowed"}`}
                  >
                    Next
                  </button>
                </>
              )}
              {modalStep === 2 && (
                <>
                  <button onClick={() => setModalStep(1)} className="h-[40px] px-4 bg-white border border-[#EBEBEB] text-[#171717] text-[14px] font-medium rounded-[6px] hover:bg-gray-50 transition-colors">Back</button>
                  <button
                    onClick={submitCurrentStage}
                    disabled={submitting}
                    className={`h-[40px] px-5 text-[14px] font-medium rounded-[6px] transition-colors flex items-center gap-2 ${(isCurrentStepOneValid && isStepTwoValid) ? "bg-[#00B6E2] text-white hover:bg-[#0092b5]" : "bg-[#A7DDEB] text-white cursor-not-allowed"}`}
                  >
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    Submit Details
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

      {/* Desktop breadcrumb */}
      <div className="hidden md:flex items-center gap-2 px-4 md:px-6 pt-6 mb-2">
        <span className="text-[14px] font-medium text-[#5C5C5C] leading-tight">Work Orders</span>
        <ChevronRight className="w-4 h-4 text-[#A1A1AA]" />
        <span className="text-[14px] font-medium text-[#00B6E2] leading-tight">{woData.work_order_no}</span>
      </div>

      {/* Mobile KPI 2x2 */}
      <section className="grid grid-cols-2 gap-0 md:hidden mx-4 mt-[72px] bg-white border border-[#EBEBEB] rounded-[12px]">
        {detailKpiStats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className={`p-3 ${i % 2 === 0 ? "border-r border-b border-[#EBEBEB]" : "border-b border-[#EBEBEB]"} ${i >= 2 ? "border-b-0" : ""}`}>
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

      {/* Mobile chips */}
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

      {/* Tabs + Table */}
      <section className="w-full px-4 md:px-6 py-6 flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <TableToolbar
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            onExport={() => {
              const exportData = currentData.map((row: any) => ({
                ...(activeTab === "Raw Material"
                  ? { "Roll No": row.rollNo ?? "", "Net Weight": row.netWeight ?? "", "Gross Weight": row.grossWeight ?? "", "Micron": row.thickness ?? "", "Width (m)": row.width ?? "", "Temperature": row.temperature ?? "", "Supplier": row.supplier ?? "", "Stage": row.stage ?? "", "Status": row.status ?? "" }
                  : activeTab === "Metallisation"
                    ? { "Coil No": row.coilNo ?? "", "RM ID": row.rmId ?? "", "Machine No": row.machineNo ?? "", "Weight": row.weight ?? "", "Optical Density": row.opticalDensity ?? "", "Resistance": row.resistance ?? "", "Timestamp": row.timestamp ?? "", "Next Stage": row.nextStage ?? "", "Status": row.status ?? "" }
                    : { "Product No": row.productNo ?? "", "RM ID": row.rmId ?? "", "Weight": row.weight ?? "", "Thickness": row.thickness ?? "", "Grade": row.grade ?? "", "Timestamp": row.timestampAdded ?? "", "Stage": row.stage ?? "", "Status": row.status ?? "" }),
              }));
              exportToExcel(exportData, `workorder-detail-${activeTab.toLowerCase().replace(/\s+/g, "-")}`, activeTab);
            }}
          />
          {/* Add button — only for Metallisation & Slitting */}
          {(activeTab === "Metallisation" || activeTab === "Slitting") && (
            <button onClick={openModal} className="flex items-center gap-2 bg-[#00B6E2] text-white text-[14px] font-medium rounded-[6px] h-[40px] px-4 hover:bg-[#0092b5] transition-colors shrink-0 whitespace-nowrap">
              <Plus className="w-4 h-4" strokeWidth={2.5} />
              Add {activeTab}
            </button>
          )}
        </div>

        {/* Scrollable tab bar */}
        <div className="overflow-x-auto -mx-4 md:mx-0 px-4 md:px-0">
          <div className="flex items-center gap-2 border-b border-[#EBEBEB] pb-4 min-w-max">
            {(["Raw Material", "Metallisation", "Slitting"] as TabType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as TabType)}
                className={`px-4 py-2 text-[14px] font-medium rounded-[8px] transition-colors whitespace-nowrap ${activeTab === tab ? "bg-[#00B6E2] text-white" : "bg-white text-[#5C5C5C] hover:bg-[#F5F7FA]"
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
                      if (key === "qr" || key === "options") {
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
    </div>
  );
}
