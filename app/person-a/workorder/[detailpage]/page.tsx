"use client";

import { WO_STATUS_OPTIONS, WO_STAGE_OPTIONS } from "@/lib/constants";
import { StatusBadge } from "@/components/StatusBadge";
import { use, useState, useEffect, useMemo } from "react";
import { ChevronRight, QrCode } from "lucide-react";
import { FileText, Ruler, Maximize2, Package, Loader2 } from "lucide-react";
import { workOrderService } from "@/src/services/workOrderService";
import type { TableConfig } from "@/hooks/useTableControls";
import { TablePagination } from "@/components/table/TablePagination";
import { useTableControls } from "@/hooks/useTableControls";
import { SortableHeader } from "@/components/table/SortableHeader";
import { TableToolbar } from "@/components/table/TableToolbar";
import { MobileHeader } from "@/components/MobileHeader";
import { QRCodeModal, type QRModalData } from "@/components/QRCodeModal";
import { exportToExcel } from "@/lib/exportExcel";
import { DocsUploadedModal } from "@/components/DocsUploadedModal";

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



export default function OperatorWorkOrderDetailPage({ params }: DetailPageProps) {
  const { detailpage } = use(params);
  const orderId = detailpage.toUpperCase();

  // ── State (ALL hooks before any conditional return) ───────────────────────
  const [woData, setWoData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("Raw Material");
  const [qrData, setQrData] = useState<QRModalData | null>(null);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);

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
    return ((woData?.metallisation as any[]) || [])
      .slice()
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map((m) => ({
        coilNo: m.metallisation_no || "-",
        rmId: m.inventory?.raw_material_code || m.inventory?.roll_no || "-",
        rmWeight: m.inventory?.net_weight_kg ? `${m.inventory.net_weight_kg}kgs` : (m.inventory?.gross_weight_kg ? `${m.inventory.gross_weight_kg}kgs` : "-"),
        factoryWastageWeight: m.factory_wastage_kg != null ? `${m.factory_wastage_kg}kgs` : "-",
        weight: m.weight_kg != null ? `${m.weight_kg}kgs` : "-",
        timestamp: m.created_at
          ? new Date(m.created_at).toLocaleString("en-GB", {
            day: "2-digit", month: "short", year: "numeric",
            hour: "2-digit", minute: "2-digit", hour12: true,
          })
          : "-",
        nextStage: m.next_stage || "Slitting",
        status: m.status || "-",
      }));
  }, [woData]);

  const slittingRows = useMemo(() => {
    return ((woData?.slitting as any[]) || [])
      .slice()
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map((s) => ({
        productNo: s.product_no || "-",
        rmId: s.metallisation?.metallisation_no || "-",
        weight: s.weight_kg != null ? `${s.weight_kg}kgs` : "-",
        thickness: s.thickness_micron || "-",
        grade: s.grade || "-",
        timestampAdded: s.created_at
          ? new Date(s.created_at).toLocaleString("en-GB", {
            day: "2-digit", month: "short", year: "numeric",
            hour: "2-digit", minute: "2-digit", hour12: true,
          })
          : "-",
        stage: s.stage || "-",
        status: s.status || "-",
      }));
  }, [woData]);



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



  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="font-dm-sans min-h-[calc(100vh-72px)] bg-white flex flex-col relative pb-12 overflow-x-hidden">
      <MobileHeader title={woData.work_order_no} />

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
        <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
          {/* Scrollable tab bar */}
          <div className="overflow-x-auto -mx-4 md:mx-0 px-4 md:px-0 order-2 lg:order-1">
            <div className="flex items-center gap-2 min-w-max">
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

          <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full md:w-auto gap-4 order-1 lg:order-2">
            {(activeTab === "Metallisation" || activeTab === "Slitting") && (
              <button
                onClick={() => setIsDocModalOpen(true)}
                className="flex items-center justify-center gap-2 bg-white border border-[#DDE1E8] text-[#171717] text-[13px] font-medium rounded-[8px] h-[36px] px-4 hover:bg-[#F5F7FA] transition-colors self-start sm:self-auto whitespace-nowrap"
              >
                <FileText className="w-4 h-4 text-gray-600" />
                Docs Uploaded
              </button>
            )}
            <TableToolbar
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              onExport={() => {
                const exportData = currentData.map((row: any) => ({
                  ...(activeTab === "Raw Material"
                    ? { "Roll No": row.rollNo ?? "", "Net Weight": row.netWeight ?? "", "Gross Weight": row.grossWeight ?? "", "Micron": row.thickness ?? "", "Width (m)": row.width ?? "", "Temperature": row.temperature ?? "", "Supplier": row.supplier ?? "", "Stage": row.stage ?? "", "Status": row.status ?? "" }
                    : activeTab === "Metallisation"
                      ? { "Coil No": row.coilNo ?? "", "RM ID": row.rmId ?? "", "RM Weight": row.rmWeight ?? "", "Factory Wastage": row.factoryWastageWeight ?? "", "Metallisation Weight": row.weight ?? "", "Timestamp": row.timestamp ?? "", "Next Stage": row.nextStage ?? "", "Status": row.status ?? "" }
                      : { "Product No": row.productNo ?? "", "RM ID": row.rmId ?? "", "Weight": row.weight ?? "", "Thickness": row.thickness ?? "", "Grade": row.grade ?? "", "Timestamp": row.timestampAdded ?? "", "Stage": row.stage ?? "", "Status": row.status ?? "" }),
                }));
                exportToExcel(exportData, `workorder-detail-${activeTab.toLowerCase().replace(/\s+/g, "-")}`, activeTab);
              }}
            />
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

      <DocsUploadedModal
        isOpen={isDocModalOpen}
        onClose={() => setIsDocModalOpen(false)}
        activeTab={activeTab}
        woData={woData}
      />
    </div>
  );
}
