"use client";

import { use, useState, useMemo } from "react";
import { Plus, X, Check, ChevronRight, QrCode } from "lucide-react";
import { useStore } from "@/hooks/useStore";
import { ScannerInput } from "@/components/ScannerInput";
import { MobileHeader } from "@/components/MobileHeader";
import type { TableConfig } from "@/hooks/useTableControls";
import { TablePagination } from "@/components/table/TablePagination";
import { useTableControls } from "@/hooks/useTableControls";
import { SortableHeader } from "@/components/table/SortableHeader";
import { TableToolbar } from "@/components/table/TableToolbar";
import { OptionsDropdown } from "@/components/table/OptionsDropdown";
import { QRCodeModal, type QRModalData } from "@/components/QRCodeModal";
import { exportToExcel } from "@/lib/exportExcel";

type DetailPageProps = {
  params: Promise<{ detailpage: string }>;
};

type TabType = "Product Material" | "Metallisation" | "Slitting" | "Winding" | "Spray";
type ModalStep = 1 | 2;

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

const productMaterialConfig: TableConfig<any> = {
  columns: [
    { key: "stockId", label: "PM-ID", type: "text", sortable: true },
    { key: "linkedWoId", label: "Linked WO ID", type: "text", sortable: true },
    { key: "weight", label: "Weight", type: "text", sortable: true },
    { key: "width", label: "Width", type: "text", sortable: true },
    { key: "micron", label: "Micron", type: "text", sortable: true },
    { key: "grade", label: "Grade", type: "text", sortable: true },
    { key: "handoverBy", label: "Handover By", type: "text", sortable: true },
    { key: "timestamp", label: "Assigned At", type: "text", sortable: true },
    { key: "qr", label: "QR", type: "text", sortable: false },
    { key: "options", label: "Action", type: "text", sortable: false }
  ]
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
    { key: "timestamp", label: "Timestamp", type: "text", sortable: true },
    { key: "qr", label: "QR", type: "text", sortable: false },
    { key: "options", label: "Action", type: "text", sortable: false }
  ]
};

const metallisationConfig: TableConfig<any> = {
  columns: [
    { key: "coilNo", label: "MC-ID", type: "text", sortable: true },
    { key: "rmId", label: "RM ID", type: "text", sortable: true },
    // { key: "machineNo", label: "Machine No.", type: "text", sortable: true },
    { key: "weight", label: "Weight", type: "text", sortable: true },
    { key: "opticalDensity", label: "Optical Density", type: "text", sortable: true },
    { key: "resistance", label: "Resistance", type: "text", sortable: true },
    { key: "nextStage", label: "Next Stage", type: "text", sortable: true },
    { key: "timestamp", label: "Timestamp", type: "text", sortable: true },
    { key: "status", label: "Status", type: "text", sortable: true },
    { key: "qr", label: "QR", type: "text", sortable: false }
  ]
};

const slittingConfig: TableConfig<any> = {
  columns: [
    { key: "productNo", label: "PM-ID", type: "text", sortable: true },
    { key: "parentMcId", label: "Parent MC-ID", type: "text", sortable: true },
    { key: "rmId", label: "RM ID", type: "text", sortable: true },
    { key: "weight", label: "Weight", type: "text", sortable: true },
    { key: "thickness", label: "Thickness", type: "text", sortable: true },
    { key: "grade", label: "Grade", type: "text", sortable: true },
    { key: "stage", label: "Stage", type: "text", sortable: true },
    { key: "timestampAdded", label: "Timestamp", type: "text", sortable: true },
    { key: "status", label: "Status", type: "text", sortable: true },
    { key: "qr", label: "QR", type: "text", sortable: false }
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
    { key: "timestamp", label: "Timestamp", type: "text", sortable: true },
    { key: "qr", label: "QR", type: "text", sortable: false },
    { key: "options", label: "Action", type: "text", sortable: false }
  ]
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

export default function PersonBProductOrderDetail({ params }: DetailPageProps) {
  const { detailpage } = use(params);
  const displayId = (detailpage || "PO-0001").toUpperCase();
  const { store, mounted, addFlowRow, getAssignedStocks } = useStore();

  const productOrder = store.productOrders.find((po) => po.id.replace("#", "").toUpperCase() === displayId);
  const poId = productOrder?.id ?? displayId;
  const [activeTab, setActiveTab] = useState<TabType>("Product Material");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState<ModalStep>(1);
  const [showValidationHint, setShowValidationHint] = useState(false);

  const [windingForm, setWindingForm] = useState<WindingForm>({
    wdId: generateId("WD"), linkedPmId: "", filmWidth: "7mm", windingTension: "0.5 N", turnsCount: "", quantityWound: ""
  });
  const [sprayForm, setSprayForm] = useState<SprayForm>({
    spId: generateId("SP"), linkedWdId: "", sprayType: "Zinc-spray", feedRate: "", pressureSitting: ""
  });
  const [modalImage, setModalImage] = useState<string | null>(null);
  const [qrData, setQrData] = useState<QRModalData | null>(null);

  const assignedStocks = useMemo(() => getAssignedStocks(poId), [store.assignments, poId, mounted]);

  const pmLookup = useMemo(() => {
    const map = new Map<string, { weight: string; grade: string; micron: string; width: string }>();
    for (const s of assignedStocks) {
      map.set(s.stockId, { weight: s.weight, grade: s.grade, micron: s.micron, width: s.width });
    }
    return map;
  }, [assignedStocks]);

  const wdLookup = useMemo(() => {
    const map = new Map<string, { filmWidth: string; windingTension: string; turnsCount: string; quantityWound: string }>();
    for (const [, flow] of Object.entries(store.flowDataMap)) {
      for (const w of flow.windingRows) {
        map.set(w.wdId, { filmWidth: w.filmWidth, windingTension: w.windingTension, turnsCount: w.turnsCount, quantityWound: w.quantityWound });
      }
    }
    return map;
  }, [store.flowDataMap]);

  const assignedPmIds = useMemo(() => new Set(assignedStocks.map((s) => s.stockId)), [assignedStocks]);

  const linkedWoIds = useMemo(() => {
    return Array.from(new Set(assignedStocks.map((s) => s.linkedWoId).filter(Boolean)));
  }, [assignedStocks]);

  const metallisationData = useMemo(() => {
    if (!mounted) return [];
    const rows: any[] = [];
    for (const woId of linkedWoIds) {
      const flow = store.flowDataMap[woId];
      if (!flow) continue;
      for (const row of flow.metallisationRows) {
        rows.push({ id: row.coilNo, ...row });
      }
    }
    return rows;
  }, [store.flowDataMap, mounted, linkedWoIds]);

  const slittingData = useMemo(() => {
    if (!mounted) return [];
    const rows: any[] = [];
    for (const woId of linkedWoIds) {
      const flow = store.flowDataMap[woId];
      if (!flow) continue;
      for (const row of flow.slittingRows) {
        const parentMc = flow.metallisationRows.find(m => m.rmId === row.rmId);
        rows.push({
          id: row.productNo,
          ...row,
          parentMcId: parentMc ? parentMc.coilNo : "—"
        });
      }
    }
    return rows;
  }, [store.flowDataMap, mounted, linkedWoIds]);

  const stockData = useMemo(() => {
    if (!mounted) return [];
    return assignedStocks.map((s) => ({
      id: s.stockId,
      stockId: s.stockId,
      linkedWoId: s.linkedWoId,
      weight: s.weight,
      width: s.width,
      micron: s.micron,
      grade: s.grade,
      handoverBy: "Person A",
      timestamp: s.assignedAt,
    }));
  }, [assignedStocks, mounted]);

  const windingData = useMemo(() => {
    if (!mounted) return [];
    const rows: any[] = [];
    for (const [, flow] of Object.entries(store.flowDataMap)) {
      for (const wRow of flow.windingRows) {
        if (assignedPmIds.has(wRow.linkedPmId)) {
          rows.push({ id: wRow.wdId, ...wRow });
        }
      }
    }
    return rows;
  }, [store.flowDataMap, mounted, assignedPmIds]);

  const poWdIds = useMemo(() => new Set(windingData.map((r) => r.wdId)), [windingData]);

  const sprayData = useMemo(() => {
    if (!mounted) return [];
    const rows: any[] = [];
    for (const [, flow] of Object.entries(store.flowDataMap)) {
      for (const sRow of flow.sprayRows) {
        if (poWdIds.has(sRow.linkedWdId)) {
          rows.push({ id: sRow.spId, ...sRow });
        }
      }
    }
    return rows;
  }, [store.flowDataMap, mounted, poWdIds]);

  const availablePmIds = Array.from(assignedPmIds);
  const availableWdIds = Array.from(poWdIds);

  const currentConfig = useMemo(() => {
    switch (activeTab) {
      case "Product Material": return productMaterialConfig;
      case "Metallisation": return metallisationConfig;
      case "Slitting": return slittingConfig;
      case "Winding": return windingConfig;
      case "Spray": return sprayConfig;
      default: return productMaterialConfig;
    }
  }, [activeTab]);

  const currentData = useMemo(() => {
    switch (activeTab) {
      case "Product Material": return stockData;
      case "Metallisation": return metallisationData;
      case "Slitting": return slittingData;
      case "Winding": return windingData;
      case "Spray": return sprayData;
      default: return [];
    }
  }, [activeTab, stockData, metallisationData, slittingData, windingData, sprayData]);

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

  const openWindingModal = () => {
    setWindingForm({ wdId: generateId("WD"), linkedPmId: "", filmWidth: "7mm", windingTension: "0.5 N", turnsCount: "", quantityWound: "" });
    setModalStep(1);
    setShowValidationHint(false);
    setIsModalOpen(true);
  };

  const openSprayModal = () => {
    setSprayForm({ spId: generateId("SP"), linkedWdId: "", sprayType: "Zinc-spray", feedRate: "", pressureSitting: "" });
    setModalStep(1);
    setShowValidationHint(false);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalStep(1);
    setShowValidationHint(false);
    setModalImage(null);
  };

  const isWindingValid = () => {
    return Boolean(
      windingForm.linkedPmId.trim() &&
      hasPositiveNumber(windingForm.turnsCount) &&
      hasPositiveNumber(windingForm.quantityWound)
    );
  };

  const isSprayValid = () => {
    return Boolean(
      sprayForm.linkedWdId.trim() &&
      sprayForm.sprayType.trim() &&
      hasPositiveNumber(sprayForm.feedRate) &&
      hasPositiveNumber(sprayForm.pressureSitting)
    );
  };

  const targetWoId = useMemo(() => {
    const fromAssigned = assignedStocks[0]?.linkedWoId;
    if (fromAssigned && store.flowDataMap[fromAssigned]) return fromAssigned;
    return Object.keys(store.flowDataMap)[0] || "WO-PO";
  }, [assignedStocks, store.flowDataMap]);

  const submitWinding = () => {
    if (!isWindingValid()) {
      setShowValidationHint(true);
      return;
    }
    addFlowRow(targetWoId, "Winding", {
      wdId: windingForm.wdId,
      linkedPmId: windingForm.linkedPmId,
      filmWidth: windingForm.filmWidth,
      windingTension: windingForm.windingTension,
      turnsCount: windingForm.turnsCount,
      quantityWound: windingForm.quantityWound,
      stage: "Spray",
      timestamp: getDateTimeString(),
      status: "Completed",
    });
    closeModal();
  };

  const submitSpray = () => {
    if (!isSprayValid()) {
      setShowValidationHint(true);
      return;
    }
    addFlowRow(targetWoId, "Spray", {
      spId: sprayForm.spId,
      linkedWdId: sprayForm.linkedWdId,
      sprayType: sprayForm.sprayType,
      feedRate: sprayForm.feedRate,
      pressureSitting: sprayForm.pressureSitting,
      stage: "Moved to Person C",
      timestamp: getDateTimeString(),
      status: "Completed",
    });
    closeModal();
  };

  if (!mounted) return null;

  const { paginatedData, totalPages, validPage: currentPage } = getPaginatedData(processedData);

  return (
    <div className="font-dm-sans min-h-[calc(100vh-72px)] bg-[#FAFAFA] flex flex-col relative pb-10 overflow-x-hidden">
      <MobileHeader title={productOrder?.code ?? displayId} />

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#171717]/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-[16px] w-full max-w-[700px] shadow-lg flex flex-col overflow-hidden">
            <div className="flex items-start justify-between px-6 py-5 border-b border-[#EBEBEB]">
              <div className="flex flex-col gap-1">
                <h2 className="text-[28px] leading-tight font-semibold text-[#171717]">
                  Add {activeTab === "Winding" ? "Winding" : "Spray"} Record
                </h2>
                <p className="text-[15px] text-[#5C5C5C]">Enter details for {displayId}</p>
              </div>
              <button onClick={closeModal} className="text-[#5C5C5C] hover:text-[#171717] transition-colors p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-6 flex flex-col gap-5">
              {activeTab === "Winding" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-[13px] font-medium text-[#171717]">WD-ID</label>
                    <ScannerInput
                      value={windingForm.wdId}
                      onChange={(e) => setWindingForm({ ...windingForm, wdId: e.target.value })}
                      onScanData={(data) => setWindingForm({ ...windingForm, wdId: data })}
                      placeholder="Scan or enter WD-ID"
                      className="h-[42px] rounded-[8px] border border-[#DDE1E8] pl-[36px] px-3 text-[14px]"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[13px] font-medium text-[#171717]">Linked PM-ID</label>
                    <div className="relative">
                      <ScannerInput
                        type="text"
                        placeholder="Scan or select PM-ID..."
                        list="pmIdList"
                        value={windingForm.linkedPmId}
                        onChange={(e) => {
                          const id = e.target.value;
                          setWindingForm({ ...windingForm, linkedPmId: id });
                        }}
                        onScanData={(data) => {
                          setWindingForm({ ...windingForm, linkedPmId: data });
                        }}
                        className="h-[42px] rounded-[8px] border border-[#DDE1E8] px-3 pl-[36px] text-[14px]"
                      />
                      <datalist id="pmIdList">
                        {availablePmIds.map((id) => <option key={id} value={id}>{id}</option>)}
                      </datalist>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[13px] font-medium text-[#171717]">Film Width</label>
                    <input value={windingForm.filmWidth} onChange={(e) => setWindingForm({ ...windingForm, filmWidth: e.target.value })} className="h-[42px] rounded-[8px] border border-[#DDE1E8] px-3 text-[14px]" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[13px] font-medium text-[#171717]">Winding Tension</label>
                    <input value={windingForm.windingTension} onChange={(e) => setWindingForm({ ...windingForm, windingTension: e.target.value })} className="h-[42px] rounded-[8px] border border-[#DDE1E8] px-3 text-[14px]" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[13px] font-medium text-[#171717]">Turns Count</label>
                    <input type="number" min="1" value={windingForm.turnsCount} onChange={(e) => setWindingForm({ ...windingForm, turnsCount: e.target.value })} placeholder="Enter turns count" className="h-[42px] rounded-[8px] border border-[#DDE1E8] px-3 text-[14px]" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[13px] font-medium text-[#171717]">Quantity Wound</label>
                    <input type="number" min="1" value={windingForm.quantityWound} onChange={(e) => setWindingForm({ ...windingForm, quantityWound: e.target.value })} placeholder="Enter quantity wound" className="h-[42px] rounded-[8px] border border-[#DDE1E8] px-3 text-[14px]" />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-[13px] font-medium text-[#171717]">SP-ID</label>
                    <ScannerInput
                      value={sprayForm.spId}
                      onChange={(e) => setSprayForm({ ...sprayForm, spId: e.target.value })}
                      onScanData={(data) => setSprayForm({ ...sprayForm, spId: data })}
                      placeholder="Scan or enter SP-ID"
                      className="h-[42px] rounded-[8px] border border-[#DDE1E8] pl-[36px] px-3 text-[14px]"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[13px] font-medium text-[#171717]">Linked WD-ID</label>
                    <div className="relative">
                      <ScannerInput
                        type="text"
                        placeholder="Scan or select WD-ID..."
                        list="wdIdList"
                        value={sprayForm.linkedWdId}
                        onChange={(e) => {
                          const id = e.target.value;
                          setSprayForm({ ...sprayForm, linkedWdId: id });
                        }}
                        onScanData={(data) => {
                          setSprayForm({ ...sprayForm, linkedWdId: data });
                        }}
                        className="h-[42px] rounded-[8px] border border-[#DDE1E8] px-3 pl-[36px] text-[14px]"
                      />
                      <datalist id="wdIdList">
                        {availableWdIds.map((id) => <option key={id} value={id}>{id}</option>)}
                      </datalist>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[13px] font-medium text-[#171717]">Spray Type</label>
                    <input value={sprayForm.sprayType} onChange={(e) => setSprayForm({ ...sprayForm, sprayType: e.target.value })} className="h-[42px] rounded-[8px] border border-[#DDE1E8] px-3 text-[14px]" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[13px] font-medium text-[#171717]">Feed Rate</label>
                    <input type="number" min="0" step="0.1" value={sprayForm.feedRate} onChange={(e) => setSprayForm({ ...sprayForm, feedRate: e.target.value })} placeholder="Enter feed rate" className="h-[42px] rounded-[8px] border border-[#DDE1E8] px-3 text-[14px]" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[13px] font-medium text-[#171717]">Pressure Sitting</label>
                    <input type="number" min="0" step="0.1" value={sprayForm.pressureSitting} onChange={(e) => setSprayForm({ ...sprayForm, pressureSitting: e.target.value })} placeholder="Enter pressure sitting" className="h-[42px] rounded-[8px] border border-[#DDE1E8] px-3 text-[14px]" />
                  </div>
                </div>
              )}
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
              {showValidationHint && (
                <p className="text-[12px] text-[#D92D20]">All required fields must be filled.</p>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-5 bg-[#FAFAFA] border-t border-[#EBEBEB]">
              <button onClick={closeModal} className="h-[40px] px-4 bg-white border border-[#EBEBEB] text-[#171717] text-[14px] font-medium rounded-[6px] hover:bg-gray-50 transition-colors">Cancel</button>
              <button
                onClick={activeTab === "Winding" ? submitWinding : submitSpray}
                className="h-[40px] px-5 bg-[#00B6E2] text-white text-[14px] font-medium rounded-[6px] hover:bg-[#0092b5] transition-colors"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header section */}
      <section className="bg-white w-full border-b border-[#EBEBEB] pt-[72px] md:pt-0">
        <div className="w-full px-4 md:px-6 py-5 flex items-center justify-between">
          <div className="flex flex-col gap-2">
            <div className="hidden md:flex items-center gap-2 mb-1">
              <span className="text-[14px] text-[#5C5C5C] leading-tight">Product Orders</span>
              <ChevronRight className="w-4 h-4 text-[#A1A1AA]" />
              <span className="text-[14px] font-medium text-[#00B6E2]">{displayId}</span>
            </div>
            <h1 className="text-[20px] font-semibold text-[#171717] leading-tight">Product Order Details</h1>
            <p className="text-[14px] text-[#5C5C5C] flex items-center gap-2">
              {productOrder ? `${productOrder.code} — ${productOrder.grade} Grade` : displayId}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="bg-[#E6F8FD] text-[#00B6E2] text-[12px] font-medium px-3 py-[6px] rounded-[24px]">{productOrder?.grade ?? "-"} Grade</span>
          </div>
        </div>
      </section>

      {/* Detail grid */}
      {productOrder && (
        <section className="bg-white mx-4 md:mx-6 mt-6 border border-[#EBEBEB] rounded-[12px] p-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-[12px] text-[#5C5C5C]">Product Code</span>
            <span className="text-[14px] font-medium text-[#171717]">{productOrder.code}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[12px] text-[#5C5C5C]">Capacitor Type</span>
            <span className="text-[14px] font-medium text-[#171717]">{productOrder.type}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[12px] text-[#5C5C5C]">Grade</span>
            <span className="text-[14px] font-medium text-[#171717]">{productOrder.grade}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[12px] text-[#5C5C5C]">Batch Size</span>
            <span className="text-[14px] font-medium text-[#171717]">{productOrder.batchSize}</span>
          </div>
        </section>
      )}

      <section className="bg-white mx-4 md:mx-6 mt-6 border border-[#EBEBEB] rounded-[8px]">
        {/* Scrollable tab bar on mobile */}
        <div className="overflow-x-auto px-4 md:px-0">
          <div className="flex gap-2 px-0 md:px-6 pt-5 pb-5 border-b border-[#EBEBEB] min-w-max">
            {(["Product Material", "Metallisation", "Slitting", "Winding", "Spray"] as TabType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-[16px] py-[8px] rounded-[6px] text-[14px] font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab 
                    ? "bg-[#00B6E2] text-white" 
                    : "bg-[#F5F7FA] text-[#5C5C5C] hover:bg-[#e4e7ec]"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 md:px-6 py-6 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <TableToolbar dateRange={dateRange} onDateRangeChange={setDateRange} onExport={() => {
              const exportData = currentData.map((row: any) => ({
                ...(activeTab === "Product Material" ? {
                  "PM-ID": row.stockId ?? "",
                  "Linked WO ID": row.linkedWoId ?? "",
                  "Weight": row.weight ?? "",
                  "Width": row.width ?? "",
                  "Micron": row.micron ?? "",
                  "Grade": row.grade ?? "",
                  "Handover By": row.handoverBy ?? "",
                  "Assigned At": row.timestamp ?? "",
                } : activeTab === "Metallisation" ? {
                  "MC-ID": row.coilNo ?? "",
                  "RM ID": row.rmId ?? "",
                  "Machine No.": row.machineNo ?? "",
                  "Weight": row.weight ?? "",
                  "Optical Density": row.opticalDensity ?? "",
                  "Resistance": row.resistance ?? "",
                  "Next Stage": row.nextStage ?? "",
                  "Timestamp": row.timestamp ?? "",
                  "Status": row.status ?? "",
                } : activeTab === "Slitting" ? {
                  "PM-ID": row.productNo ?? "",
                  "Parent MC-ID": row.parentMcId ?? "",
                  "RM ID": row.rmId ?? "",
                  "Weight": row.weight ?? "",
                  "Thickness": row.thickness ?? "",
                  "Grade": row.grade ?? "",
                  "Stage": row.stage ?? "",
                  "Timestamp": row.timestampAdded ?? "",
                  "Status": row.status ?? "",
                } : activeTab === "Winding" ? {
                  "WD-ID": row.wdId ?? "",
                  "Linked PM-ID": row.linkedPmId ?? "",
                  "Film Width": row.filmWidth ?? "",
                  "Winding Tension": row.windingTension ?? "",
                  "Turns Count": row.turnsCount ?? "",
                  "Quantity Wound": row.quantityWound ?? "",
                  "Stage": row.stage ?? "",
                  "Timestamp": row.timestamp ?? "",
                } : {
                  "SP-ID": row.spId ?? "",
                  "Linked WD-ID": row.linkedWdId ?? "",
                  "Spray Type": row.sprayType ?? "",
                  "Feed Rate": row.feedRate ?? "",
                  "Pressure Sitting": row.pressureSitting ?? "",
                  "Stage": row.stage ?? "",
                  "Timestamp": row.timestamp ?? "",
                })
              }));
              exportToExcel(exportData, `productorder-detail-${activeTab.toLowerCase().replace(/\s+/g, "-")}`, activeTab);
            }} />
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
              {activeTab === "Winding" && (
                <button onClick={openWindingModal} className="h-[40px] px-4 bg-[#00B6E2] hover:bg-[#0092b5] text-white text-[14px] font-medium rounded-[8px] flex items-center justify-center gap-2 whitespace-nowrap transition-colors w-full sm:w-auto">
                   + Winding
                </button>
              )}
              {activeTab === "Spray" && (
                 <button onClick={openSprayModal} className="h-[40px] px-4 bg-[#00B6E2] hover:bg-[#0092b5] text-white text-[14px] font-medium rounded-[8px] flex items-center justify-center gap-2 whitespace-nowrap transition-colors w-full sm:w-auto">
                   + Spray
                 </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto border border-[#EBEBEB] rounded-[8px] mt-2">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-[#F5F7FA] border-b border-[#EBEBEB]">
                  {currentConfig.columns.map((col) => (
                    <th key={String(col.key)} className="px-5 py-[12px]">
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
                {paginatedData.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    {currentConfig.columns.map((col) => {
                      if (String(col.key) === "qr") {
                        const qrRowData: QRModalData = activeTab === "Product Material"
                          ? { id: (row as any).stockId, type: "PM", data: { productNo: (row as any).stockId, weight: (row as any).weight, width: (row as any).width, micron: (row as any).micron, grade: (row as any).grade } }
                          : activeTab === "Metallisation"
                          ? { id: (row as any).coilNo, type: "MC", data: { coilNo: (row as any).coilNo, rmId: (row as any).rmId, machineNo: (row as any).machineNo, weight: (row as any).weight, status: (row as any).status } }
                          : activeTab === "Slitting"
                          ? { id: (row as any).productNo, type: "PM", data: { productNo: (row as any).productNo, parentMcId: (row as any).parentMcId, rmId: (row as any).rmId, weight: (row as any).weight, grade: (row as any).grade, status: (row as any).status } }
                          : activeTab === "Winding"
                          ? { id: (row as any).wdId, type: "WD", data: { windingId: (row as any).wdId, linkedPmId: (row as any).linkedPmId, filmWidth: (row as any).filmWidth, windingTension: (row as any).windingTension, stage: (row as any).stage } }
                          : { id: (row as any).spId, type: "SP", data: { sprayId: (row as any).spId, linkedWdId: (row as any).linkedWdId, sprayType: (row as any).sprayType, stage: (row as any).stage } };
                        return (
                          <td key={String(col.key)} className="px-5 py-3 whitespace-nowrap">
                            <button
                              onClick={() => setQrData(qrRowData)}
                              className="inline-flex items-center justify-center w-8 h-8 rounded-full hover:bg-[#F5F7FA] transition-colors text-[#5C5C5C] hover:text-[#00B6E2]"
                              title="Show QR Code"
                            >
                              <QrCode className="w-4 h-4" />
                            </button>
                          </td>
                        );
                      }
                      if (String(col.key) === "options") {
                        return (
                          <td key={String(col.key)} className="px-5 py-3 whitespace-nowrap">
                            <OptionsDropdown 
                              onEdit={() => alert(`Edit row ${i}`)}
                              onDelete={() => alert(`Delete row ${i}`)}
                            />
                          </td>
                        );
                      }
                      return (
                        <td key={String(col.key)} className="px-5 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">
                          {row[col.key]}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {paginatedData.length === 0 && (
                  <tr>
                    <td colSpan={currentConfig.columns.length} className="px-5 py-8 text-center text-[#5C5C5C]">
                      {activeTab === "Product Material"
                        ? "No stock assigned to this product order yet."
                        : "No records found"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <TablePagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </div>
      </section>
      {qrData && <QRCodeModal {...qrData} onClose={() => setQrData(null)} />}
    </div>
  );
}
