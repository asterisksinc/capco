"use client";

import { WO_STATUS_OPTIONS, WO_STAGE_OPTIONS } from "@/lib/constants";
import { StatusBadge } from "@/components/StatusBadge";
import { use, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { Plus, X, ChevronRight, Check, QrCode } from "lucide-react";
import { FileText, Ruler, Maximize2, Package, Loader2 } from "lucide-react";
import { useStore } from "@/hooks/useStore";
import { ScannerInput } from "@/components/ScannerInput";
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
import { getAccessToken, supabaseConfig } from "@/src/services/supabaseClient";
import { useEffect } from "react";
import { inventoryService } from "@/src/services/inventoryService";

type DetailPageProps = {
  params: Promise<{ detailpage: string }>;
};

type TabType = "Raw Material" | "Metallisation";
type ModalStep = 1 | 2 | 3;

type CapturedImage = { url: string; name: string; id: string; file?: File };

type MetallisationForm = {
  coilNo: string;
  rmId: string;
  factoryWastageWeight: string;
  factoryWastageImage: CapturedImage | null;
  weightAfterMetallisation: string;
  photoOfWeight: CapturedImage | null;
  qcImage: CapturedImage | null;
};

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

const defaultMetallisationForm: MetallisationForm = {
  coilNo: "",
  rmId: "",
  factoryWastageWeight: "",
  factoryWastageImage: null,
  weightAfterMetallisation: "",
  photoOfWeight: null,
  qcImage: null,
};

function getDateTimeString() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = now.getFullYear();
  const hour = String(now.getHours()).padStart(2, "0");
  const minute = String(now.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hour}:${minute}`;
}

function generateId(prefix: string) {
  return `${prefix}-${Math.floor(Math.random() * 10000).toString().padStart(4, "0")}`;
}

function hasPositiveNumber(value: string) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0;
}

// EDIT: parses a weight string like "1000kgs" or "1000" into a plain number, defaulting to 0
function parseWeightValue(value?: string) {
  if (!value) return 0;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

// EDIT: Weight After Metallisation = RM Weight - Factory Wastage Weight, floored at 0
function computeWeightAfterMetallisation(rmWeightRaw: string | undefined, factoryWastageWeight: string) {
  const rmWeight = parseWeightValue(rmWeightRaw);
  const wastage = parseWeightValue(factoryWastageWeight);
  const result = rmWeight - 3 - wastage;
  return result > 0 ? String(result) : "0";
}

// EDIT: shared helper — finds the highest existing MC-#### number and returns the next one
function getNextCoilId(existingCoils: any[]) {
  let maxId = 0;
  for (const row of existingCoils) {
    const match = row.metallisation_no?.match(/MC-(\d+)/);
    if (match) maxId = Math.max(maxId, parseInt(match[1], 10));
  }
  return maxId + 1;
}

function createMetallisationRow(defaultRmId: string, coilNo: string): MetallisationForm {
  return {
    ...defaultMetallisationForm,
    coilNo,
    rmId: defaultRmId,
  };
}

async function uploadImage(workOrderNo: string, metallisationNo: string, file: File): Promise<string> {
  const token = getAccessToken();
  const bucket = "production-stage-images";
  const path = `metallisation/${metallisationNo}/${file.name}`;
  const res = await fetch(`${supabaseConfig.url}/storage/v1/object/${bucket}/${path}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token ?? supabaseConfig.anonKey}`,
      "apikey": supabaseConfig.anonKey,
      "Content-Type": file.type,
      "x-upsert": "true"
    },
    body: file
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || "Failed to upload image");
  }

  return `${supabaseConfig.url}/storage/v1/object/public/${bucket}/${path}`;
}

export default function OperatorMetallisationDetailPage({ params }: DetailPageProps) {
  const { detailpage } = use(params);
  const orderId = detailpage.toUpperCase();
  const nextCoilNumberRef = useRef<number>(1);

  const [loading, setLoading] = useState(true);
  const [woData, setWoData] = useState<any>(null);
  const [allWorkOrders, setAllWorkOrders] = useState<any[]>([]);

  const { isLocked } = useWorkOrderAccess(allWorkOrders);

  const [inProgressCoils, setInProgressCoils] = useState<any[]>([]);

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
      }),
      metallisationRows: (woData.metallisation || []).map((met: any) => ({
        coilNo: met.metallisation_no || met.id,
        rmId: met.inventory?.raw_material_code || met.inventory?.roll_no || "-",
        rmWeight: met.inventory?.net_weight_kg ? `${met.inventory.net_weight_kg}kgs` : (met.inventory?.gross_weight_kg ? `${met.inventory.gross_weight_kg}kgs` : "-"),
        factoryWastageWeight: met.factory_wastage_kg || "0",
        weight: met.weight_kg || "0",
        timestamp: new Date(met.created_at).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }),
        nextStage: "Slitting",
        status: met.status || "Completed",
      })),
    };
  }, [woData]);

  const workflowProgress = {
    stage: woData?.stage || "Raw Material",
    status: woData?.status || "Yet to Start",
  };

  const [activeTab, setActiveTab] = useState<TabType>("Raw Material");
  const [modalType, setModalType] = useState<"Wastage" | "Metallisation" | null>(null);
  const isModalOpen = modalType !== null;
  const [modalStep, setModalStep] = useState<ModalStep>(1);
  const [showValidationHint, setShowValidationHint] = useState(false);

  const availableRollIds: string[] = Array.from(new Set(workOrderFlowData?.rawMaterialRows
    .map((row: any) => row.rollNo) ?? [])) as string[];
  const rmLookup = useMemo(() => {
    const map = new Map<string, { weight: string; thickness: string; supplier: string, raw_material_id: string }>();
    for (const row of workOrderFlowData?.rawMaterialRows ?? []) {
      map.set(row.rollNo, { weight: row.netWeight ?? row.weight, thickness: row.thickness, supplier: row.supplier, raw_material_id: row.raw_material_id });
    }
    return map;
  }, [workOrderFlowData]);

  const [metallisationRowsInput, setMetallisationRowsInput] = useState<MetallisationForm[]>([createMetallisationRow("", "")]);
  const [qrData, setQrData] = useState<QRModalData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentConfig = useMemo(() => {
    switch (activeTab) {
      case "Raw Material": return rawMaterialConfig;
      case "Metallisation": return metallisationConfig;
      default: return rawMaterialConfig;
    }
  }, [activeTab]);

  const currentData = useMemo(() => {
    if (!workOrderFlowData) return [];
    switch (activeTab) {
      case "Raw Material": return workOrderFlowData.rawMaterialRows;
      case "Metallisation": return workOrderFlowData.metallisationRows;
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
          <Link href="/person-a-metallisation/workorder" className="h-[40px] px-6 bg-[#00B6E2] text-white font-medium rounded-[8px] flex items-center justify-center hover:bg-[#0095B8] transition-colors">
            Back to Work Orders
          </Link>
        </div>
      </div>
    );
  }

  if (!workOrderFlowData) return <div className="p-6 text-center text-[#5C5C5C]">Work Order not found</div>;

  const resetModalState = async (type: "Wastage" | "Metallisation") => {
    setModalStep(1);
    setShowValidationHint(false);
    setModalType(type);

    const existingCoils = await productionStageService.listMetallisation();

    if (type === "Wastage") {
      const nextNum = getNextCoilId(existingCoils as any[]);
      nextCoilNumberRef.current = nextNum;

      const defaultRmId = availableRollIds[0] ?? "";
      const coilNo = `MC-${String(nextNum).padStart(4, "0")}`;
      nextCoilNumberRef.current += 1;

      const defaultRow = createMetallisationRow(defaultRmId, coilNo);
      setMetallisationRowsInput([defaultRow]);
    } else {
      // Metallisation
      const wipCoils = (existingCoils as any[]).filter(c => c.work_order_id === woData.id && c.status === "In-progress");
      setInProgressCoils(wipCoils);

      const defaultRow = createMetallisationRow("", "");
      // Default to empty so they have to pick a coil
      setMetallisationRowsInput([defaultRow]);
    }
  };

  const openWastageModal = async () => {
    await resetModalState("Wastage");
  };

  const openMetallisationModal = async () => {
    await resetModalState("Metallisation");
  };

  const closeModal = () => {
    if (isSubmitting) return;
    setModalType(null);
  };

  const isMetallisationRowValid = (row: MetallisationForm) => {
    if (modalType === "Wastage") {
      return Boolean(
        row.coilNo.trim() &&
        row.rmId.trim() &&
        hasPositiveNumber(row.factoryWastageWeight) &&
        row.factoryWastageImage
      );
    } else {
      return Boolean(
        row.coilNo.trim() &&
        row.rmId.trim() &&
        hasPositiveNumber(row.weightAfterMetallisation) &&
        row.photoOfWeight
      );
    }
  };

  const isCurrentStepOneValid = metallisationRowsInput.every(isMetallisationRowValid);
  const isCurrentStepTwoValid = modalType === "Wastage" ? true : metallisationRowsInput.every(row => row.qcImage);

  const addCurrentItemToDraft = () => {
    if (!isCurrentStepOneValid) {
      setShowValidationHint(true);
      return;
    }
    if (modalType === "Wastage") {
      const defaultRmId = availableRollIds[0] ?? "";
      const coilNo = `MC-${String(nextCoilNumberRef.current).padStart(4, "0")}`;
      nextCoilNumberRef.current += 1;

      const newRow = createMetallisationRow(defaultRmId, coilNo);
      setMetallisationRowsInput((prev) => [...prev, newRow]);
    } else {
      const newRow = createMetallisationRow("", "");
      setMetallisationRowsInput((prev) => [...prev, newRow]);
    }
  };

  const updateMetallisationRow = (index: number, patch: Partial<MetallisationForm>) => {
    setMetallisationRowsInput((prev) => prev.map((row, idx) => (idx === index ? { ...row, ...patch } : row)));
  };

  const removeCurrentRow = (index: number) => {
    if (metallisationRowsInput.length === 1) return;
    setMetallisationRowsInput((prev) => prev.filter((_, idx) => idx !== index));
  };

  const submitCurrentStage = async () => {
    if (modalType === "Metallisation" && !isCurrentStepTwoValid) {
      alert("Please upload the required QC images for all items.");
      return;
    }

    setIsSubmitting(true);
    try {
      const user = await authService.getCurrentProfile();

      if (modalType === "Wastage") {
        const existingData = await productionStageService.listMetallisation();
        let maxMcId = 0;
        for (const row of existingData as any[]) {
          const match = row.metallisation_no?.match(/MC-(\d+)/);
          if (match) maxMcId = Math.max(maxMcId, parseInt(match[1], 10));
        }

        for (const item of metallisationRowsInput) {
          const rmData = rmLookup.get(item.rmId);
          const factoryWastage = parseFloat(item.factoryWastageWeight) || 0;

          const factoryWastageUrl = await uploadImage(woData.work_order_no, item.coilNo, item.factoryWastageImage!.file!);

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
                raw_material_id: rmData?.raw_material_id || "",
                weight_kg: 0,
                factory_wastage_kg: factoryWastage,
                factory_wastage_image_url: factoryWastageUrl,
                photo_url: null as unknown as string, // Required by type, but we aren't saving it yet
                qc_details: {
                  qc: "pending",
                  remarks: "",
                  images: {}
                },
                operator_id: user?.id,
                coil_no: finalId,
                status: "In-progress"
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

          if (rmData?.raw_material_id) {
            const inventoryRecord = await inventoryService.getById(rmData.raw_material_id);
            const prevWastage = Number((inventoryRecord as any)?.wastage_weight_kg || 0);
            await inventoryService.update(rmData.raw_material_id, {
              wastage_weight_kg: prevWastage + factoryWastage,
            } as any);
          }
        }
      } else {
        // Metallisation update flow
        for (const item of metallisationRowsInput) {
          // Upload images
          const [photoUrl, qcUrl] = await Promise.all([
            uploadImage(woData.work_order_no, item.coilNo, item.photoOfWeight!.file!),
            uploadImage(woData.work_order_no, item.coilNo, item.qcImage!.file!)
          ]);

          const coilToUpdate = inProgressCoils.find(c => c.metallisation_no === item.coilNo || c.id === item.coilNo);
          if (!coilToUpdate) throw new Error(`Could not find in-progress coil ${item.coilNo}`);

          await productionStageService.updateMetallisation(coilToUpdate.id, {
            weight_kg: parseFloat(item.weightAfterMetallisation) || 0,
            photo_url: photoUrl,
            qc_details: {
              qc: "pass",
              remarks: "",
              images: {
                weight_after_metallisation: photoUrl,
                qc: qcUrl
              }
            },
            status: "Completed"
          });
        }
      }

      await workOrderService.update(woData.id, {
        stage: "Slitting",
        status: "In-progress"
      });

      if (modalType === "Wastage") {
        setModalType(null); // close directly
      } else {
        setModalStep(3);
      }
      fetchWorkOrder();
    } catch (err: any) {
      console.error(err);
      alert(`Failed to save data: ${err.message}`);
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
    return (
      <div className="flex flex-col gap-4">
        {metallisationRowsInput.map((row, idx) => (
          <div key={`met-step1-${idx}`} className="rounded-[12px] border border-[#DDE1E8] p-4 bg-white">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[13px] font-semibold text-[#344054]">Item {idx + 1}</p>
              {/* EDIT: shows the selected Raw Material's weight at the top right of the item card */}
              <div className="flex items-center gap-3">
                {row.rmId && rmLookup.get(row.rmId) && (
                  <>
                    <span className="text-[12px] font-medium text-[#00B6E2] bg-[#F0FDFF] border border-[#B7EFFB] rounded-full px-3 py-1 whitespace-nowrap">
                      RM Weight: {rmLookup.get(row.rmId)?.weight}
                    </span>
                    {modalType === "Metallisation" && (
                      <span className="text-[12px] font-medium text-[#00B6E2] bg-[#F0FDFF] border border-[#B7EFFB] rounded-full px-3 py-1 whitespace-nowrap">
                        Factory Wastage: {row.factoryWastageWeight}kg
                      </span>
                    )}
                    <span className="text-[12px] font-medium text-[#00B6E2] bg-[#F0FDFF] border border-[#B7EFFB] rounded-full px-3 py-1 whitespace-nowrap">
                      Deduction: 3 kg
                    </span>
                  </>
                )}
                {metallisationRowsInput.length > 1 && (
                  <button type="button" onClick={() => removeCurrentRow(idx)} className="text-[12px] text-[#D92D20] hover:underline">Remove</button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-medium text-[#171717]">Coil No.</label>
                {modalType === "Wastage" ? (
                  <input value={row.coilNo} readOnly className="h-[42px] rounded-[8px] border border-[#DDE1E8] bg-gray-50 px-3 text-[14px] text-gray-500 cursor-not-allowed" />
                ) : (
                  <select
                    value={row.coilNo}
                    onChange={(e) => {
                      const selectedCoilId = e.target.value;
                      const matchedCoil = inProgressCoils.find(c => c.metallisation_no === selectedCoilId || c.id === selectedCoilId);
                      if (matchedCoil) {
                        const rawMaterialId = matchedCoil.inventory?.raw_material_code || matchedCoil.inventory?.roll_no || matchedCoil.raw_material_id || "";
                        updateMetallisationRow(idx, {
                          coilNo: selectedCoilId,
                          rmId: rawMaterialId,
                          factoryWastageWeight: String(matchedCoil.factory_wastage_kg || 0)
                        });
                      } else {
                        updateMetallisationRow(idx, { coilNo: selectedCoilId, rmId: "", factoryWastageWeight: "0" });
                      }
                    }}
                    className="h-[42px] rounded-[8px] border border-[#DDE1E8] px-3 text-[14px] focus:outline-none focus:border-[#00B6E2] bg-white"
                  >
                    <option value="" disabled>Select Coil...</option>
                    {inProgressCoils.map(c => (
                      <option key={c.id} value={c.metallisation_no || c.id}>{c.metallisation_no || c.id}</option>
                    ))}
                  </select>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-medium text-[#171717]">RM ID</label>
                {modalType === "Wastage" ? (
                  <ScannerInput
                    isSelect
                    value={row.rmId}
                    onChange={(e) => {
                      // EDIT: switching RM ID changes the RM weight, so recompute the derived field too
                      const newRmId = e.target.value;
                      const recalculated = computeWeightAfterMetallisation(rmLookup.get(newRmId)?.weight, row.factoryWastageWeight);
                      updateMetallisationRow(idx, { rmId: newRmId, weightAfterMetallisation: recalculated });
                    }}
                    onScanData={(data) => {
                      const cleanData = data.trim();
                      if (availableRollIds.includes(cleanData)) {
                        // EDIT: same recalculation when RM ID is set via barcode scan
                        const recalculated = computeWeightAfterMetallisation(rmLookup.get(cleanData)?.weight, row.factoryWastageWeight);
                        updateMetallisationRow(idx, { rmId: cleanData, weightAfterMetallisation: recalculated });
                      } else {
                        alert(`Scanned barcode (${cleanData}) is not available in RM pool.`);
                      }
                    }}
                    className="h-[42px] rounded-[8px] border border-[#DDE1E8] pl-3 text-[14px]"
                  >
                    <option value="" disabled>Select RM ID...</option>
                    {availableRollIds.map((rollId: string) => (
                      <option key={rollId} value={rollId}>{rollId}</option>
                    ))}
                  </ScannerInput>
                ) : (
                  <input value={row.rmId} readOnly className="h-[42px] rounded-[8px] border border-[#DDE1E8] bg-gray-50 px-3 text-[14px] text-gray-500 cursor-not-allowed" />
                )}
              </div>

              {modalType === "Wastage" && (
                <>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[13px] font-medium text-[#171717]">Factory Wastage: Weight (Kgs)</label>
                      {(() => {
                        const rmWeight = parseWeightValue(rmLookup.get(row.rmId)?.weight);
                        const wastage = parseWeightValue(row.factoryWastageWeight);
                        if (rmWeight > 0 && wastage > rmWeight - 3) {
                          return <p className="text-[12px] font-medium text-[#D92D20]">Exceeds available weight</p>;
                        }
                        return null;
                      })()}
                    </div>
                    <input
                      type="number"
                      value={row.factoryWastageWeight}
                      onChange={(e) => {
                        // EDIT: typing a wastage weight recalculates Weight After Metallisation live
                        const newWastage = e.target.value;
                        const recalculated = computeWeightAfterMetallisation(rmLookup.get(row.rmId)?.weight, newWastage);
                        updateMetallisationRow(idx, { factoryWastageWeight: newWastage, weightAfterMetallisation: recalculated });
                      }}
                      placeholder="Enter weight in kg"
                      className="h-[42px] rounded-[8px] border border-[#DDE1E8] px-3 text-[14px]"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[13px] font-medium text-[#171717]">Upload Factory Wastage Image</label>
                    <div className="flex items-center gap-3">
                      <input type="file" accept="image/*" capture="environment" id={`factoryImg-${idx}`} className="hidden" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const url = URL.createObjectURL(file);
                          updateMetallisationRow(idx, { factoryWastageImage: { url, name: file.name, id: Math.random().toString(36).substring(2, 8).toUpperCase(), file } });
                        }
                      }} />
                      <label htmlFor={`factoryImg-${idx}`} className="flex items-center justify-center bg-[#F5F7FA] border border-[#DDE1E8] text-[#5C5C5C] text-[13px] font-medium rounded-[6px] h-[36px] px-4 cursor-pointer hover:bg-[#EBEBEB]">{row.factoryWastageImage ? "Change Image" : "Take Photo"}</label>
                      {row.factoryWastageImage && <img src={row.factoryWastageImage.url} alt="Wastage" className="w-10 h-10 rounded-md object-cover border border-[#EBEBEB]" />}
                    </div>
                  </div>
                </>
              )}

              {modalType === "Metallisation" && (
                <>
                  <div className="flex flex-col gap-2">
                    <label className="text-[13px] font-medium text-[#171717]">Weight after Metallisation (Kgs)</label>
                    <input
                      type="number"
                      value={row.weightAfterMetallisation}
                      onChange={(e) => updateMetallisationRow(idx, { weightAfterMetallisation: e.target.value })}
                      placeholder="Enter weight in kg"
                      className="h-[42px] rounded-[8px] border border-[#DDE1E8] px-3 text-[14px] focus:outline-none focus:border-[#00B6E2] focus:ring-1 focus:ring-[#00B6E2]"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[13px] font-medium text-[#171717]">Upload Photo of Weight</label>
                    <div className="flex items-center gap-3">
                      <input type="file" accept="image/*" capture="environment" id={`weightImg-${idx}`} className="hidden" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const url = URL.createObjectURL(file);
                          updateMetallisationRow(idx, { photoOfWeight: { url, name: file.name, id: Math.random().toString(36).substring(2, 8).toUpperCase(), file } });
                        }
                      }} />
                      <label htmlFor={`weightImg-${idx}`} className="flex items-center justify-center bg-[#F5F7FA] border border-[#DDE1E8] text-[#5C5C5C] text-[13px] font-medium rounded-[6px] h-[36px] px-4 cursor-pointer hover:bg-[#EBEBEB]">{row.photoOfWeight ? "Change Image" : "Take Photo"}</label>
                      {row.photoOfWeight && <img src={row.photoOfWeight.url} alt="Weight" className="w-10 h-10 rounded-md object-cover border border-[#EBEBEB]" />}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderReviewCards = () => {
    const rows = metallisationRowsInput;
    return rows.map((item, idx) => (
      <div key={`met-${idx}`} className="rounded-[12px] border border-[#78CFFA] bg-[#F4FBFF] p-4 flex flex-col gap-4 text-[14px] text-[#49526A]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-6">
          <p>Coil No: {item.coilNo || "Auto"}</p>
          <p>RM ID: {item.rmId || "-"}</p>
          {modalType === "Wastage" ? (
            <p>Factory Wastage: {item.factoryWastageWeight || "0"} kgs</p>
          ) : (
            <>
              <p>Factory Wastage: {item.factoryWastageWeight || "0"} kgs</p>
              <p>Weight After Metallisation: {item.weightAfterMetallisation || "0"} kgs</p>
            </>
          )}
        </div>
        <div className="flex flex-col gap-2 border-t border-[#D6EEF9] pt-3">
          <p className="font-semibold text-[13px] text-[#171717]">Images</p>
          <div className="flex gap-4">
            {item.factoryWastageImage && (
              <div className="flex items-center gap-2">
                <img src={item.factoryWastageImage.url} alt="Wastage" className="w-12 h-12 rounded border border-[#EBEBEB] object-cover" />
                <div className="flex flex-col">
                  <span className="text-[12px] font-medium text-[#171717]">Factory Wastage</span>
                  <span className="text-[11px] text-[#6B7280]">ID: {item.factoryWastageImage.id}</span>
                </div>
              </div>
            )}
            {item.photoOfWeight && (
              <div className="flex items-center gap-2">
                <img src={item.photoOfWeight.url} alt="Weight" className="w-12 h-12 rounded border border-[#EBEBEB] object-cover" />
                <div className="flex flex-col">
                  <span className="text-[12px] font-medium text-[#171717]">Weight Photo</span>
                  <span className="text-[11px] text-[#6B7280]">ID: {item.photoOfWeight.id}</span>
                </div>
              </div>
            )}
          </div>
        </div>
        {modalType === "Metallisation" && (
          <div className="flex flex-col gap-2 border-t border-[#D6EEF9] pt-3">
            <p className="font-semibold text-[13px] text-[#171717]">QC Image</p>
            <div className="flex items-center gap-3">
              <input type="file" accept="image/*" capture="environment" id={`qcImg-${idx}`} className="hidden" onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const url = URL.createObjectURL(file);
                  updateMetallisationRow(idx, { qcImage: { url, name: file.name, id: Math.random().toString(36).substring(2, 8).toUpperCase(), file } });
                }
              }} />
              <label htmlFor={`qcImg-${idx}`} className="flex items-center justify-center bg-white border border-[#DDE1E8] text-[#5C5C5C] text-[13px] font-medium rounded-[6px] h-[36px] px-4 cursor-pointer hover:bg-[#EBEBEB]">{item.qcImage ? "Change QC Image" : "Take QC Photo"}</label>
              {item.qcImage && <img src={item.qcImage.url} alt="QC" className="w-10 h-10 rounded-md object-cover border border-[#EBEBEB]" />}
            </div>
          </div>
        )}
      </div>
    ));
  };

  return (
    <div className="font-dm-sans min-h-[calc(100vh-72px)] bg-white flex flex-col relative overflow-x-hidden">
      <MobileHeader title="Work Orders details" />

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#171717]/40 backdrop-blur-sm md:px-4">
          <div className="bg-white rounded-[16px] w-full max-w-[95%] sm:max-w-[80%] shadow-lg flex flex-col overflow-hidden">
            {modalType === "Metallisation" && renderStepHeader()}

            <div className="max-h-[58vh] overflow-y-auto px-6 py-5">
              {modalStep === 1 && renderStepOneForm()}
              {modalStep === 2 && (
                <div className="flex flex-col gap-4">
                  <div className="rounded-[10px] border border-[#DDE1E8] bg-[#FAFCFF] p-4">
                    <p className="text-[15px] font-semibold text-[#1F2937] mb-1">Review Overview</p>
                    <p className="text-[13px] text-[#6B7280]">Review details before saving to logs.</p>
                  </div>
                  {renderReviewCards()}
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
                    {modalType === "Wastage" ? (
                      <button onClick={submitCurrentStage} disabled={isSubmitting || !isCurrentStepOneValid} className={`h-[40px] px-2 md:px-5 text-white text-[10px] md:text-[14px] font-medium rounded-[6px] flex items-center justify-center gap-2 ${isCurrentStepOneValid && !isSubmitting ? "bg-[#00B6E2] hover:bg-[#0092b5]" : "bg-[#A7DDEB] cursor-not-allowed"}`}>
                        {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                        {isSubmitting ? "Submitting..." : "Submit Logs"}
                      </button>
                    ) : (
                      <button onClick={() => { if (!isCurrentStepOneValid) { setShowValidationHint(true); return; } setModalStep(2); }} className={`h-[40px] px-2 md:px-5 text-[10px] md:text-[14px] font-medium rounded-[6px] ${isCurrentStepOneValid ? "bg-[#00B6E2] text-white hover:bg-[#0092b5]" : "bg-[#A7DDEB] text-white cursor-not-allowed"}`}>Next</button>
                    )}
                  </div>
                </>
              )}
              {modalType === "Metallisation" && modalStep === 2 && (
                <>
                  <button onClick={() => setModalStep(1)} disabled={isSubmitting} className="h-[40px] px-2 md:px-4 bg-white border border-[#EBEBEB] text-[#171717] text-[10px] md:text-[14px] font-medium rounded-[6px] hover:bg-gray-50">Back</button>
                  <button onClick={submitCurrentStage} disabled={isSubmitting || !isCurrentStepTwoValid} className={`h-[40px] px-2 md:px-5 text-white text-[10px] md:text-[14px] font-medium rounded-[6px] flex items-center justify-center gap-2 ${isCurrentStepTwoValid && !isSubmitting ? "bg-[#00B6E2] hover:bg-[#0092b5]" : "bg-[#A7DDEB] cursor-not-allowed"}`}>
                    {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    {isSubmitting ? "Submitting..." : "Submit Logs"}
                  </button>
                </>
              )}
              {modalType === "Metallisation" && modalStep === 3 && (
                <button onClick={closeModal} className="h-[40px] px-2 md:px-5 bg-[#00B6E2] text-white text-[10px] md:text-[14px] font-medium rounded-[6px] hover:bg-[#0092b5]">Done</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Desktop breadcrumb */}
      <section className="bg-white border-b border-[#EBEBEB] hidden md:block">
        <div className="px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[14px]">
            <Link href="/person-a-metallisation/workorder" className="text-[#5C5C5C] hover:text-black">Work Orders</Link>
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

          {activeTab !== "Raw Material" && (
            <>
              <button
                onClick={openWastageModal}
                className="flex items-center justify-center gap-2 bg-[#00B6E2] text-white text-[14px] font-medium rounded-[6px] h-[40px] px-[18px] hover:bg-[#0092b5] transition-colors shrink-0 w-full sm:w-auto"
              >
                <Plus className="w-4 h-4 shrink-0" strokeWidth={2.5} />
                <span className="leading-tight truncate">
                  Add Factory Wastage
                </span>
              </button>
              <button
                onClick={openMetallisationModal}
                className="flex items-center justify-center gap-2 bg-[#00B6E2] text-white text-[14px] font-medium rounded-[6px] h-[40px] px-[18px] hover:bg-[#0092b5] transition-colors shrink-0 w-full sm:w-auto"
              >
                <Plus className="w-4 h-4 shrink-0" strokeWidth={2.5} />
                <span className="leading-tight truncate">
                  Add Metallisation
                </span>
              </button>
            </>
          )}
        </div>

        {/* Scrollable tab bar on mobile */}
        <div className="overflow-x-auto -mx-4 md:mx-0 px-4 md:px-0">
          <div className="flex items-center gap-2 border-b border-[#EBEBEB] pb-4 min-w-max">
            {["Raw Material", "Metallisation"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as TabType)}
                className={`px-4 py-2 text-[14px] font-medium rounded-[8px] transition-colors whitespace-nowrap ${activeTab === tab
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
                          ? { rollNo: (row as any).rollNo ?? "", netWeight: (row as any).netWeight.split('k')[0] ?? (row as any).weight.split('k')[0] ?? "", grossWeight: (row as any).grossWeight.split('k')[0] ?? "-", micron: (row as any).thickness ?? "", width: (row as any).width ?? "", temperature: (row as any).temperature ?? "-", supplier: (row as any).supplier ?? "", status: (row as any).status ?? "" }
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
                          ? { rollNo: (row as any).rollNo ?? "", netWeight: (row as any).netWeight ?? (row as any).weight ?? "", grossWeight: (row as any).grossWeight ?? "-", micron: (row as any).thickness ?? "", width: (row as any).width ?? "", temperature: (row as any).temperature ?? "-", supplier: (row as any).supplier ?? "", status: (row as any).status ?? "" }
                          : { coilNo: (row as any).coilNo ?? "", rmId: (row as any).rmId ?? "", factoryWastageWeight: (row as any).factoryWastageWeight ?? "", weight: (row as any).weight ?? "", status: (row as any).status ?? "" };
                        return (
                          <td key={String(col.key)} className="px-4 py-3 whitespace-nowrap">
                            {activeTab !== "Raw Material" ? (
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