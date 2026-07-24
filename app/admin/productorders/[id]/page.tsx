"use client";

import { use, useState, useEffect, useMemo } from "react";
import { ChevronRight, QrCode, Loader2 } from "lucide-react";
import { productOrderService } from "@/src/services/productOrderService";
import { workOrderService } from "@/src/services/workOrderService";
import { MobileHeader } from "@/components/MobileHeader";
import type { TableConfig } from "@/hooks/useTableControls";
import { TablePagination } from "@/components/table/TablePagination";
import { useTableControls } from "@/hooks/useTableControls";
import { SortableHeader } from "@/components/table/SortableHeader";
import { TableToolbar } from "@/components/table/TableToolbar";
import { QRCodeModal, type QRModalData } from "@/components/QRCodeModal";
import { exportToExcel } from "@/lib/exportExcel";

type DetailPageProps = {
  params: Promise<{ id: string }>;
};

type TabType = "Product Material" | "Metallisation" | "Slitting" | "Winding" | "Spray";

function StatusBadge({ status }: { status: string }) {
  if (status === "Yet to Start") return <span className="inline-flex items-center px-2 py-0.5 rounded-[12px] bg-[#FFF0F1] text-[#FB3748] text-[12px] font-medium leading-tight shrink-0">Yet to Start</span>;
  if (status === "In-progress") return <span className="inline-flex items-center px-2 py-0.5 rounded-[12px] bg-[#FFF4ED] text-[#E19242] text-[12px] font-medium leading-tight shrink-0">In-progress</span>;
  if (status === "Completed") return <span className="inline-flex items-center px-2 py-0.5 rounded-[12px] bg-[#E8F8F0] text-[#1CB061] text-[12px] font-medium leading-tight shrink-0">Completed</span>;
  return <span className="inline-flex items-center px-2 py-0.5 rounded-[12px] bg-gray-100 text-gray-600 text-[12px] font-medium leading-tight shrink-0">{status}</span>;
}

const productMaterialConfig: TableConfig<any> = {
  columns: [
    { key: "stockId", label: "PM-ID", type: "text", sortable: true },
    { key: "linkedWoId", label: "Linked WO ID", type: "text", sortable: true },
    { key: "weight", label: "Weight", type: "text", sortable: true },
    { key: "width", label: "Width", type: "text", sortable: true },
    { key: "micron", label: "Micron", type: "text", sortable: true },
    { key: "grade", label: "Grade", type: "text", sortable: true },
    { key: "timestamp", label: "Assigned At", type: "text", sortable: true },
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
    { key: "options", label: "Action", type: "text", sortable: false }
  ]
};

const slittingConfig: TableConfig<any> = {
  columns: [
    { key: "productNo", label: "PM-ID", type: "text", sortable: true },
    { key: "rmId", label: "RM ID", type: "text", sortable: true },
    { key: "weight", label: "Weight", type: "text", sortable: true },
    { key: "thickness", label: "Thickness", type: "text", sortable: true },
    { key: "grade", label: "Grade", type: "text", sortable: true },
    { key: "stage", label: "Stage", type: "text", sortable: true },
    { key: "timestampAdded", label: "Timestamp", type: "text", sortable: true },
    { key: "status", label: "Status", type: "text", sortable: true },
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
    { key: "timestamp", label: "Timestamp", type: "text", sortable: true },
    { key: "options", label: "Action", type: "text", sortable: false }
  ]
};

export default function AdminProductOrderDetailPage({ params }: DetailPageProps) {
  const { id } = use(params);
  const displayId = id.toUpperCase();

  const [poData, setPoData] = useState<any>(null);
  const [woDataMap, setWoDataMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("Product Material");
  const [qrData, setQrData] = useState<QRModalData | null>(null);

  useEffect(() => {
    async function fetchPO() {
      try {
        const all = await productOrderService.list();
        const match = (all as any[]).find((p) => p.product_order_no === displayId || p.id === displayId);
        if (match) {
          const data: any = await productOrderService.getById(match.id);
          setPoData(data);
          
          const woIds = new Set(
            ((data.product_order_materials as any[]) || [])
              .map(m => m.stock?.work_order_id)
              .filter(Boolean)
          );
          
          const map: Record<string, any> = {};
          for (const woId of Array.from(woIds)) {
            const woInfo = await workOrderService.getById(woId as string);
            map[woId as string] = woInfo;
          }
          setWoDataMap(map);
        }
      } catch (err) {
        console.error("Failed to load product order:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchPO();
  }, [displayId]);

  const stockData = useMemo(() => {
    return ((poData?.product_order_materials as any[]) || []).map((m) => {
      const s = m.stock || {};
      return {
        stockId: s.stock_no || "-",
        linkedWoId: s.work_order_id || "-",
        weight: s.weight_kg != null ? `${s.weight_kg}kgs` : "-",
        width: s.width_m != null ? `${s.width_m}m` : "-",
        micron: s.micron != null ? `${s.micron}μ` : "-",
        grade: s.grade || "-",
        timestamp: m.created_at ? new Date(m.created_at).toLocaleDateString("en-GB") : "-",
      };
    });
  }, [poData]);

  const metallisationData = useMemo(() => {
    const rows: any[] = [];
    Object.values(woDataMap).forEach((wo) => {
      (wo.metallisation || []).forEach((m: any) => {
        rows.push({
          coilNo: m.metallisation_no || "-",
          rmId: m.inventory?.roll_no || "-",
          // machineNo: m.machine_no || "-",
          weight: m.weight_kg != null ? `${m.weight_kg}kgs` : "-",
          factoryWastageWeight: m.factory_wastage_kg != null ? `${m.factory_wastage_kg}kgs` : "-",
          // opticalDensity: m.optical_density || "-",
          // resistance: m.resistance_ohms != null ? `${m.resistance_ohms} Ohms` : "-",
          timestamp: m.created_at ? new Date(m.created_at).toLocaleDateString("en-GB") : "-",
          nextStage: m.next_stage || "Slitting",
          status: m.status || "-",
        });
      });
    });
    return rows;
  }, [woDataMap]);

  const slittingData = useMemo(() => {
    const rows: any[] = [];
    Object.values(woDataMap).forEach((wo) => {
      (wo.slitting || []).forEach((s: any) => {
        rows.push({
          productNo: s.product_no || "-",
          rmId: s.metallisation?.metallisation_no || "-",
          weight: s.weight_kg != null ? `${s.weight_kg}kgs` : "-",
          thickness: s.thickness_micron != null ? `${s.thickness_micron}μ` : "-",
          grade: s.grade || "-",
          stage: s.stage || "-",
          timestampAdded: s.created_at ? new Date(s.created_at).toLocaleDateString("en-GB") : "-",
          status: s.status || "-",
        });
      });
    });
    return rows;
  }, [woDataMap]);

  const windingData = useMemo(() => {
    return ((poData?.winding as any[]) || []).map((w) => ({
      wdId: w.winding_no || "-",
      linkedPmId: w.stock?.stock_no || "-",
      filmWidth: w.film_width || "-",
      windingTension: w.winding_tension || "-",
      turnsCount: w.turns_count || "-",
      quantityWound: w.quantity_wound_kg != null ? `${w.quantity_wound_kg}kgs` : "-",
      stage: w.stage || "-",
      timestamp: w.created_at ? new Date(w.created_at).toLocaleDateString("en-GB") : "-",
    }));
  }, [poData]);

  const sprayData = useMemo(() => {
    return ((poData?.spray as any[]) || []).map((sp) => ({
      spId: sp.spray_no || "-",
      linkedWdId: sp.winding?.winding_no || "-",
      sprayType: sp.spray_type || "-",
      feedRate: sp.feed_rate || "-",
      pressureSitting: sp.pressure_sitting || "-",
      stage: sp.stage || "-",
      timestamp: sp.created_at ? new Date(sp.created_at).toLocaleDateString("en-GB") : "-",
    }));
  }, [poData]);

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

  const { paginatedData, totalPages, validPage: currentPage } = getPaginatedData(processedData);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-72px)] bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-[#00B6E2]" />
      </div>
    );
  }

  if (!poData) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-72px)] bg-white">
        <p className="text-[#5C5C5C]">Product order not found.</p>
      </div>
    );
  }

  return (
    <div className="font-dm-sans min-h-[calc(100vh-72px)] bg-[#FAFAFA] flex flex-col relative pb-10 overflow-x-hidden">
      <MobileHeader title={poData?.product_code ?? displayId} />

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
              {poData ? `${poData.product_code} — ${poData.grade} Grade` : displayId}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="bg-[#E6F8FD] text-[#00B6E2] text-[12px] font-medium px-3 py-[6px] rounded-[24px]">{poData?.grade ?? "-"} Grade</span>
            <StatusBadge status={poData?.status ?? "Yet to Start"} />
          </div>
        </div>
      </section>

      {/* Detail grid */}
      <section className="bg-white mx-4 md:mx-6 mt-6 border border-[#EBEBEB] rounded-[12px] p-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-[12px] text-[#5C5C5C]">Product Code</span>
          <span className="text-[14px] font-medium text-[#171717]">{poData.product_code || "-"}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[12px] text-[#5C5C5C]">Capacitor Type</span>
          <span className="text-[14px] font-medium text-[#171717]">{poData.capacitor_type || "-"}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[12px] text-[#5C5C5C]">Grade</span>
          <span className="text-[14px] font-medium text-[#171717]">{poData.grade || "-"}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[12px] text-[#5C5C5C]">Batch Size</span>
          <span className="text-[14px] font-medium text-[#171717]">{poData.batch_size || poData.quantity || "-"}</span>
        </div>
      </section>

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
              const exportData = currentData.map((row: any) => ({ ...row }));
              exportToExcel(exportData, `productorder-detail-${activeTab.toLowerCase().replace(/\s+/g, "-")}`, activeTab);
            }} />
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
                      if (String(col.key) === "options") {
                        const qrId = (row as any).stockId || (row as any).coilNo || (row as any).productNo || (row as any).wdId || (row as any).spId;
                        return (
                          <td key={String(col.key)} className="px-5 py-3 whitespace-nowrap">
                            <button
                              onClick={() => setQrData({ id: qrId, type: "STAGE", data: row as any })}
                              className="inline-flex items-center justify-center w-8 h-8 rounded-full hover:bg-[#F5F7FA] transition-colors text-[#5C5C5C] hover:text-[#00B6E2]"
                              title="Show QR Code"
                            >
                              <QrCode className="w-4 h-4" />
                            </button>
                          </td>
                        );
                      }
                      if (String(col.key) === "status") {
                        return (
                          <td key={String(col.key)} className="px-5 py-4 whitespace-nowrap">
                            <StatusBadge status={(row as any)[col.key]} />
                          </td>
                        );
                      }
                      return (
                        <td key={String(col.key)} className="px-5 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">
                          {(row as any)[col.key]}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {paginatedData.length === 0 && (
                  <tr>
                    <td colSpan={currentConfig.columns.length} className="px-5 py-8 text-center text-[#5C5C5C]">
                      No records found
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
