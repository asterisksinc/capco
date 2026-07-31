"use client";

import { WO_STATUS_OPTIONS, WO_STAGE_OPTIONS } from "@/lib/constants";
import { StatusBadge } from "@/components/StatusBadge";
import { use, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { Plus, X, ChevronRight, Check, QrCode, Loader2, Printer } from "lucide-react";
import { FileText, Ruler, Maximize2, Package } from "lucide-react";
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
import { useWorkOrderAccess } from "@/hooks/useWorkOrderAccess";
import { workOrderService } from "@/src/services/workOrderService";
import { productionStageService } from "@/src/services/productionStageService";
import { authService } from "@/src/services/authService";
import { stockService } from "@/src/services/stockService";
import { slittingService } from "@/src/services/slittingService";
import { supabaseStorage, getAccessToken, supabaseConfig } from "@/src/services/supabaseClient";
import { useEffect } from "react";

type DetailPageProps = {
  params: Promise<{ detailpage: string }>;
};

type TabType = "RM" | "M" | "S";
type ModalStep = 1 | 2 | 3;

async function uploadSlittingImage(entityId: string, file: File): Promise<string> {
  const token = getAccessToken();
  const bucket = "production-stage-images";
  const path = `slitting/${entityId}/${file.name}`;
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

// EDIT: shared helper — finds the highest existing PM-#### number and returns the next one
function getNextProductId(existingSlitting: any[]) {
  let maxId = 0;
  for (const row of existingSlitting) {
    const match = row.product_no?.match(/PM-(\d+)/);
    if (match) maxId = Math.max(maxId, parseInt(match[1], 10));
  }
  return maxId + 1;
}

type MetallisationForm = {
  coilNo: string;
  rmId: string;
  machineNo: string;
  weight: string;
  opticalDensity: string;
  resistance: string;
  nextStage: string;
};

type BagData = {
  id: string;
  productNo: string;
  grade: string;
  weight: string;
};

type SlittingForm = {
  coilId: string;
  noOfBags: number;
  bags: BagData[];
  qcImage: { url: string; name: string; id: string; file: File } | null;
  remarks: string;
  idempotencyKey: string;
  reason?: string;
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
    { key: "coilId", label: "Coil ID", type: "text", sortable: true },
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
  coilId: "",
  noOfBags: 1,
  bags: [{ id: "temp", productNo: "", grade: "AA", weight: "" }],
  qcImage: null,
  remarks: "",
  idempotencyKey: "",
};

function getDateString() {
  const today = new Date();
  return `${String(today.getDate()).padStart(2, "0")}/${String(today.getMonth() + 1).padStart(2, "0")}/${today.getFullYear()}`;
}

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

function createMetallisationRow(defaultRmId: string): MetallisationForm {
  return {
    ...defaultMetallisationForm,
    coilNo: generateId("MC"),
    rmId: defaultRmId,
  };
}

function createSlittingRow(defaultCoilId: string, productNo: string = ""): SlittingForm {
  return {
    ...defaultSlittingForm,
    coilId: defaultCoilId,
    bags: [{ id: generateId("BAG"), productNo, grade: "AA", weight: "" }],
    idempotencyKey: generateId("IDEMP"),
  };
}

export default function OperatorSlittingDetailPage({ params }: DetailPageProps) {
  const { detailpage } = use(params);
  const orderId = detailpage.toUpperCase();

  // Track the base PM number from DB to generate sequential UI IDs
  const basePmIdRef = useRef<number>(0);

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
        console.log(data);
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
        coilNo: met.coil_no || met.id,
        metallisation_id: met.id,
        rmId: met.inventory?.raw_material_code || met.inventory?.roll_no || "-",
        rmWeight: met.inventory?.net_weight_kg ? `${met.inventory.net_weight_kg}kgs` : (met.inventory?.gross_weight_kg ? `${met.inventory.gross_weight_kg}kgs` : "-"),
        factoryWastageWeight: met.factory_wastage_kg || "0",
        weight: met.weight_kg || "0",
        timestamp: new Date(met.created_at).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }),
        nextStage: "Slitting",
        status: met.status || "Completed",
      })),
      slittingRows: (woData.slitting || []).map((slit: any) => ({
        productNo: slit.product_no || slit.slitting_no || slit.id,
        coilId: slit.metallisation?.coil_no || "-",
        weight: slit.weight_kg || "0",
        thickness: slit.thickness_micron || "-",
        grade: slit.grade || "-",
        timestampAdded: new Date(slit.created_at).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }),
        stage: "Ready for Winding",
        status: slit.status || "Completed",
      })),
    };
  }, [woData]);

  const workflowProgress = {
    stage: woData?.stage || "Raw Material",
    status: woData?.status || "Yet to Start",
  };

  const [activeTab, setActiveTab] = useState<TabType>("RM");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState<ModalStep>(1);
  const [showValidationHint, setShowValidationHint] = useState(false);
  const [slittingReviewRemarks, setSlittingReviewRemarks] = useState("");

  const availableRollIds: string[] = Array.from(new Set(workOrderFlowData?.rawMaterialRows
    .map((row: any) => row.rollNo) ?? [])) as string[];
  const rmLookup = useMemo(() => {
    const map = new Map<string, { weight: string; thickness: string; supplier: string, raw_material_id: string }>();
    for (const row of workOrderFlowData?.rawMaterialRows ?? []) {
      map.set(row.rollNo, { weight: row.weight, thickness: row.thickness, supplier: row.supplier, raw_material_id: row.raw_material_id });
    }
    return map;
  }, [workOrderFlowData]);

  const availableCoilIds: string[] = Array.from(new Set(workOrderFlowData?.metallisationRows
    .filter((row: any) => row.status === "Issued")
    .map((row: any) => row.coilNo) ?? [])) as string[];
  const coilLookup = useMemo(() => {
    const map = new Map<string, { weight: string; opticalDensity: string; resistance: string, metallisation_id: string }>();
    for (const row of workOrderFlowData?.metallisationRows ?? []) {
      map.set(row.coilNo, { weight: row.weight, opticalDensity: row.opticalDensity, resistance: row.resistance, metallisation_id: row.metallisation_id });
    }
    console.log(workOrderFlowData);
    return map;
  }, [workOrderFlowData]);

  const [metallisationRowsInput, setMetallisationRowsInput] = useState<MetallisationForm[]>([createMetallisationRow("")]);
  const [slittingRowsInput, setSlittingRowsInput] = useState<SlittingForm[]>([createSlittingRow(availableCoilIds[0] ?? "")]);
  type CapturedImage = { url: string; name: string; id: string; file: File };
  const [capturedImage, setCapturedImage] = useState<CapturedImage | null>(null);
  const [qrData, setQrData] = useState<QRModalData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentConfig = useMemo(() => {
    switch (activeTab) {
      case "RM": return rawMaterialConfig;
      case "M": return metallisationConfig;
      case "S": return slittingConfig;
      default: return rawMaterialConfig;
    }
  }, [activeTab]);

  const currentData = useMemo(() => {
    if (!workOrderFlowData) return [];
    switch (activeTab) {
      case "RM": return workOrderFlowData.rawMaterialRows;
      case "M": return workOrderFlowData.metallisationRows;
      case "S": return workOrderFlowData.slittingRows;
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
          <Link href="/person-a-slitting/workorder" className="h-[40px] px-6 bg-[#00B6E2] text-white font-medium rounded-[8px] flex items-center justify-center hover:bg-[#0095B8] transition-colors">
            Back to Work Orders
          </Link>
        </div>
      </div>
    );
  }

  if (!workOrderFlowData) return <div className="p-6 text-center text-[#5C5C5C]">Work Order not found</div>;

  const recalculateProductNos = (rows: SlittingForm[], basePmId: number) => {
    let currentId = basePmId + 1;
    return rows.map(row => ({
      ...row,
      bags: row.bags.map(bag => ({
        ...bag,
        productNo: `PM-${String(currentId++).padStart(4, "0")}`
      }))
    }));
  };

  const resetModalState = async () => {
    setModalStep(1);
    setShowValidationHint(false);
    setSlittingReviewRemarks("");
    setCapturedImage(null);
    setMetallisationRowsInput([createMetallisationRow(availableRollIds[0] ?? "")]);

    // get max existing PM number to calculate sequentially for UI
    const existingSlitting = await productionStageService.listSlitting();
    const nextNum = getNextProductId(existingSlitting as any[]) - 1; // base is max ID
    basePmIdRef.current = nextNum;

    setSlittingRowsInput(recalculateProductNos([createSlittingRow(availableCoilIds[0] ?? "")], nextNum));
  };

  const openModal = async () => {
    await resetModalState();
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    resetModalState();
  };

  const isMetallisationRowValid = (row: MetallisationForm) => {
    return Boolean(
      row.coilNo.trim() &&
      row.rmId.trim() &&
      row.machineNo.trim() &&
      hasPositiveNumber(row.weight) &&
      row.opticalDensity.trim() &&
      row.resistance.trim() &&
      row.nextStage.trim(),
    );
  };

  const isSlittingRowValid = (row: SlittingForm) => {
    if (!row.coilId.trim() || !hasPositiveNumber(String(row.noOfBags))) return false;
    let totalBagWeight = 0;
    for (const bag of row.bags) {
      if (!bag.productNo.trim() || !bag.grade.trim() || !hasPositiveNumber(bag.weight)) return false;
      totalBagWeight += parseFloat(bag.weight) || 0;
    }
    const coilData = coilLookup.get(row.coilId);
    if (coilData && totalBagWeight > (parseFloat(String(coilData.weight)) || 0)) return false;
    return true;
  };

  const isCurrentStepOneValid =
    activeTab === "M"
      ? metallisationRowsInput.every(isMetallisationRowValid)
      : slittingRowsInput.every(isSlittingRowValid);

  const isStepTwoValid = activeTab === "S" ? Boolean(slittingReviewRemarks.trim()) : true;

  const addCurrentItemToDraft = () => {
    if (!isCurrentStepOneValid) {
      setShowValidationHint(true);
      return;
    }
    if (activeTab === "M") {
      setMetallisationRowsInput((prev) => [...prev, createMetallisationRow(availableRollIds[0] ?? "")]);
      return;
    }
    setSlittingRowsInput((prev) => recalculateProductNos([...prev, createSlittingRow(availableCoilIds[0] ?? "")], basePmIdRef.current));
  };

  const updateMetallisationRow = (index: number, patch: Partial<MetallisationForm>) => {
    setMetallisationRowsInput((prev) => prev.map((row, idx) => (idx === index ? { ...row, ...patch } : row)));
  };

  const updateSlittingRow = (index: number, patch: Partial<SlittingForm>) => {
    setSlittingRowsInput((prev) => {
      const nextRows = prev.map((row, idx) => {
        if (idx === index) {
          const newRow = { ...row, ...patch };
          if (patch.noOfBags !== undefined) {
            const bagsCount = Math.max(1, Math.min(10, patch.noOfBags));
            const currentBags = [...newRow.bags];
            if (bagsCount > currentBags.length) {
              for (let i = currentBags.length; i < bagsCount; i++) {
                currentBags.push({ id: generateId("BAG"), productNo: generateId("PM"), grade: "AA", weight: "" });
              }
            } else if (bagsCount < currentBags.length) {
              currentBags.length = bagsCount;
            }
            newRow.bags = currentBags;
          }
          return newRow;
        }
        return row;
      });
      if (patch.noOfBags !== undefined) return recalculateProductNos(nextRows, basePmIdRef.current);
      return nextRows;
    });
  };

  const updateBagField = (rowIndex: number, bagId: string, field: keyof BagData, value: string) => {
    setSlittingRowsInput((prev) => prev.map((row, idx) => {
      if (idx !== rowIndex) return row;
      const newBags = row.bags.map(bag => bag.id === bagId ? { ...bag, [field]: value } : bag);
      return { ...row, bags: newBags };
    }));
  };

  const removeCurrentRow = (index: number) => {
    if (activeTab === "M") {
      if (metallisationRowsInput.length === 1) return;
      setMetallisationRowsInput((prev) => prev.filter((_, idx) => idx !== index));
      return;
    }
    if (slittingRowsInput.length === 1) return;
    setSlittingRowsInput((prev) => recalculateProductNos(prev.filter((_, idx) => idx !== index), basePmIdRef.current));
  };

  const submitCurrentStage = async (isPrint = false) => {
    if (!isCurrentStepOneValid || !isStepTwoValid) {
      setShowValidationHint(true);
      return;
    }

    try {
      setIsSubmitting(true);
      const user = await authService.getCurrentProfile();

      if (activeTab === "M") {
        const payload = metallisationRowsInput;
        for (const item of payload) {
          const rmData = rmLookup.get(item.rmId);
          await productionStageService.addMetallisation({
            metallisation_no: item.coilNo,
            work_order_id: woData.id,
            raw_material_id: rmData?.raw_material_id || "",
            machine_no: item.machineNo,
            weight_kg: parseFloat(item.weight) || 0,
            optical_density: parseFloat(item.opticalDensity) || 0,
            resistance_ohms: parseFloat(item.resistance) || 0,
            operator_id: user?.id,
          });
        }
        await workOrderService.update(woData.id, {
          stage: "Slitting",
          status: "In-progress"
        });
      }

      if (activeTab === "S") {
        const payload = slittingRowsInput;

        let slittingImageUrl = undefined;
        if (capturedImage?.file) {
          try {
            slittingImageUrl = await uploadSlittingImage(woData.work_order_no, capturedImage.file);
          } catch (err) {
            console.error("Failed to upload slitting QC image", err);
            throw err;
          }
        }

        for (const item of payload) {
          const coilData = coilLookup.get(item.coilId);
          const slittingRecords: any[] = [];

          // 1. Create an individual Slitting record for each bag
          for (const [bagIdx, bag] of item.bags.entries()) {
            try {
              const slittingRecord = await productionStageService.addSlitting({
                slitting_no: bag.productNo,
                work_order_id: woData.id,
                metallisation_id: coilData?.metallisation_id || undefined,
                product_no: bag.productNo,
                weight_kg: parseFloat(bag.weight || "0"),
                thickness_micron: parseFloat(woData.micron) || 0,
                width_m: parseFloat(woData.width_m || woData.width) || 0,
                number_of_bags: 1,
                grade: bag.grade,
                grade_each_bag: [bag.grade],
                weight_each_bag: [parseFloat(bag.weight || "0")],
                remarks: slittingReviewRemarks,
                operator_id: user?.id,
                slitting_review_image_url: bagIdx === 0 ? slittingImageUrl : undefined,
              });
              slittingRecords.push(slittingRecord);

              await stockService.create({
                stock_no: (slittingRecord as any).product_no || bag.productNo,
                slitting_id: (slittingRecord as any).id,
                work_order_id: woData.id,
                weight_kg: parseFloat(bag.weight || "0"),
                width_m: parseFloat(woData.width_m || woData.width) || 0,
                micron: parseFloat(woData.micron) || 0,
                grade: bag.grade,
                quantity: 1,
                stage: "Stock",
              });
            } catch (err: any) {
              throw err;
            }
          }

          // 2. Create one packet batch for the entire batch
          if (slittingRecords.length > 0) {
            const batchResult = await slittingService.createPacketBatch({
              slitting_id: slittingRecords[0].id,
              packet_type: "Bag",
              quantity: item.noOfBags,
              product_order_id: undefined,
              item_weights: item.bags.map(b => parseFloat(b.weight || "0")),
              item_grades: item.bags.map(b => b.grade),
              idempotency_key: item.idempotencyKey,
            });

            // Process the response so that every created packet is reflected in the UI
            if (batchResult && batchResult.items) {
              setSlittingRowsInput((prev) => {
                const next = [...prev];
                const rowIndex = next.findIndex(r => r.coilId === item.coilId);
                if (rowIndex > -1) {
                  next[rowIndex] = {
                    ...next[rowIndex],
                    bags: next[rowIndex].bags.map((bag, bagIdx) => ({
                      ...bag,
                      productNo: (batchResult.items as any[])[bagIdx]?.item_no || bag.productNo
                    }))
                  };
                }
                return next;
              });
            }

            if (isPrint) {
              window.open(slittingService.batchStickerPrintUrl(String(batchResult.batch.id)), "_blank");
            }
          }
        }
        await workOrderService.update(woData.id, {
          stage: "Ready for Winding",
          status: "In-progress"
        });
      }

      setModalStep(3);
      setIsSubmitting(false);
      fetchWorkOrder();
    } catch (err: any) {
      setIsSubmitting(false);
      console.error(err);
      alert(`Failed to save data: ${err.message || "Unknown error"}`);
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
    if (activeTab === "M") {
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
                      updateMetallisationRow(idx, {
                        rmId: id,
                        weight: rm?.weight ?? row.weight,
                      });
                    }}
                    onScanData={(data) => {
                      const rm = rmLookup.get(data);
                      updateMetallisationRow(idx, {
                        rmId: data,
                        weight: rm?.weight ?? row.weight,
                      });
                    }}
                    list={`rm-list-${idx}`}
                    placeholder="Scan RM ID..."
                    className="h-[42px] rounded-[8px] border border-[#DDE1E8] pl-3 text-[14px]"
                  />
                  <datalist id={`rm-list-${idx}`}>
                    {availableRollIds.map((rollId: string) => (
                      <option key={rollId} value={rollId}>{rollId}</option>
                    ))}
                  </datalist>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-medium text-[#171717]">Machine No.</label>
                  <input value={row.machineNo} onChange={(e) => updateMetallisationRow(idx, { machineNo: e.target.value })} placeholder="Machine number" className="h-[42px] rounded-[8px] border border-[#DDE1E8] px-3 text-[14px]" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-medium text-[#171717]">Weight</label>
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
        {slittingRowsInput.map((row, idx) => {
          const coilData = coilLookup.get(row.coilId);
          return (
            <div key={`slit-step1-${idx}`} className="rounded-[12px] border border-[#DDE1E8] p-4 bg-white relative">
              {coilData && (
                <div className="absolute top-4 right-4 flex items-center gap-2">
                  <div className="text-[13px] text-[#5C5C5C] font-medium bg-[#F4FBFF] border border-[#78CFFA] px-3 py-1 rounded-[6px]">
                    Weight after Metallisation: <span className="font-semibold text-[#171717]">{coilData.weight || "0"} kgs</span>
                  </div>
                  <div className="text-[13px] text-[#5C5C5C] font-medium bg-[#F4FBFF] border border-[#78CFFA] px-3 py-1 rounded-[6px]">
                    Added Weight: <span className="font-semibold text-[#171717]">{row.bags.reduce((acc, bag) => acc + (parseFloat(bag.weight) || 0), 0)} kgs</span>
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between mb-4">
                <p className="text-[14px] font-semibold text-[#171717]">Slitting Item {idx + 1}</p>
                {slittingRowsInput.length > 1 && (
                  <button type="button" onClick={() => removeCurrentRow(idx)} className="text-[12px] text-[#D92D20] hover:underline mt-8">Remove</button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-medium text-[#171717]">Coil ID (from Metallisation)</label>
                  <div className="relative flex flex-col gap-1">
                    <ScannerInput
                      isSelect
                      value={row.coilId}
                      onChange={(e) => updateSlittingRow(idx, { coilId: e.target.value })}
                      onScanData={(data) => updateSlittingRow(idx, { coilId: data })}
                      className="h-[42px] rounded-[8px] border border-[#DDE1E8] pl-3 text-[14px]"
                    >
                      <option value="" disabled>Select Coil ID...</option>
                      {availableCoilIds.map((coilId: string) => (
                        <option key={coilId} value={coilId}>{coilId}</option>
                      ))}
                    </ScannerInput>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-medium text-[#171717]">No. of Bags</label>
                  <select
                    value={row.noOfBags}
                    onChange={(e) => updateSlittingRow(idx, { noOfBags: parseInt(e.target.value) })}
                    className="h-[42px] rounded-[8px] border border-[#DDE1E8] px-3 text-[14px]"
                  >
                    {[...Array(10)].map((_, i) => (
                      <option key={i + 1} value={i + 1}>{i + 1}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="bg-[#FAFAFA] border border-[#EBEBEB] rounded-[8px] p-4 flex flex-col gap-3 mt-2">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[13px] font-semibold text-[#171717]">Bag Details</p>
                  {(() => {
                    const totalBagWeight = row.bags.reduce((acc, bag) => acc + (parseFloat(bag.weight) || 0), 0);
                    const coilWeight = parseFloat(String(coilData?.weight || 0));
                    if (coilData && totalBagWeight > coilWeight) {
                      return <p className="text-[12px] font-medium text-[#D92D20]">Total bag weight ({totalBagWeight}kg) exceeds coil weight ({coilWeight}kg)</p>;
                    }
                    return null;
                  })()}
                </div>
                {row.bags.map((bag, bagIdx) => (
                  <div key={bag.id} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center bg-white p-3 border border-[#EBEBEB] rounded-[6px]">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[12px] font-medium text-[#5C5C5C]">Bag {bagIdx + 1} - Product ID</label>
                      <input
                        value={bag.productNo}
                        disabled
                        className="h-[38px] rounded-[6px] border border-[#DDE1E8] bg-gray-50 px-3 text-[13px] text-[#8B8BA2]"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[12px] font-medium text-[#5C5C5C]">Grade</label>
                      <select
                        value={bag.grade}
                        onChange={(e) => updateBagField(idx, bag.id, 'grade', e.target.value)}
                        className="h-[38px] rounded-[6px] border border-[#DDE1E8] px-3 text-[13px]"
                      >
                        {gradeOptions.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[12px] font-medium text-[#5C5C5C]">Bag {bagIdx + 1} - Weight (kg)</label>
                      <input
                        type="number" step="0.1"
                        value={bag.weight}
                        onChange={(e) => updateBagField(idx, bag.id, 'weight', e.target.value)}
                        placeholder="e.g. 50"
                        className="h-[38px] rounded-[6px] border border-[#DDE1E8] px-3 text-[13px]"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderReviewCards = () => {
    if (activeTab === "M") {
      const rows = metallisationRowsInput;
      return rows.map((item, idx) => (
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

    const rows = slittingRowsInput;
    return rows.map((item, idx) => {
      const coilData = coilLookup.get(item.coilId);
      const metallisationWeight = parseFloat(coilData?.weight || "0");
      const addedWeight = item.bags.reduce((acc, bag) => acc + (parseFloat(bag.weight) || 0), 0);
      const remainingWeight = metallisationWeight - addedWeight;

      return (
        <div key={`slit-${idx}`} className="flex flex-col gap-3 rounded-[12px] border border-[#78CFFA] bg-[#F4FBFF] p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-6 text-[14px] text-[#49526A]">
            <p>Coil ID: {item.coilId || "-"}</p>
            <p>No. of Bags: {item.noOfBags}</p>
            <p>Total Weight: {addedWeight} kgs</p>
          </div>
          <div className="bg-white rounded-[8px] border border-[#78CFFA]/40 p-3 mt-1">
            <p className="text-[13px] font-semibold text-[#171717] mb-2">Bags Details</p>
            <div className="flex flex-col gap-2">
              {item.bags.map((bag, bagIdx) => (
                <div key={bag.id} className="text-[13px] bg-[#F4FBFF] border border-[#78CFFA]/60 rounded-[6px] px-3 py-2 text-[#49526A] flex flex-wrap gap-4 items-center">
                  <span className="font-medium text-[#00B6E2]">Bag {bagIdx + 1}</span>
                  <span><span className="text-[#8B8BA2]">ID:</span> {bag.productNo}</span>
                  <span><span className="text-[#8B8BA2]">Weight:</span> {bag.weight || "0"}kgs</span>
                  <span><span className="text-[#8B8BA2]">Grade:</span> {bag.grade}</span>
                </div>
              ))}
            </div>
          </div>
          {remainingWeight > 0 && (
            <div className="mt-2 flex flex-col gap-3">
              <div className="flex items-center justify-between bg-white border border-[#FCA5A5] rounded-[8px] p-3 text-[13px]">
                <span className="font-medium text-[#B91C1C]">Slitting Item {idx + 1}</span>
                <span className="font-semibold text-[#B91C1C]">Remaining Weight: {remainingWeight} kg</span>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-[#171717]">Reason for remaining weight</label>
                <textarea
                  value={item.reason || ""}
                  onChange={(e) => updateSlittingRow(idx, { reason: e.target.value })}
                  placeholder="Explain why the remaining weight was not converted into bags..."
                  className="rounded-[8px] border border-[#DDE1E8] px-3 py-2 text-[14px] min-h-[80px] resize-none bg-white"
                />
              </div>
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="font-dm-sans min-h-[calc(100vh-72px)] bg-white flex flex-col relative overflow-x-hidden">
      <MobileHeader title="Work Orders details" />

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
                  {activeTab === "S" && (
                    <div className="flex flex-col gap-2 rounded-[12px] border border-[#DDE1E8] p-4 bg-white">
                      <label className="text-[13px] font-medium text-[#171717]">Review Remarks</label>
                      <input value={slittingReviewRemarks} onChange={(e) => setSlittingReviewRemarks(e.target.value)} placeholder="Enter review remarks" className="h-[42px] rounded-[8px] border border-[#DDE1E8] px-3 text-[14px]" />
                    </div>
                  )}
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
                  {activeTab === "S" && (
                    <button onClick={() => submitCurrentStage(true)} disabled={isSubmitting || !isStepTwoValid} className={`h-[40px] px-2 md:px-4 text-[10px] md:text-[14px] font-medium rounded-[6px] flex items-center justify-center gap-2 border border-[#EBEBEB] bg-white text-[#171717] hover:bg-gray-50`}>
                      {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                      {!isSubmitting && <Printer className="w-4 h-4" />}
                      Print
                    </button>
                  )}
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

      {/* Desktop breadcrumb */}
      <section className="bg-white border-b border-[#EBEBEB] hidden md:block">
        <div className="px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[14px]">
            <Link href="/person-a-slitting/workorder" className="text-[#5C5C5C] hover:text-black">Work Orders</Link>
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
                ...(activeTab === "RM" ? {
                  "Roll No": row.rollNo ?? "",
                  "Net Weight": row.netWeight ?? row.weight ?? "",
                  "Gross Weight": row.grossWeight ?? "",
                  "Micron": row.thickness ?? "",
                  "Width (m)": row.width ?? "",
                  "Temperature": row.temperature ?? "",
                  "Supplier": row.supplier ?? "",
                  "Stage": row.stage ?? "",
                  "Status": row.status ?? "",
                } : activeTab === "M" ? {
                  "Coil No": row.coilNo ?? "",
                  "RM ID": row.rollNo ?? "",
                  "RM Weight": row.rmWeight ?? "",
                  "Factory Wastage": row.factoryWastageWeight ?? "",
                  "Metallisation Weight": row.weight ?? "",
                  "Timestamp": row.timestamp ?? "",
                  "Next Stage": row.nextStage ?? "",
                  "Status": row.status ?? "",
                } : {
                  "Product No": row.productNo ?? "",
                  "Coil ID": row.rmId ?? "",
                  "Weight": row.weight ?? "",
                  "Thickness": row.thickness ?? "",
                  "Grade": row.grade ?? "",
                  "Timestamp": row.timestampAdded ?? "",
                  "Stage": row.stage ?? "",
                  "Status": row.status ?? "",
                })
              }));
              exportToExcel(exportData, `workorder-detail-${activeTab.toLowerCase().replace(/\s+/g, "-")}`, activeTab);
            }}
          />

          {activeTab !== "RM" && activeTab !== "M" && (
            <button
              onClick={openModal}
              className="flex items-center justify-center gap-2 bg-[#00B6E2] text-white text-[14px] font-medium rounded-[6px] h-[40px] px-[18px] hover:bg-[#0092b5] transition-colors shrink-0 w-full sm:w-auto"
            >
              <Plus className="w-4 h-4 shrink-0" strokeWidth={2.5} />
              <span className="leading-tight truncate">
                Add Slitting
              </span>
            </button>
          )}
        </div>

        {/* Scrollable tab bar on mobile */}
        <div className="overflow-x-auto -mx-4 md:mx-0 px-4 md:px-0">
          <div className="flex items-center gap-2 border-b border-[#EBEBEB] pb-4 min-w-max">
            {(["RM", "M", "S"] as TabType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-[14px] font-medium rounded-[8px] transition-colors whitespace-nowrap ${activeTab === tab
                  ? "bg-[#00B6E2] text-white"
                  : "bg-white text-[#5C5C5C] hover:bg-[#F5F7FA]"
                  }`}
                title={tab === "RM" ? "Raw Material" : tab === "M" ? "Metallisation" : "Slitting"}
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
                        const isRM = activeTab === "RM";
                        const isMC = activeTab === "M";
                        const rowId = isRM ? (row as any).rollNo : isMC ? (row as any).coilNo : (row as any).productNo;
                        const qrType = isRM ? "RM" : isMC ? "MC" : "PM";
                        const qrDetails: any = isRM
                          ? { rollNo: (row as any).rollNo ?? "", micron: (row as any).thickness ?? "", width: (row as any).width ?? "", netWeight: (row as any).netWeight.split("k")[0] ?? "", grossWeight: (row as any).grossWeight.split("k")[0] ?? "", supplier: (row as any).supplier ?? "", status: (row as any).status ?? "" }
                          : isMC
                            ? { coilNo: (row as any).coilNo ?? "", rmId: (row as any).rmId ?? "", factoryWastageWeight: (row as any).factoryWastageWeight ?? "", weight: (row as any).weight ?? "", date: (row as any).timestamp ?? "", status: (row as any).status ?? "" }
                            : { productNo: (row as any).productNo ?? "", coilId: (row as any).rmId ?? "", weight: (row as any).weight ?? "", grade: (row as any).grade ?? "", date: (row as any).timestampAdded ?? "", status: (row as any).status ?? "" };
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
                        const isRM = activeTab === "RM";
                        const isMC = activeTab === "M";
                        const rowId = isRM ? (row as any).rollNo : isMC ? (row as any).coilNo : (row as any).productNo;
                        const qrType = isRM ? "RM" : isMC ? "MC" : "PM";
                        const qrDetails: any = isRM
                          ? { rollNo: (row as any).rollNo ?? "", netWeight: (row as any).netWeight ?? (row as any).weight ?? "", grossWeight: (row as any).grossWeight ?? "-", micron: (row as any).thickness ?? "", width: (row as any).width ?? "", temperature: (row as any).temperature ?? "-", supplier: (row as any).supplier ?? "", status: (row as any).status ?? "" }
                          : isMC
                            ? { "Coil No": (row as any).coilNo ?? "", "RM ID": (row as any).rmId ?? "", "Machine No": (row as any).machineNo ?? "", "Weight": (row as any).weight ?? "", "Status": (row as any).status ?? "" }
                            : { "Product No": (row as any).productNo ?? "", "RM ID": (row as any).rmId ?? "", "Weight": (row as any).weight ?? "", "Grade": (row as any).grade ?? "", "Status": (row as any).status ?? "" };
                        return (
                          <td key={String(col.key)} className="px-4 py-3 whitespace-nowrap">
                            {activeTab !== "RM" ? (
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
                      if (activeTab === "RM" && !val) {
                        const fallbackWeight = (row as any).netWeight ?? (row as any).weight ?? "-";
                        if (col.key === "actualWeight") displayVal = fallbackWeight;
                        else if (col.key === "usedWeight") displayVal = fallbackWeight;
                        else if (col.key === "damagedWeight") displayVal = "0.0kgs";
                        else if (col.key === "wastageWeight") displayVal = "0.0kgs";
                      }

                      return (
                        <td key={String(col.key)} className={`px-4 py-4 text-[14px] ${['rollNo', 'coilNo', 'productNo'].includes(String(col.key)) ? 'text-[#00B6E2] font-semibold' : 'text-[#5C5C5C]'} whitespace-nowrap`}>
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