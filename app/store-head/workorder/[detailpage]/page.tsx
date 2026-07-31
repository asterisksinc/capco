"use client";

import { WO_STATUS_OPTIONS, WO_STAGE_OPTIONS } from "@/lib/constants";
import { StatusBadge } from "@/components/StatusBadge";
import { use, useState, useMemo, useEffect } from "react";
import { Plus, X, ChevronRight, Check, Layers, Ruler, Weight, Package, QrCode, Loader2 } from "lucide-react";
import type { TableConfig } from "@/hooks/useTableControls";
import { TablePagination } from "@/components/table/TablePagination";
import { useTableControls } from "@/hooks/useTableControls";
import { SortableHeader } from "@/components/table/SortableHeader";
import { TableToolbar } from "@/components/table/TableToolbar";
import type { RawMaterialRow } from "@/lib/data";
import { MobileHeader } from "@/components/MobileHeader";
import { QRCodeModal, type QRModalData } from "@/components/QRCodeModal";
import { ScannerInput } from "@/components/ScannerInput";
import { exportToExcel } from "@/lib/exportExcel";
import { workOrderService } from "@/src/services/workOrderService";
import { inventoryService } from "@/src/services/inventoryService";
import { getAccessToken, supabaseConfig, supabaseStorage } from "@/src/services/supabaseClient";

type DetailPageProps = {
  params: Promise<{ detailpage: string }>;
};

async function uploadRawMaterialImage(entityId: string, file: File): Promise<string> {
  const token = getAccessToken();
  const bucket = "production-stage-images";
  const path = `raw-material/${entityId}/${file.name}`;
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

type ModalStep = 1 | 2 | 3;

const rawMaterialConfig: TableConfig<RawMaterialRow> = {
  columns: [
    { key: "rollNo", label: "Roll No", type: "text", sortable: true },
    { key: "netWeight", label: "Net Weight", type: "text", sortable: true },
    { key: "damagedWeight", label: "Damaged Weight", type: "text", sortable: true },
    { key: "usedWeight", label: "Used Weight", type: "text", sortable: true },
    { key: "wastageWeight", label: "Wastage/Left Weight", type: "text", sortable: true },
    { key: "thickness", label: "Micron", type: "text", sortable: true },
    { key: "width", label: "Width (m)", type: "text", sortable: true },
    { key: "temperature", label: "Temperature", type: "text", sortable: true },
    { key: "supplier", label: "Company/Supplier", type: "text", sortable: true },
    { key: "stage", label: "Stage", type: "enum", sortable: false, filter: "dropdown", options: ["Raw Material", "METALLISATION"] },
    { key: "status", label: "Status", type: "enum", sortable: false, filter: "dropdown", options: WO_STATUS_OPTIONS },
    { key: "options", label: "Action", type: "text", sortable: false },
  ],
};

export default function StoreHeadWorkOrderDetailPage({ params }: DetailPageProps) {
  const { detailpage } = use(params);
  const orderId = detailpage.toUpperCase();

  const [workOrderFlowData, setWorkOrderFlowData] = useState<any>(null);
  const [availableInventory, setAvailableInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState<ModalStep>(1);
  const [showValidationHint, setShowValidationHint] = useState(false);

  const [selectedInventoryIds, setSelectedInventoryIds] = useState<string[]>([]);
  type CapturedImage = { url: string; name: string; id: string; file: File };
  const [capturedImage, setCapturedImage] = useState<CapturedImage | null>(null);
  const [qrData, setQrData] = useState<QRModalData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [wosData, invData] = await Promise.all([
        workOrderService.getByWorkOrderNo(orderId),
        inventoryService.list({ filters: { status: "In Inventory" } })
      ]);
      setWorkOrderFlowData(wosData);
      setAvailableInventory(invData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [detailpage]);

  const currentData = useMemo(() => {
    if (!workOrderFlowData || !workOrderFlowData.work_order_materials) return [];
    return workOrderFlowData.work_order_materials.map((m: any) => {
      const inv = m.inventory || {};
      
      const wastage = (workOrderFlowData?.metallisation as any[])
        ?.filter(met => met.raw_material_id === inv.id)
        .reduce((sum, met) => sum + (met.factory_wastage_kg || 0), 0) || 0;
        
      return {
        rollNo: inv.raw_material_code || inv.roll_no || "-",
        netWeight: inv.net_weight_kg ? `${inv.net_weight_kg}kgs` : "-",
        damagedWeight: "-",
        usedWeight: m.quantity_kg ? `${m.quantity_kg}kgs` : "-",
        wastageWeight: wastage ? `${wastage}kgs` : "0kgs",
        thickness: inv.micron || "-",
        width: inv.width_m || "-",
        temperature: inv.temperature_c || "-",
        supplier: inv.supplier || "-",
        stage: "Raw Material",
        status: m.status || "Issued"
      };
    });
  }, [workOrderFlowData]);

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
  } = useTableControls({ data: currentData, config: rawMaterialConfig });

  const filteredInventory = useMemo(() => {
    if (!workOrderFlowData) return availableInventory;
    const woMicron = workOrderFlowData.micron?.toString();
    const woWidth = workOrderFlowData.width_m?.toString();

    return availableInventory.filter(item => {
      const itemMicron = item.micron?.toString();
      const itemWidth = item.width_m?.toString();

      const matchMicron = woMicron ? itemMicron === woMicron : true;
      const matchWidth = woWidth ? itemWidth === woWidth : true;

      return matchMicron && matchWidth;
    }).sort((a: any, b: any) => {
      const aReturned = a.status === "Returned" ? 1 : 0;
      const bReturned = b.status === "Returned" ? 1 : 0;
      if (aReturned !== bReturned) {
        return bReturned - aReturned; // Returned goes to top
      }
      // FIFO order (oldest first)
      return new Date(a.date_received || a.created_at).getTime() - new Date(b.date_received || b.created_at).getTime();
    });
  }, [availableInventory, workOrderFlowData]);

  if (loading) return <div className="p-6 text-center text-[#5C5C5C]">Loading details...</div>;
  if (!workOrderFlowData) return <div className="p-6 text-center text-[#5C5C5C]">Work order not found</div>;

  const resetModalState = () => {
    setModalStep(1);
    setShowValidationHint(false);
    setCapturedImage(null);
    setSelectedInventoryIds([]);
  };

  const openModal = () => {
    resetModalState();
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    resetModalState();
  };

  const isStepOneValid = selectedInventoryIds.length > 0;

  const toggleInventorySelection = (id: string) => {
    setSelectedInventoryIds((prev) => {
      const index = filteredInventory.findIndex((i) => i.id === id);
      if (index === -1) return prev;

      if (prev.includes(id)) {
        // Deselecting: Keep only the ones before this index
        const idsToKeep = filteredInventory.slice(0, index).map(i => i.id);
        return prev.filter(i => idsToKeep.includes(i));
      } else {
        // Selecting: Add to selection
        return [...prev, id];
      }
    });
  };

  const submitCurrentStage = async () => {
    if (!isStepOneValid) {
      setShowValidationHint(true);
      return;
    }

    try {
      setIsSubmitting(true);
      const quantity_kg_by_inventory_id = selectedInventoryIds.reduce((acc, id) => {
        const inv = availableInventory.find((i: any) => i.id === id);
        acc[id] = inv?.net_weight_kg ?? inv?.weight ?? 0;
        return acc;
      }, {} as Record<string, number>);

      await workOrderService.assignRawMaterials({
        work_order_id: workOrderFlowData.id,
        inventory_ids: selectedInventoryIds,
        assigned_to: workOrderFlowData.assigned_to || "",
        assigned_by: "",
        quantity_kg_by_inventory_id
      });

      await workOrderService.update(workOrderFlowData.id, {
        stage: "Ready for Metallisation",
        status: "In-progress"
      });

      let singleImageUrl: string | undefined = undefined;
      if (capturedImage?.file) {
        try {
          singleImageUrl = await uploadRawMaterialImage(`WO-${workOrderFlowData.id}-QC`, capturedImage.file);
        } catch (err) {
          console.error(`Failed to upload QC image`, err);
          throw err;
        }
      }

      await Promise.all(
        selectedInventoryIds.map(async (id, index) => {
          await inventoryService.update(id, { 
            status: "Being Used",
            ...(singleImageUrl && index === 0 ? { raw_material_image_url: singleImageUrl } : {})
          }).catch(() => { });
        })
      );

      await loadData();
      setIsSubmitting(false);
      setModalStep(3);
    } catch (err: any) {
      setIsSubmitting(false);
      console.error(err);
      alert(`Failed to assign raw materials: ${err.message || "Unknown error"}`);
    }
  };

  const { paginatedData, totalPages, validPage: currentPage } = getPaginatedData(processedData);

  const kpiStats = [
    { label: "Word Count", value: workOrderFlowData.wordCount || "-", icon: Layers },
    { label: "Micron", value: workOrderFlowData.micron || "-", icon: Ruler },
    { label: "Width", value: workOrderFlowData.width_m || "-", icon: Ruler },
    { label: "Quantity", value: workOrderFlowData.quantity || "-", icon: Package },
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
      <div className="flex flex-col gap-3">
        {filteredInventory.length === 0 && (
          <p className="text-[13px] text-[#5C5C5C] text-center py-4">No available inventory items match the Work Order's micron and width.</p>
        )}
        {filteredInventory.map((item, index) => {
          const isSelected = selectedInventoryIds.includes(item.id);
          const isSelectable = index === 0 || selectedInventoryIds.includes(filteredInventory[index - 1].id);
          const displayId = item.raw_material_code || item.roll_no || item.id;
          
          return (
            <label
              key={item.id}
              onClick={(e) => {
                e.preventDefault();
                if (isSelectable) toggleInventorySelection(item.id);
              }}
              className={`flex flex-col gap-3 p-4 rounded-[8px] border transition-colors ${
                isSelectable ? "cursor-pointer" : "cursor-not-allowed opacity-50"
              } ${isSelected
                ? "border-[#00B6E2] bg-[#F4FBFF]"
                : isSelectable 
                  ? "border-[#DDE1E8] bg-white hover:border-[#A7DDEB]" 
                  : "border-[#DDE1E8] bg-[#F9FAFB]"
                }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-[4px] border flex items-center justify-center shrink-0 ${
                  isSelected 
                    ? "bg-[#00B6E2] border-[#00B6E2]" 
                    : isSelectable 
                      ? "border-[#DDE1E8] bg-white" 
                      : "border-[#E5E7EB] bg-[#F3F4F6]"
                }`}>
                  {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                </div>
                <span className="text-[14px] font-semibold text-[#171717]">{displayId}</span>
              </div>
              <div className="flex items-center gap-4 text-[13px] text-[#5C5C5C] pl-8">
                <span>Weight: <span className="font-medium text-[#171717]">{item.net_weight_kg ?? item.weight ?? "-"}kgs</span></span>
                <span className="w-[1px] h-3 bg-[#DDE1E8]"></span>
                <span>Width: <span className="font-medium text-[#171717]">{item.width_m ?? "-"}</span></span>
                <span className="w-[1px] h-3 bg-[#DDE1E8]"></span>
                <span>Micron: <span className="font-medium text-[#171717]">{item.micron ?? "-"}</span></span>
              </div>
            </label>
          );
        })}
      </div>
    );
  };

  const renderReviewCards = () => {
    const selectedItems = filteredInventory.filter(i => selectedInventoryIds.includes(i.id));
    return (
      <div className="rounded-[12px] border border-[#78CFFA] bg-[#F4FBFF] p-4 flex flex-col gap-3">
        <p className="text-[14px] font-semibold text-[#171717]">Selected Raw Materials</p>
        <ul className="list-disc pl-5 text-[13px] text-[#49526A] flex flex-col gap-1.5">
          {selectedItems.map((item, idx) => {
            const net = item.net_weight_kg ?? item.weight ?? 0;
            const displayId = item.raw_material_code || item.roll_no || item.id;
            return (
              <li key={`raw-${idx}`}>
                <span className="font-medium text-[#171717]">{displayId}</span>
                <span className="text-[#6B7280]"> (Supplier: {item.supplier || "Unknown"}, Micron: {item.micron || "-"}, Width: {item.width_m || "-"}, Net Wt: {Number(net).toFixed(1)}kg)</span>
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

  const renderModalBody = () => {
    if (modalStep === 1) {
      return (
        <div className="px-6 py-6 flex flex-col gap-5">
          {renderStepOneForm()}
          {showValidationHint && !isStepOneValid && (
            <p className="text-[12px] text-[#D92D20]">Please select at least one material to proceed.</p>
          )}
          <p className="text-[12px] text-[#667085]">Items queued for review: {selectedInventoryIds.length}</p>
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
          <div className="rounded-[12px] border border-[#DDE1E8] bg-white p-2 md:p-4 flex flex-col gap-3">
            {!capturedImage ? (
              <div className="flex items-center justify-between">
                <label className="text-[13px] font-medium text-[#5C5C5C] px-1">QC Image</label>
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
              <div className="flex items-start md:items-center justify-between gap-4 rounded-[8px] ">
                <div className="flex gap-2 flex-col md:flex-row">
                  <img src={capturedImage.url} alt="Preview" className="w-14 h-14 rounded-md border border-[#EBEBEB] object-cover shrink-0" />
                  <div className="flex flex-col gap-1">
                    <p className="text-[12px] md:text-[14px] font-semibold text-[#171717]">{capturedImage.name}</p>
                    <p className="text-[10px] md:text-[12px] text-[#6B7280]">ID: {capturedImage.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => setCapturedImage(null)}
                  className="text-[#5C5C5C] hover:text-[#171717] min-h-full transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
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
          <p className="text-[10px] lg:text-[15px] text-[#667085] max-w-[460px]">We are reviewing this entry and notifying the next stage once processing is complete.</p>
        </div>
      </div>
    );
  };

  return (
    <div className="font-dm-sans min-h-[calc(100vh-72px)] bg-white flex flex-col relative w-full lg:max-w-none pb-12 overflow-x-hidden">
      <MobileHeader title="Work Order Detail" />

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#171717]/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-[16px] w-full max-w-[860px] shadow-lg flex flex-col overflow-hidden">
            <div className="flex items-start justify-between px-6 py-5 border-b border-[#EBEBEB]">
              <div className="flex flex-col gap-1">
                <h2 className="text-[18px] md:text-[28px] leading-tight font-semibold text-[#171717]">Add Raw Material Details</h2>
                <p className="text-[11px] md:text-[15px] text-[#5C5C5C]">Capture the raw material details for work order {orderId}</p>
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

      {/* KPI Stats - Mobile 2x2 grid */}
      <section className="grid grid-cols-2 gap-0 md:hidden mx-4 mt-[72px] bg-white border border-[#EBEBEB] rounded-[12px]">
        {kpiStats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className={`p-3 ${i % 2 === 0 ? 'border-r border-b border-[#EBEBEB]' : 'border-b border-[#EBEBEB]'} ${i >= 2 ? 'border-b-0' : ''}`}>
              <div className="flex items-start gap-2">
                <div className="w-8 h-8 rounded-full bg-[#E6F8FD] flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-[#00B6E2]" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <p className="text-[11px] font-medium text-[#5C5C5C]">{stat.label}</p>
                  <span className="text-[16px] font-semibold text-[#171717]">{stat.value}</span>
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* Additional detail info - Mobile */}
      <section className="md:hidden mx-4 mt-3 mb-2 flex flex-wrap gap-2">
        {[
          { label: "Stage", value: workOrderFlowData.stage || "Raw Material" },
          { label: "Date", value: workOrderFlowData.created_at ? new Date(workOrderFlowData.created_at).toLocaleDateString("en-GB") : "-" },
          { label: "Status", value: workOrderFlowData.status || "Yet to Start" },
        ].map((field, idx) => (
          <div key={idx} className="flex items-center gap-1.5 bg-[#F5F7FA] rounded-[8px] px-3 py-1.5">
            <span className="text-[11px] text-[#5C5C5C]">{field.label}:</span>
            <span className="text-[12px] font-semibold text-[#171717]">
              {field.label === "Status" ? <StatusBadge status={field.value} /> : field.value}
            </span>
          </div>
        ))}
      </section>

      {/* KPI Stats - Desktop row */}
      <section className="hidden md:flex items-center gap-2 px-4 md:px-6 pt-6 mb-2">
        <span className="text-[14px] font-medium text-[#5C5C5C] leading-tight">Work Orders</span>
        <ChevronRight className="w-4 h-4 text-[#A1A1AA]" />
        <span className="text-[14px] font-medium text-[#00B6E2] leading-tight">{orderId}</span>
      </section>

      <section className="hidden md:grid grid-cols-1 lg:grid-cols-4 mx-4 md:mx-6 bg-white border border-[#EBEBEB] rounded-[12px] items-center p-5">
        {kpiStats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="flex items-center gap-4 px-4 py-2">
              <div className="w-10 h-10 rounded-full bg-[#E6F8FD] flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-[#00B6E2]" />
              </div>
              <div className="flex flex-col gap-[2px]">
                <p className="text-[12px] font-medium text-[#5C5C5C] leading-tight">{stat.label}</p>
                <span className="text-[14px] font-semibold text-[#171717]">{stat.value}</span>
              </div>
              {i < kpiStats.length - 1 && (
                <div className="hidden lg:block w-[1px] h-[37px] bg-[#EAECF0] ml-auto" />
              )}
            </div>
          );
        })}
      </section>

      {/* Additional detail info - Desktop */}
      <section className="hidden md:flex items-center gap-6 px-4 md:px-6 py-4 border-b border-[#EBEBEB] mx-4 md:mx-6">
        <div className="flex items-center gap-2">
          <span className="text-[14px] text-[#5C5C5C]">Stage:</span>
          <span className="text-[14px] font-semibold text-[#171717]">{workOrderFlowData.stage || "Raw Material"}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[14px] text-[#5C5C5C]">Date:</span>
          <span className="text-[14px] font-semibold text-[#171717]">{workOrderFlowData.created_at ? new Date(workOrderFlowData.created_at).toLocaleDateString("en-GB") : "-"}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[14px] text-[#5C5C5C]">Status:</span>
          <StatusBadge status={workOrderFlowData.status || "Yet to Start"} />
        </div>
      </section>

      <section className="w-full px-4 md:px-6 py-6 flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <TableToolbar
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            onExport={() => {
              const exportData = currentData.map((row: any) => ({
                "Roll No": row.rollNo ?? "",
                "Net Weight": row.netWeight ?? row.weight ?? "",
                "Damaged Weight": row.damagedWeight || "0.0kgs",
                "Used Weight": row.usedWeight || row.weight || "-",
                "Wastage/Left Weight": row.wastageWeight || "0.0kgs",
                "Micron": row.thickness ?? "",
                "Width (m)": row.width ?? "",
                "Temperature": row.temperature ?? "",
                "Supplier": row.supplier ?? "",
                "Stage": row.stage ?? "",
                "Status": row.status ?? "",
              }));
              exportToExcel(exportData, "workorder-detail-raw-material", "Raw Material");
            }}
          />

          <button
            onClick={openModal}
            className="flex items-center justify-center gap-2 bg-[#00B6E2] text-white text-[14px] font-medium rounded-[6px] h-[40px] px-4 sm:px-[18px] hover:bg-[#0092b5] transition-colors shrink-0 whitespace-nowrap w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 shrink-0" strokeWidth={2.5} />
            <span className="leading-tight">Add Raw Material</span>
          </button>
        </div>

        <div className="bg-white border border-[#EBEBEB] rounded-[12px] overflow-hidden">
          <div className="overflow-x-auto min-h-[300px]">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-[#F5F7FA] border-b border-[#EBEBEB]">
                  {rawMaterialConfig.columns.map((col) => (
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
                    {rawMaterialConfig.columns.map((col) => {
                      if (String(col.key) === "options") {
                        return (
                          <td key={String(col.key)} className="px-4 py-3 whitespace-nowrap">
                            <button onClick={() => setQrData({ id: (row as any).rollNo, type: "RM", data: { rollNo: (row as any).rollNo ?? "", micron: (row as any).thickness ?? "", width: (row as any).width ?? "", netWeight: (row as any).netWeight.split('k')[0] ?? (row as any).weight.split('k')[0] ?? "", grossWeight: (row as any).usedWeight.split('k')[0] ?? "", supplier: (row as any).supplier ?? "", status: (row as any).status ?? "" } })} className="text-[#5C5C5C] hover:text-[#00B6E2] transition-colors">
                              <QrCode className="w-4 h-4" />
                            </button>
                          </td>
                        );
                      }
                      if (String(col.key) === "status") {
                        return (
                          <td key={String(col.key)} className="px-4 py-4 whitespace-nowrap">
                            <StatusBadge status={String(row[col.key as keyof RawMaterialRow])} />
                          </td>
                        );
                      }

                      const val = row[col.key as keyof RawMaterialRow];
                      let displayVal = val;
                      if (!val) {
                        if (col.key === "usedWeight") displayVal = row.weight || "-";
                        else if (col.key === "damagedWeight") displayVal = "0.0kgs";
                        else if (col.key === "wastageWeight") displayVal = "0.0kgs";
                      }

                      return (
                        <td key={String(col.key)} className={`px-4 py-4 text-[14px] ${col.key === "rollNo" ? "text-[#00B6E2] font-semibold" : "text-[#5C5C5C]"} whitespace-nowrap`}>
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
