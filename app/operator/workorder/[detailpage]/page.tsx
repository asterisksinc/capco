"use client";

import { use, useState } from "react";
import { Search, Plus, X, ChevronRight, Check } from "lucide-react";
import { useStore } from "@/hooks/useStore";

type DetailPageProps = {
  params: Promise<{ detailpage: string }>;
};

type TabType = "Raw Material" | "Metallisation" | "Slitting";
type ModalStep = 1 | 2 | 3;

type RawMaterialForm = {
  rawMaterialId: string;
  micron: string;
  width: string;
  quantity: string;
  supplier: string;
};

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
};

const defaultRawMaterialForm: RawMaterialForm = {
  rawMaterialId: "",
  micron: "4.5",
  width: "1.0",
  quantity: "",
  supplier: "",
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
  grade: "A",
};

function StatusBadge({ status }: { status: string }) {
  if (status === "Yet to Start") {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-[12px] bg-[#FFF0F1] text-[#FB3748] text-[12px] font-medium leading-tight shrink-0">Yet to Start</span>;
  }
  if (status === "In-progress") {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-[12px] bg-[#FFF4ED] text-[#E19242] text-[12px] font-medium leading-tight shrink-0">In-progress</span>;
  }
  if (status === "Completed") {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-[12px] bg-[#E8F8F0] text-[#1CB061] text-[12px] font-medium leading-tight shrink-0">Completed</span>;
  }
  return null;
}

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

function createRawMaterialRow(): RawMaterialForm {
  return {
    ...defaultRawMaterialForm,
    rawMaterialId: generateId("RM"),
  };
}

function createMetallisationRow(defaultRmId: string): MetallisationForm {
  return {
    ...defaultMetallisationForm,
    coilNo: generateId("MC"),
    rmId: defaultRmId,
  };
}

function createSlittingRow(defaultRmId: string): SlittingForm {
  return {
    ...defaultSlittingForm,
    productNo: generateId("PM"),
    associatedRmId: defaultRmId,
  };
}

export default function OperatorWorkOrderDetailPage({ params }: DetailPageProps) {
  const { detailpage } = use(params);
  const orderId = detailpage.toUpperCase();
  const { store, mounted, addFlowRow } = useStore();
  const workOrderFlowData = store.flowDataMap[orderId];

  const [activeTab, setActiveTab] = useState<TabType>("Raw Material");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState<ModalStep>(1);

  const availableRollIds = Array.from(new Set(workOrderFlowData?.rawMaterialRows.map((row) => row.rollNo) ?? []));

  const [rawMaterialRowsInput, setRawMaterialRowsInput] = useState<RawMaterialForm[]>([createRawMaterialRow()]);
  const [metallisationRowsInput, setMetallisationRowsInput] = useState<MetallisationForm[]>([createMetallisationRow("")]);
  const [slittingRowsInput, setSlittingRowsInput] = useState<SlittingForm[]>([createSlittingRow("")]);

  if (!mounted || !workOrderFlowData) return null;

  const resetModalState = () => {
    setModalStep(1);
    setRawMaterialRowsInput([createRawMaterialRow()]);
    setMetallisationRowsInput([createMetallisationRow(availableRollIds[0] ?? "")]);
    setSlittingRowsInput([createSlittingRow(availableRollIds[0] ?? "")]);
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
    if (activeTab === "Raw Material") return rawMaterialRowsInput.length;
    if (activeTab === "Metallisation") return metallisationRowsInput.length;
    return slittingRowsInput.length;
  };

  const addCurrentItemToDraft = () => {
    if (activeTab === "Raw Material") {
      setRawMaterialRowsInput((prev) => [...prev, createRawMaterialRow()]);
      return;
    }
    if (activeTab === "Metallisation") {
      setMetallisationRowsInput((prev) => [...prev, createMetallisationRow(availableRollIds[0] ?? "")]);
      return;
    }
    setSlittingRowsInput((prev) => [...prev, createSlittingRow(availableRollIds[0] ?? "")]);
  };

  const updateRawMaterialRow = (index: number, patch: Partial<RawMaterialForm>) => {
    setRawMaterialRowsInput((prev) => prev.map((row, idx) => (idx === index ? { ...row, ...patch } : row)));
  };

  const updateMetallisationRow = (index: number, patch: Partial<MetallisationForm>) => {
    setMetallisationRowsInput((prev) => prev.map((row, idx) => (idx === index ? { ...row, ...patch } : row)));
  };

  const updateSlittingRow = (index: number, patch: Partial<SlittingForm>) => {
    setSlittingRowsInput((prev) => prev.map((row, idx) => (idx === index ? { ...row, ...patch } : row)));
  };

  const removeCurrentRow = (index: number) => {
    if (activeTab === "Raw Material") {
      if (rawMaterialRowsInput.length === 1) return;
      setRawMaterialRowsInput((prev) => prev.filter((_, idx) => idx !== index));
      return;
    }
    if (activeTab === "Metallisation") {
      if (metallisationRowsInput.length === 1) return;
      setMetallisationRowsInput((prev) => prev.filter((_, idx) => idx !== index));
      return;
    }
    if (slittingRowsInput.length === 1) return;
    setSlittingRowsInput((prev) => prev.filter((_, idx) => idx !== index));
  };

  const submitCurrentStage = () => {
    const date = getDateString();
    const dateTime = getDateTimeString();

    if (activeTab === "Raw Material") {
      const payload = rawMaterialRowsInput;
      payload.forEach((item) => {
        addFlowRow(orderId, "Raw Material", {
          rollNo: item.rawMaterialId || generateId("RM"),
          weight: `${item.quantity || "0"}kgs`,
          thickness: item.micron,
          supplier: item.supplier || "Unknown",
          stage: "METALLISATION",
          status: "Yet to Start",
        });
      });
    }

    if (activeTab === "Metallisation") {
      const payload = metallisationRowsInput;
      payload.forEach((item) => {
        addFlowRow(orderId, "Metallisation", {
          coilNo: item.coilNo || generateId("MC"),
          rmId: item.rmId || "-",
          machineNo: item.machineNo || "M-01",
          weight: `${item.weight || "0"}kgs`,
          opticalDensity: item.opticalDensity,
          resistance: `${item.resistance} Ohms`,
          timestamp: dateTime,
          nextStage: item.nextStage || "SLITTING",
          status: "In-progress",
        });
      });
    }

    if (activeTab === "Slitting") {
      const payload = slittingRowsInput;
      payload.forEach((item) => {
        addFlowRow(orderId, "Slitting", {
          productNo: item.productNo || generateId("PM"),
          rmId: item.associatedRmId || "-",
          weight: `${item.weight || "0"}kgs`,
          thickness: item.micron,
          grade: item.grade,
          timestampAdded: date,
          stage: "Ready for Dispatch",
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
    { label: "Stage", value: workOrderFlowData.overview.stage },
    { label: "Date", value: workOrderFlowData.overview.date },
    { label: "Status", value: <StatusBadge status={workOrderFlowData.overview.status} /> },
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
    if (activeTab === "Raw Material") {
      return (
        <div className="flex flex-col gap-4">
          {rawMaterialRowsInput.map((row, idx) => (
            <div key={`raw-step1-${idx}`} className="rounded-[12px] border border-[#DDE1E8] p-4 bg-white">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[13px] font-semibold text-[#344054]">Item {idx + 1}</p>
                {rawMaterialRowsInput.length > 1 && (
                  <button type="button" onClick={() => removeCurrentRow(idx)} className="text-[12px] text-[#D92D20] hover:underline">Remove</button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-medium text-[#171717]">Raw Material ID</label>
                  <input value={row.rawMaterialId} onChange={(e) => updateRawMaterialRow(idx, { rawMaterialId: e.target.value })} onBlur={(e) => !e.target.value.trim() && updateRawMaterialRow(idx, { rawMaterialId: generateId("RM") })} placeholder="Auto generate or enter RM-ID" className="h-[42px] rounded-[8px] border border-[#DDE1E8] px-3 text-[14px]" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-medium text-[#171717]">Micron</label>
                  <input type="number" step="0.1" value={row.micron} onChange={(e) => updateRawMaterialRow(idx, { micron: e.target.value })} placeholder="Enter micron" className="h-[42px] rounded-[8px] border border-[#DDE1E8] px-3 text-[14px]" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-medium text-[#171717]">Width</label>
                  <input type="number" step="0.1" value={row.width} onChange={(e) => updateRawMaterialRow(idx, { width: e.target.value })} placeholder="Enter width" className="h-[42px] rounded-[8px] border border-[#DDE1E8] px-3 text-[14px]" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-medium text-[#171717]">Quantity</label>
                  <input value={row.quantity} onChange={(e) => updateRawMaterialRow(idx, { quantity: e.target.value })} placeholder="Enter quantity" className="h-[42px] rounded-[8px] border border-[#DDE1E8] px-3 text-[14px]" />
                </div>
                <div className="flex flex-col gap-2 md:col-span-2">
                  <label className="text-[13px] font-medium text-[#171717]">Supplier</label>
                  <input value={row.supplier} onChange={(e) => updateRawMaterialRow(idx, { supplier: e.target.value })} placeholder="Select or enter supplier" className="h-[42px] rounded-[8px] border border-[#DDE1E8] px-3 text-[14px]" />
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

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
                  <input value={row.coilNo} onChange={(e) => updateMetallisationRow(idx, { coilNo: e.target.value })} onBlur={(e) => !e.target.value.trim() && updateMetallisationRow(idx, { coilNo: generateId("MC") })} placeholder="Auto generate or enter coil no" className="h-[42px] rounded-[8px] border border-[#DDE1E8] px-3 text-[14px]" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-medium text-[#171717]">RM ID</label>
                  <select value={row.rmId} onChange={(e) => updateMetallisationRow(idx, { rmId: e.target.value })} className="h-[42px] rounded-[8px] border border-[#DDE1E8] px-3 text-[14px]">
                    {availableRollIds.length === 0 && <option value="">No RM IDs available</option>}
                    {availableRollIds.map((rollId) => (
                      <option key={rollId} value={rollId}>{rollId}</option>
                    ))}
                  </select>
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
                <input value={row.productNo} onChange={(e) => updateSlittingRow(idx, { productNo: e.target.value })} onBlur={(e) => !e.target.value.trim() && updateSlittingRow(idx, { productNo: generateId("PM") })} placeholder="Auto generate PM-ID" className="h-[42px] rounded-[8px] border border-[#DDE1E8] px-3 text-[14px]" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-medium text-[#171717]">Associated RM ID</label>
                <select value={row.associatedRmId} onChange={(e) => updateSlittingRow(idx, { associatedRmId: e.target.value })} className="h-[42px] rounded-[8px] border border-[#DDE1E8] px-3 text-[14px]">
                  {availableRollIds.length === 0 && <option value="">No roll IDs available</option>}
                  {availableRollIds.map((rollId) => (
                    <option key={rollId} value={rollId}>{rollId}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-medium text-[#171717]">Micron</label>
                  <input type="number" step="0.1" value={row.micron} onChange={(e) => updateSlittingRow(idx, { micron: e.target.value })} placeholder="Enter micron" className="h-[42px] rounded-[8px] border border-[#DDE1E8] px-3 text-[14px]" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-medium text-[#171717]">Width</label>
                  <input type="number" step="0.1" value={row.width} onChange={(e) => updateSlittingRow(idx, { width: e.target.value })} placeholder="Enter width" className="h-[42px] rounded-[8px] border border-[#DDE1E8] px-3 text-[14px]" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-medium text-[#171717]">Weight</label>
                <input value={row.weight} onChange={(e) => updateSlittingRow(idx, { weight: e.target.value })} placeholder="Enter weight" className="h-[42px] rounded-[8px] border border-[#DDE1E8] px-3 text-[14px]" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-medium text-[#171717]">Grade</label>
                <select value={row.grade} onChange={(e) => updateSlittingRow(idx, { grade: e.target.value })} className="h-[42px] rounded-[8px] border border-[#DDE1E8] px-3 text-[14px]">
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                </select>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderReviewCards = () => {
    if (activeTab === "Raw Material") {
      const rows = rawMaterialRowsInput;
      return rows.map((item, idx) => (
        <div key={`raw-${idx}`} className="rounded-[12px] border border-[#78CFFA] bg-[#F4FBFF] p-4 grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-6 text-[14px] text-[#49526A]">
          <p>Raw Material ID: {item.rawMaterialId || "Auto"}</p>
          <p>Supplier: {item.supplier || "Unknown"}</p>
          <p>Micron: {item.micron}</p>
          <p>Width: {item.width}</p>
          <p>Quantity: {item.quantity || "0"}</p>
          <p>Stage: Metallisation</p>
        </div>
      ));
    }

    if (activeTab === "Metallisation") {
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
    return rows.map((item, idx) => (
      <div key={`slit-${idx}`} className="rounded-[12px] border border-[#78CFFA] bg-[#F4FBFF] p-4 grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-6 text-[14px] text-[#49526A]">
        <p>Product No: {item.productNo || "Auto"}</p>
        <p>Associated RM: {item.associatedRmId || "-"}</p>
        <p>Micron: {item.micron}</p>
        <p>Width: {item.width}</p>
        <p>Weight: {item.weight || "0"} kgs</p>
        <p>Grade: {item.grade}</p>
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

  return (
    <div className="font-dm-sans min-h-[calc(100vh-72px)] bg-white flex flex-col relative w-full lg:max-w-none pb-12">
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
                  <button onClick={() => setModalStep(2)} className="h-[40px] px-5 bg-[#00B6E2] text-white text-[14px] font-medium rounded-[6px] hover:bg-[#0092b5] transition-colors">Next</button>
                </>
              )}

              {modalStep === 2 && (
                <>
                  <button onClick={() => setModalStep(1)} className="h-[40px] px-4 bg-white border border-[#EBEBEB] text-[#171717] text-[14px] font-medium rounded-[6px] hover:bg-gray-50 transition-colors">Back</button>
                  <button onClick={submitCurrentStage} className="h-[40px] px-5 bg-[#00B6E2] text-white text-[14px] font-medium rounded-[6px] hover:bg-[#0092b5] transition-colors">Submit Details</button>
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

      <div className="flex items-center gap-2 px-6 pt-6 mb-2">
        <span className="text-[14px] font-medium text-[#5C5C5C] leading-tight">Work Orders</span>
        <ChevronRight className="w-4 h-4 text-[#A1A1AA]" />
        <span className="text-[14px] font-medium text-[#00B6E2] leading-tight">{orderId}</span>
      </div>

      <section className="w-full px-6 py-6 flex flex-col gap-6 border-b border-[#EBEBEB]">
        <h1 className="text-[18px] font-semibold text-[#171717] leading-tight">Work Orders Overview</h1>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-y-6 gap-x-4">
          {overviewFields.map((field, idx) => (
            <div key={idx} className="flex flex-col gap-[6px]">
              <span className="text-[14px] font-normal text-[#5C5C5C] leading-tight">{field.label}</span>
              <div className="text-[14px] font-semibold text-[#171717] leading-tight flex items-center h-5">
                {field.value}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="w-full px-6 py-6 flex flex-col gap-6">
        <div className="flex items-center gap-2 border-b border-[#EBEBEB] pb-4">
          {["Raw Material", "Metallisation", "Slitting"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as TabType)}
              className={`px-4 py-2 text-[14px] font-medium rounded-[8px] transition-colors ${
                activeTab === tab
                  ? "bg-[#00B6E2] text-white"
                  : "bg-white text-[#5C5C5C] hover:bg-[#F5F7FA]"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative w-full max-w-[400px]">
            <Search className="w-4 h-4 text-[#A1A1AA] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search"
              className="w-full h-[40px] pl-9 pr-4 bg-white border border-[#EBEBEB] rounded-[8px] text-[14px] placeholder:text-[#A1A1AA] focus:outline-none focus:border-[#00B6E2] transition-colors"
            />
          </div>
          <button
            onClick={openModal}
            className="flex items-center justify-center gap-2 bg-[#00B6E2] text-white text-[14px] font-medium rounded-[6px] h-[40px] px-[18px] hover:bg-[#0092b5] transition-colors shrink-0"
          >
            <Plus className="w-4 h-4 shrink-0" strokeWidth={2.5} />
            <span className="leading-tight truncate">
              {activeTab === "Raw Material" && "Add Raw Material"}
              {activeTab === "Metallisation" && "Add Metallisation"}
              {activeTab === "Slitting" && "Add Slitting"}
            </span>
          </button>
        </div>

        <div className="border border-[#EAECF0] rounded-[8px] overflow-x-auto w-full shadow-sm">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-[#F5F7FA] border-b border-[#EBEBEB]">
                {activeTab === "Raw Material" && (
                  <>
                    <th className="px-4 py-[11px] text-[12px] font-medium text-[#171717] uppercase tracking-wider">Roll No</th>
                    <th className="px-4 py-[11px] text-[12px] font-medium text-[#171717] w-[15%] uppercase tracking-wider">Weight</th>
                    <th className="px-4 py-[11px] text-[12px] font-medium text-[#171717] w-[15%] uppercase tracking-wider">Thickness</th>
                    <th className="px-4 py-[11px] text-[12px] font-medium text-[#171717] w-[15%] uppercase tracking-wider">Supplier</th>
                    <th className="px-4 py-[11px] text-[12px] font-medium text-[#171717] w-[15%] uppercase tracking-wider">Stage</th>
                    <th className="px-4 py-[11px] text-[12px] font-medium text-[#171717] w-[15%] uppercase tracking-wider">Status</th>
                  </>
                )}
                {activeTab === "Metallisation" && (
                  <>
                    <th className="px-4 py-[11px] text-[12px] font-medium text-[#171717] uppercase tracking-wider">Coil No.</th>
                    <th className="px-4 py-[11px] text-[12px] font-medium text-[#171717] w-[12%] uppercase tracking-wider">RM ID</th>
                    <th className="px-4 py-[11px] text-[12px] font-medium text-[#171717] w-[15%] uppercase tracking-wider">Machine No.</th>
                    <th className="px-4 py-[11px] text-[12px] font-medium text-[#171717] w-[12%] uppercase tracking-wider">Weight</th>
                    <th className="px-4 py-[11px] text-[12px] font-medium text-[#171717] w-[15%] uppercase tracking-wider">Optical Density</th>
                    <th className="px-4 py-[11px] text-[12px] font-medium text-[#171717] w-[12%] uppercase tracking-wider">Resistance</th>
                    <th className="px-4 py-[11px] text-[12px] font-medium text-[#171717] w-[15%] uppercase tracking-wider">Timestamp</th>
                    <th className="px-4 py-[11px] text-[12px] font-medium text-[#171717] w-[10%] uppercase tracking-wider">Next Stage</th>
                    <th className="px-4 py-[11px] text-[12px] font-medium text-[#171717] w-[10%] uppercase tracking-wider">Status</th>
                  </>
                )}
                {activeTab === "Slitting" && (
                  <>
                    <th className="px-4 py-[11px] text-[12px] font-medium text-[#171717] uppercase tracking-wider">Product No</th>
                    <th className="px-4 py-[11px] text-[12px] font-medium text-[#171717] w-[12%] uppercase tracking-wider">RM ID</th>
                    <th className="px-4 py-[11px] text-[12px] font-medium text-[#171717] w-[15%] uppercase tracking-wider">Weight</th>
                    <th className="px-4 py-[11px] text-[12px] font-medium text-[#171717] w-[15%] uppercase tracking-wider">Thickness</th>
                    <th className="px-4 py-[11px] text-[12px] font-medium text-[#171717] w-[15%] uppercase tracking-wider">Grade</th>
                    <th className="px-4 py-[11px] text-[12px] font-medium text-[#171717] w-[15%] uppercase tracking-wider">Timestamp Added</th>
                    <th className="px-4 py-[11px] text-[12px] font-medium text-[#171717] w-[15%] uppercase tracking-wider">Stage</th>
                    <th className="px-4 py-[11px] text-[12px] font-medium text-[#171717] w-[10%] uppercase tracking-wider">Status</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAECF0]">
              {activeTab === "Raw Material" && workOrderFlowData.rawMaterialRows.map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-50/50 transition-colors bg-white">
                  <td className="px-4 py-4 text-[14px] text-[#00B6E2] font-semibold">{row.rollNo}</td>
                  <td className="px-4 py-4 text-[14px] text-[#5C5C5C]">{row.weight}</td>
                  <td className="px-4 py-4 text-[14px] text-[#5C5C5C]">{row.thickness}</td>
                  <td className="px-4 py-4 text-[14px] text-[#5C5C5C]">{row.supplier}</td>
                  <td className="px-4 py-4 text-[14px] text-[#5C5C5C]">{row.stage}</td>
                  <td className="px-4 py-4"><StatusBadge status={row.status} /></td>
                </tr>
              ))}
              {activeTab === "Metallisation" && workOrderFlowData.metallisationRows.map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-50/50 transition-colors bg-white">
                  <td className="px-4 py-4 text-[14px] text-[#00B6E2] font-semibold">{row.coilNo}</td>
                  <td className="px-4 py-4 text-[14px] text-[#5C5C5C]">{row.rmId}</td>
                  <td className="px-4 py-4 text-[14px] text-[#5C5C5C]">{row.machineNo}</td>
                  <td className="px-4 py-4 text-[14px] text-[#5C5C5C]">{row.weight}</td>
                  <td className="px-4 py-4 text-[14px] text-[#5C5C5C]">{row.opticalDensity}</td>
                  <td className="px-4 py-4 text-[14px] text-[#5C5C5C]">{row.resistance}</td>
                  <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.timestamp}</td>
                  <td className="px-4 py-4 text-[14px] text-[#5C5C5C]">{row.nextStage}</td>
                  <td className="px-4 py-4"><StatusBadge status={row.status} /></td>
                </tr>
              ))}
              {activeTab === "Slitting" && workOrderFlowData.slittingRows.map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-50/50 transition-colors bg-white">
                  <td className="px-4 py-4 text-[14px] text-[#00B6E2] font-semibold">{row.productNo}</td>
                  <td className="px-4 py-4 text-[14px] text-[#5C5C5C]">{row.rmId}</td>
                  <td className="px-4 py-4 text-[14px] text-[#5C5C5C]">{row.weight}</td>
                  <td className="px-4 py-4 text-[14px] text-[#5C5C5C]">{row.thickness}</td>
                  <td className="px-4 py-4 text-[14px] text-[#5C5C5C]">{row.grade}</td>
                  <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.timestampAdded}</td>
                  <td className="px-4 py-4 text-[14px] text-[#5C5C5C]">{row.stage}</td>
                  <td className="px-4 py-4"><StatusBadge status={row.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}