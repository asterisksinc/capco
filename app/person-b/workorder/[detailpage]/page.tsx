"use client";

import { WO_STATUS_OPTIONS, WO_STAGE_OPTIONS } from "@/lib/constants";
import { StatusBadge } from "@/components/StatusBadge";
import { use, useState, useMemo } from "react";
import { Plus, X, ChevronRight, Check, QrCode } from "lucide-react";
import { FileText, Ruler, Maximize2, Package } from "lucide-react";
import { useStore } from "@/hooks/useStore";
import { ScannerInput } from "@/components/ScannerInput";
import { computeWorkflowProgress } from "../../../../lib/data";
import type { TableConfig } from "@/hooks/useTableControls";
import { TablePagination } from "@/components/table/TablePagination";
import { useTableControls } from "@/hooks/useTableControls";
import { SortableHeader } from "@/components/table/SortableHeader";
import { TableToolbar } from "@/components/table/TableToolbar";
import { OptionsDropdown } from "@/components/table/OptionsDropdown";
import { MobileHeader } from "@/components/MobileHeader";
import { QRCodeModal, type QRModalData } from "@/components/QRCodeModal";
import { exportToExcel } from "@/lib/exportExcel";

type DetailPageProps = {
  params: Promise<{ detailpage: string }>;
};

type TabType = "Winding" | "Spray";
type ModalStep = 1 | 2 | 3;

type WindingForm = {
  wdId: string;
  linkedPmId: string;
  filmWidth: string;
  windingTension: string;
  turnsCount: string;
  quantityWound: string;
};

type SprayForm = {
  spId: string;
  linkedWdId: string;
  sprayType: string;
  feedRate: string;
  pressureSitting: string;
};

const windingConfig: TableConfig<any> = {
  columns: [
    { key: "wdId", label: "WD-ID", type: "text", sortable: true },
    { key: "linkedPmId", label: "Linked PM-ID", type: "text", sortable: true },
    { key: "filmWidth", label: "Film Width", type: "text", sortable: true },
    { key: "windingTension", label: "Winding Tension", type: "text", sortable: true },
    { key: "turnsCount", label: "Turns Count", type: "text", sortable: true },
    { key: "quantityWound", label: "Quantity Wound", type: "text", sortable: true },
    { key: "stage", label: "Stage", type: "text", sortable: true },
    { key: "timestamp", label: "Timestamp", type: "date", sortable: true },
    { key: "options", label: "Action", type: "text", sortable: false }
  ]
};

const sprayConfig: TableConfig<any> = {
  columns: [
    { key: "spId", label: "SP-ID", type: "text", sortable: true },
    { key: "linkedWdId", label: "Linked WD-ID", type: "text", sortable: true },
    { key: "sprayType", label: "Spray Type", type: "text", sortable: true },
    { key: "feedRate", label: "Feed Rate", type: "text", sortable: true },
    { key: "pressureSitting", label: "Pressure Sitting", type: "text", sortable: true },
    { key: "stage", label: "Stage", type: "text", sortable: true },
    { key: "timestamp", label: "Timestamp", type: "date", sortable: true },
    { key: "options", label: "Action", type: "text", sortable: false }
  ]
};

const defaultWindingForm: WindingForm = {
  wdId: "",
  linkedPmId: "",
  filmWidth: "7mm",
  windingTension: "0.5 N",
  turnsCount: "",
  quantityWound: "",
};

const defaultSprayForm: SprayForm = {
  spId: "",
  linkedWdId: "",
  sprayType: "Zinc-spray",
  feedRate: "",
  pressureSitting: "",
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

function createWindingRow(): WindingForm {
  return {
    ...defaultWindingForm,
    wdId: generateId("WD"),
  };
}

function createSprayRow(): SprayForm {
  return {
    ...defaultSprayForm,
    spId: generateId("SP"),
  };
}

export default function PersonBWorkOrderDetailPage({ params }: DetailPageProps) {
  const { detailpage } = use(params);
  const orderId = detailpage.toUpperCase();
  const { store, mounted, addFlowRow } = useStore();
  const workOrderFlowData = store.flowDataMap[orderId];

  const [activeTab, setActiveTab] = useState<TabType>("Winding");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState<ModalStep>(1);
  const [showValidationHint, setShowValidationHint] = useState(false);
  const workflowProgress = computeWorkflowProgress(workOrderFlowData);

  const availablePmIds = Array.from(new Set(store.workOrders.flatMap((wo) => {
    const flow = store.flowDataMap[wo.id];
    return flow?.slittingRows.map((row) => row.productNo) ?? [];
  })));
  const pmLookup = useMemo(() => {
    const map = new Map<string, { weight: string; grade: string; micron: string; width: string }>();
    for (const wo of store.workOrders) {
      const flow = store.flowDataMap[wo.id];
      if (!flow) continue;
      for (const s of flow.slittingRows) {
        map.set(s.productNo, { weight: s.weight, grade: s.grade, micron: s.thickness, width: flow.overview.width });
      }
    }
    return map;
  }, [store.flowDataMap]);

  const availableWdIds = Array.from(new Set(store.workOrders.flatMap((wo) => {
    const flow = store.flowDataMap[wo.id];
    return flow?.windingRows.map((row) => row.wdId) ?? [];
  })));
  const wdLookup = useMemo(() => {
    const map = new Map<string, { filmWidth: string; windingTension: string; turnsCount: string; quantityWound: string }>();
    for (const wo of store.workOrders) {
      const flow = store.flowDataMap[wo.id];
      if (!flow) continue;
      for (const w of flow.windingRows) {
        map.set(w.wdId, { filmWidth: w.filmWidth, windingTension: w.windingTension, turnsCount: w.turnsCount, quantityWound: w.quantityWound });
      }
    }
    return map;
  }, [store.flowDataMap]);

  const [windingRowsInput, setWindingRowsInput] = useState<WindingForm[]>([createWindingRow()]);
  const [sprayRowsInput, setSprayRowsInput] = useState<SprayForm[]>([createSprayRow()]);
  const [modalImage, setModalImage] = useState<string | null>(null);
  const [qrData, setQrData] = useState<QRModalData | null>(null);

  const currentConfig = useMemo(() => {
    switch (activeTab) {
      case "Winding": return windingConfig;
      case "Spray": return sprayConfig;
      default: return windingConfig;
    }
  }, [activeTab]);

  const currentData = useMemo(() => {
    if (!workOrderFlowData) return [];
    switch (activeTab) {
      case "Winding": return workOrderFlowData.windingRows;
      case "Spray": return workOrderFlowData.sprayRows;
      default: return [];
    }
  }, [workOrderFlowData, activeTab]);

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

  if (!mounted || !workOrderFlowData) return null;

  const resetModalState = () => {
    setModalStep(1);
    setShowValidationHint(false);
    setModalImage(null);
    setWindingRowsInput([createWindingRow()]);
    setSprayRowsInput([createSprayRow()]);
  };

  const openModal = () => {
    resetModalState();
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    resetModalState();
  };

  const getCurrentDraftCount = () => {
    if (activeTab === "Winding") return windingRowsInput.length;
    return sprayRowsInput.length;
  };

  const isWindingRowValid = (row: WindingForm) => {
    return Boolean(
      row.wdId.trim() &&
      hasPositiveNumber(row.turnsCount) &&
      hasPositiveNumber(row.quantityWound)
    );
  };

  const isSprayRowValid = (row: SprayForm) => {
    return Boolean(
      row.spId.trim() &&
      row.sprayType.trim() &&
      hasPositiveNumber(row.feedRate) &&
      hasPositiveNumber(row.pressureSitting)
    );
  };

  const isCurrentStepOneValid =
    activeTab === "Winding"
      ? windingRowsInput.every(isWindingRowValid)
      : sprayRowsInput.every(isSprayRowValid);

  const addCurrentItemToDraft = () => {
    if (!isCurrentStepOneValid) {
      setShowValidationHint(true);
      return;
    }

    if (activeTab === "Winding") {
      setWindingRowsInput((prev) => [...prev, createWindingRow()]);
      return;
    }
    setSprayRowsInput((prev) => [...prev, createSprayRow()]);
  };

  const updateWindingRow = (index: number, patch: Partial<WindingForm>) => {
    setWindingRowsInput((prev) => prev.map((row, idx) => (idx === index ? { ...row, ...patch } : row)));
  };

  const updateSprayRow = (index: number, patch: Partial<SprayForm>) => {
    setSprayRowsInput((prev) => prev.map((row, idx) => (idx === index ? { ...row, ...patch } : row)));
  };

  const removeCurrentRow = (index: number) => {
    if (activeTab === "Winding") {
      if (windingRowsInput.length === 1) return;
      setWindingRowsInput((prev) => prev.filter((_, idx) => idx !== index));
      return;
    }
    if (sprayRowsInput.length === 1) return;
    setSprayRowsInput((prev) => prev.filter((_, idx) => idx !== index));
  };

  const submitCurrentStage = () => {
    if (!isCurrentStepOneValid) {
      setShowValidationHint(true);
      return;
    }

    const dateTime = getDateTimeString();

    if (activeTab === "Winding") {
      const payload = windingRowsInput;
      payload.forEach((item) => {
        addFlowRow(orderId, "Winding", {
          wdId: item.wdId || generateId("WD"),
          linkedPmId: item.linkedPmId || "-",
          filmWidth: item.filmWidth || "0",
          windingTension: item.windingTension || "0",
          turnsCount: item.turnsCount || "0",
          quantityWound: item.quantityWound || "0",
          stage: "Spray",
          timestamp: dateTime,
          status: "Completed",
        });
      });
    }

    if (activeTab === "Spray") {
      const payload = sprayRowsInput;
      payload.forEach((item) => {
        addFlowRow(orderId, "Spray", {
          spId: item.spId || generateId("SP"),
          linkedWdId: item.linkedWdId || "-",
          sprayType: item.sprayType || "Zinc-spray",
          feedRate: item.feedRate || "0",
          pressureSitting: item.pressureSitting || "0",
          stage: "Moved to Person C",
          timestamp: dateTime,
          status: "Completed",
        });
      });
    }

    setModalStep(3);
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
    const labels = ["Input Details", "Submit Details"];
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
    if (activeTab === "Winding") {
      return (
        <div className="flex flex-col gap-4">
          {windingRowsInput.map((row, idx) => (
            <div key={`wind-step1-${idx}`} className="rounded-[12px] border border-[#DDE1E8] p-4 bg-white">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[13px] font-semibold text-[#344054]">Item {idx + 1}</p>
                {windingRowsInput.length > 1 && (
                  <button type="button" onClick={() => removeCurrentRow(idx)} className="text-[12px] text-[#D92D20] hover:underline">Remove</button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-medium text-[#171717]">WD-ID</label>
                  <input value={row.wdId} readOnly className="h-[42px] rounded-[8px] border border-[#DDE1E8] bg-[#F8FAFC] px-3 text-[14px] text-[#5C5C5C]" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-medium text-[#171717]">Linked PM-ID</label>
                  <ScannerInput 
                    value={row.linkedPmId} 
                    onChange={(e) => {
                      const id = e.target.value;
                      const pm = pmLookup.get(id);
                      updateWindingRow(idx, { linkedPmId: id });
                    }}
                    onScanData={(data) => {
                      const pm = pmLookup.get(data);
                      updateWindingRow(idx, { linkedPmId: data });
                    }}
                    list={`pm-list-${idx}`}
                    placeholder="Scan PM-ID..."
                    className="h-[42px] rounded-[8px] border border-[#DDE1E8] pl-3 text-[14px]"
                  />
                  <datalist id={`pm-list-${idx}`}>
                    {availablePmIds.map((pmId) => (
                      <option key={pmId} value={pmId}>{pmId}</option>
                    ))}
                  </datalist>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-medium text-[#171717]">Film Width</label>
                  <input value={row.filmWidth} onChange={(e) => updateWindingRow(idx, { filmWidth: e.target.value })} placeholder="Film width" className="h-[42px] rounded-[8px] border border-[#DDE1E8] px-3 text-[14px]" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-medium text-[#171717]">Winding Tension</label>
                  <input value={row.windingTension} onChange={(e) => updateWindingRow(idx, { windingTension: e.target.value })} placeholder="Winding tension" className="h-[42px] rounded-[8px] border border-[#DDE1E8] px-3 text-[14px]" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-medium text-[#171717]">Turns Count</label>
                  <input type="number" min="1" value={row.turnsCount} onChange={(e) => updateWindingRow(idx, { turnsCount: e.target.value })} placeholder="Enter turns count" className="h-[42px] rounded-[8px] border border-[#DDE1E8] px-3 text-[14px]" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-medium text-[#171717]">Quantity Wound</label>
                  <input type="number" min="1" value={row.quantityWound} onChange={(e) => updateWindingRow(idx, { quantityWound: e.target.value })} placeholder="Enter quantity wound" className="h-[42px] rounded-[8px] border border-[#DDE1E8] px-3 text-[14px]" />
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-4">
        {sprayRowsInput.map((row, idx) => (
          <div key={`spray-step1-${idx}`} className="rounded-[12px] border border-[#DDE1E8] p-4 bg-white">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[13px] font-semibold text-[#344054]">Item {idx + 1}</p>
              {sprayRowsInput.length > 1 && (
                <button type="button" onClick={() => removeCurrentRow(idx)} className="text-[12px] text-[#D92D20] hover:underline">Remove</button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-medium text-[#171717]">SP-ID</label>
                <input value={row.spId} readOnly className="h-[42px] rounded-[8px] border border-[#DDE1E8] bg-[#F8FAFC] px-3 text-[14px] text-[#5C5C5C]" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-medium text-[#171717]">Linked WD-ID</label>
                <ScannerInput 
                  value={row.linkedWdId} 
                  onChange={(e) => {
                    const id = e.target.value;
                    const wd = wdLookup.get(id);
                    updateSprayRow(idx, { linkedWdId: id });
                  }}
                  onScanData={(data) => {
                    const wd = wdLookup.get(data);
                    updateSprayRow(idx, { linkedWdId: data });
                  }}
                  list={`wd-list-${idx}`}
                  placeholder="Scan WD-ID..."
                  className="h-[42px] rounded-[8px] border border-[#DDE1E8] pl-3 text-[14px]"
                />
                <datalist id={`wd-list-${idx}`}>
                  {availableWdIds.map((wdId) => (
                    <option key={wdId} value={wdId}>{wdId}</option>
                  ))}
                </datalist>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-medium text-[#171717]">Spray Type</label>
                <input value={row.sprayType} onChange={(e) => updateSprayRow(idx, { sprayType: e.target.value })} placeholder="Spray type" className="h-[42px] rounded-[8px] border border-[#DDE1E8] px-3 text-[14px]" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-medium text-[#171717]">Feed Rate</label>
                <input type="number" min="0" step="0.1" value={row.feedRate} onChange={(e) => updateSprayRow(idx, { feedRate: e.target.value })} placeholder="Enter feed rate" className="h-[42px] rounded-[8px] border border-[#DDE1E8] px-3 text-[14px]" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-medium text-[#171717]">Pressure Sitting</label>
                <input type="number" min="0" step="0.1" value={row.pressureSitting} onChange={(e) => updateSprayRow(idx, { pressureSitting: e.target.value })} placeholder="Enter pressure sitting" className="h-[42px] rounded-[8px] border border-[#DDE1E8] px-3 text-[14px]" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderReviewCards = () => {
    if (activeTab === "Winding") {
      const rows = windingRowsInput;
      return rows.map((item, idx) => (
        <div key={`wind-${idx}`} className="rounded-[12px] border border-[#78CFFA] bg-[#F4FBFF] p-4 grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-6 text-[14px] text-[#49526A]">
          <p>WD-ID: {item.wdId || "Auto"}</p>
          <p>Linked PM-ID: {item.linkedPmId || "-"}</p>
          <p>Film Width: {item.filmWidth}</p>
          <p>Winding Tension: {item.windingTension}</p>
          <p>Turns Count: {item.turnsCount || "0"}</p>
          <p>Quantity Wound: {item.quantityWound || "0"}</p>
        </div>
      ));
    }

    const rows = sprayRowsInput;
    return rows.map((item, idx) => (
      <div key={`spray-${idx}`} className="rounded-[12px] border border-[#78CFFA] bg-[#F4FBFF] p-4 grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-6 text-[14px] text-[#49526A]">
        <p>SP-ID: {item.spId || "Auto"}</p>
        <p>Linked WD-ID: {item.linkedWdId || "-"}</p>
        <p>Spray Type: {item.sprayType}</p>
        <p>Feed Rate: {item.feedRate || "0"}</p>
        <p>Pressure Sitting: {item.pressureSitting || "0"}</p>
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
            <p className="text-[12px] text-[#D92D20]">All required fields must be filled before adding an item or moving to the next step.</p>
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
          <p className="text-[15px] text-[#667085] max-w-[460px]">Winding/Spray data has been recorded for this work order.</p>
        </div>
      </div>
    );
  };

  const { paginatedData, totalPages, validPage: currentPage } = getPaginatedData(processedData);

  return (
    <div className="font-dm-sans min-h-[calc(100vh-72px)] bg-white flex flex-col relative pb-12 overflow-x-hidden">
      <MobileHeader title={orderId} />

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#171717]/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-[16px] w-full max-w-[860px] shadow-lg flex flex-col overflow-hidden">
            <div className="flex items-start justify-between px-6 py-5 border-b border-[#EBEBEB]">
              <div className="flex flex-col gap-1">
                <h2 className="text-[28px] leading-tight font-semibold text-[#171717]">Add {activeTab} Details</h2>
                <p className="text-[15px] text-[#5C5C5C]">Capture the stage details for work order {orderId}</p>
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
                      if (!isCurrentStepOneValid) {
                        setShowValidationHint(true);
                        return;
                      }
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
                    className={`h-[40px] px-5 text-[14px] font-medium rounded-[6px] transition-colors ${isCurrentStepOneValid ? "bg-[#00B6E2] text-white hover:bg-[#0092b5]" : "bg-[#A7DDEB] text-white cursor-not-allowed"}`}
                  >
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
        <span className="text-[14px] font-medium text-[#00B6E2] leading-tight">{orderId}</span>
      </div>

      {/* Mobile KPI 2x2 */}
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
        {/* Scrollable tab bar on mobile */}
        <div className="overflow-x-auto -mx-4 md:mx-0 px-4 md:px-0">
          <div className="flex items-center gap-2 border-b border-[#EBEBEB] pb-4 min-w-max">
            {(["Winding", "Spray"] as TabType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
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

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <TableToolbar
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            onExport={() => {
              const exportData = currentData.map((row: any) => ({
                ...(activeTab === "Winding" ? {
                  "WD ID": row.wdId ?? "",
                  "Linked PM ID": row.linkedPmId ?? "",
                  "Film Width": row.filmWidth ?? "",
                  "Winding Tension": row.windingTension ?? "",
                  "Turns Count": row.turnsCount ?? "",
                  "Quantity Wound": row.quantityWound ?? "",
                  "Stage": row.stage ?? "",
                  "Timestamp": row.timestamp ?? "",
                } : {
                  "SP ID": row.spId ?? "",
                  "Linked WD ID": row.linkedWdId ?? "",
                  "Spray Type": row.sprayType ?? "",
                  "Feed Rate": row.feedRate ?? "",
                  "Pressure Setting": row.pressureSitting ?? "",
                  "Stage": row.stage ?? "",
                  "Timestamp": row.timestamp ?? "",
                })
              }));
              exportToExcel(exportData, `workorder-detail-${activeTab.toLowerCase().replace(/\s+/g, "-")}`, activeTab);
            }}
          />

          <button
            onClick={openModal}
            className="flex items-center justify-center gap-2 bg-[#00B6E2] text-white text-[14px] font-medium rounded-[6px] h-[40px] px-[18px] hover:bg-[#0092b5] transition-colors shrink-0 w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 shrink-0" strokeWidth={2.5} />
            <span className="leading-tight truncate">
              {activeTab === "Winding" ? "Add Winding" : "Add Spray"}
            </span>
          </button>
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
                      if (String(col.key) === "options") {
                        const isWD = activeTab === "Winding";
                        const rowId = isWD ? (row as any).wdId : (row as any).spId;
                        const qrType = isWD ? "WD" : "SP";
                        const qrDetails: any = isWD
                          ? { wdId: (row as any).wdId ?? "", linkedPmId: (row as any).linkedPmId ?? "", filmWidth: (row as any).filmWidth ?? "", quantityWound: (row as any).quantityWound ?? "", status: (row as any).status ?? "" }
                          : { spId: (row as any).spId ?? "", linkedWdId: (row as any).linkedWdId ?? "", sprayType: (row as any).sprayType ?? "", status: (row as any).status ?? "" };
                        return (
                          <td key={String(col.key)} className="px-4 py-3 whitespace-nowrap">
                            <OptionsDropdown
                              onEdit={() => alert(`Edit ${activeTab} Row ${idx}`)}
                              onDelete={() => alert(`Delete ${activeTab} Row ${idx}`)}
                              onQrCode={() => setQrData({ id: rowId, type: qrType, data: qrDetails })}
                            />
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
                      return (
                        <td key={String(col.key)} className={`px-4 py-4 text-[14px] ${['wdId', 'spId'].includes(String(col.key)) ? 'text-[#00B6E2] font-semibold' : 'text-[#5C5C5C]'} whitespace-nowrap`}>
                          {row[col.key]}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {paginatedData.length === 0 && (
                  <tr>
                    <td colSpan={currentConfig.columns.length} className="px-4 py-8 text-center text-[#5C5C5C] text-[14px]">
                      No {activeTab.toLowerCase()} records found. Add records using the button above.
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
