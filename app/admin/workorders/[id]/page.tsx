"use client";

import { WO_STATUS_OPTIONS, WO_STAGE_OPTIONS } from "@/lib/constants";
import { StatusBadge } from "@/components/StatusBadge";
import { use, useState, useEffect, useMemo } from "react";
import { ChevronRight, Layers, Ruler, Package, QrCode, Loader2, FileText, Image as ImageIcon } from "lucide-react";
import { DocsUploadedModal } from "@/components/DocsUploadedModal";
import { RowImagesModal } from "@/components/RowImagesModal";
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

type TabType = "Raw Material" | "Metallisation" | "Slitting";


const rawMaterialConfig: TableConfig<any> = {
  columns: [
    { key: "rollNo", label: "Roll No", type: "text", sortable: true },
    { key: "netWeight", label: "Net Weight", type: "text", sortable: true },
    { key: "grossWeight", label: "Gross Weight", type: "text", sortable: true },
    { key: "thickness", label: "Micron", type: "number", sortable: true },
    { key: "width", label: "Width (m)", type: "text", sortable: true },
    { key: "temperature", label: "Temperature", type: "text", sortable: true },
    { key: "actualWeight", label: "Actual Weight", type: "text", sortable: true },
    { key: "damagedWeight", label: "Damaged Weight", type: "text", sortable: true },
    { key: "usedWeight", label: "Used Weight", type: "text", sortable: true },
    { key: "wastageWeight", label: "Wastage/Left Weight", type: "text", sortable: true },
    { key: "supplier", label: "Company/Supplier", type: "text", sortable: true },
    { key: "stage", label: "Stage", type: "enum", sortable: false, filter: "dropdown", options: ["Raw Material", "METALLISATION"] },
    { key: "status", label: "Status", type: "enum", sortable: false, filter: "dropdown", options: WO_STATUS_OPTIONS },
    { key: "options", label: "Action", type: "text", sortable: false },
  ],
};

const metallisationConfig: TableConfig<any> = {
  columns: [
    { key: "coilNo", label: "Coil No.", type: "text", sortable: true },
    { key: "rmId", label: "RM ID", type: "text", sortable: true },
    // { key: "machineNo", label: "Machine No.", type: "text", sortable: true },
    { key: "rmWeight", label: "RM Weight", type: "number", sortable: true },
    { key: "factoryWastageWeight", label: "Factory Wastage Weight", type: "number", sortable: true },
    { key: "weight", label: "Metallisation Weight", type: "number", sortable: true },
    { key: "timestamp", label: "Timestamp", type: "date", sortable: true },
    { key: "nextStage", label: "Next Stage", type: "text", sortable: false },
    { key: "status", label: "Status", type: "enum", sortable: false, filter: "dropdown", options: WO_STATUS_OPTIONS },
    { key: "options", label: "Action", type: "text", sortable: false },
  ],
};

const slittingConfig: TableConfig<any> = {
  columns: [
    { key: "productNo", label: "Product No", type: "text", sortable: true },
    { key: "rmId", label: "Coil ID", type: "text", sortable: true },
    { key: "weight", label: "Weight", type: "number", sortable: true },
    // { key: "thickness", label: "Thickness (μ)", type: "number", sortable: true },
    { key: "grade", label: "Grade", type: "text", sortable: true },
    { key: "timestampAdded", label: "Timestamp Added", type: "date", sortable: true },
    { key: "stage", label: "Stage", type: "enum", sortable: false, filter: "dropdown", options: ["Slitting", "Completed"] },
    { key: "status", label: "Status", type: "enum", sortable: false, filter: "dropdown", options: WO_STATUS_OPTIONS },
    { key: "options", label: "Action", type: "text", sortable: false },
  ],
};

export default function AdminWorkOrderDetailPage({ params }: DetailPageProps) {
  const { id } = use(params);
  const orderId = id.toUpperCase();

  const [woData, setWoData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("Raw Material");
  const [qrData, setQrData] = useState<QRModalData | null>(null);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [rowImagesData, setRowImagesData] = useState<any>(null);

  useEffect(() => {
    async function fetchWO() {
      try {
        const data: any = await workOrderService.getByWorkOrderNo(orderId);
        if (data) {
          setWoData(data);
        }
      } catch (err) {
        console.error("Failed to load work order:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchWO();
  }, [orderId]);

  const rawMaterialRows = useMemo(() => {
    return ((woData?.work_order_materials as any[]) || []).map((wom) => {
      console.log(wom);
      const inv = wom.inventory || {};
      const actual = wom.quantity_kg ?? 0;

      const wastage = (woData?.metallisation as any[])
        ?.filter(m => m.raw_material_id === inv.id)
        .reduce((sum, m) => sum + (m.factory_wastage_kg || 0), 0) || 0;

      return {
        rollNo: inv.raw_material_code || inv.roll_no || "-",
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
        stage: inv.stage || "-",
        status: inv.status || "-",
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
        factory_wastage_image_url: m.factory_wastage_image_url,
        photo_url: m.photo_url,
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

  const { paginatedData, totalPages, validPage: currentPage } = getPaginatedData(processedData);

  const kpiStats = [
    { label: "Work Order", value: woData.work_order_no, icon: Layers },
    { label: "Micron", value: `${woData.micron}μ`, icon: Ruler },
    { label: "Width", value: `${woData.width_m}m`, icon: Ruler },
    { label: "Quantity", value: String(woData.quantity), icon: Package },
  ];

  const exportCurrentTab = (scope = "all") => {
    const exportData = currentData.map((row: any) => ({
      ...(activeTab === "Raw Material"
        ? {
          "Roll No": row.raw_material_code || row.roll_no || "-",
          "Net Weight": row.netWeight ?? "",
          "Gross Weight": row.grossWeight ?? "",
          "Micron": row.thickness ?? "",
          "Width (m)": row.width ?? "",
          "Temperature": row.temperature ?? "",
          "Actual Weight": row.actualWeight ?? "",
          "Damaged Weight": row.damagedWeight ?? "",
          "Used Weight": row.usedWeight ?? "",
          "Wastage Weight": row.wastageWeight ?? "",
          "Supplier": row.supplier ?? "",
          "Stage": row.stage ?? "",
          "Status": row.status ?? "",
        }
        : activeTab === "Metallisation"
          ? {
            "Coil No": row.coilNo ?? "",
            "RM ID": row.rmId ?? "",
            "RM Weight": row.rmWeight ?? "",
            "Factory Wastage": row.factoryWastageWeight ?? "",
            "Metallisation Weight": row.weight ?? "",
            "Timestamp": row.timestamp ? new Date(row.timestamp).toLocaleString("en-GB", {
                day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true,
              }) : "",
            "Next Stage": row.nextStage ?? "",
            "Status": row.status ?? "",
          }
          : {
            "Product No": row.productNo ?? "",
            "Coil ID": row.rmId ?? "",
            "Weight": row.weight ?? "",
            "Thickness (μ)": row.thickness ?? "",
            "Grade": row.grade ?? "",
            "Timestamp": row.timestampAdded ? new Date(row.timestampAdded).toLocaleString("en-GB", {
                day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true,
              }) : "",
            "Stage": row.stage ?? "",
            "Status": row.status ?? "",
          }),
    }));
    exportToExcel(exportData, `workorder-${orderId}-${activeTab.toLowerCase().replace(/\s+/g, "-")}`, activeTab);
  };

  return (
    <div className="font-dm-sans min-h-[calc(100vh-72px)] bg-white flex flex-col relative w-full lg:max-w-none pb-12 overflow-x-hidden">
      <MobileHeader title="Work Order Detail" />

      {/* KPI Stats - Mobile 2x2 grid */}
      <section className="grid grid-cols-2 gap-0 md:hidden mx-4 mt-[72px] bg-white border border-[#EBEBEB] rounded-[12px]">
        {kpiStats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className={`p-3 ${i % 2 === 0 ? "border-r border-b border-[#EBEBEB]" : "border-b border-[#EBEBEB]"} ${i >= 2 ? "border-b-0" : ""}`}>
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

      {/* Mobile: status / stage chips */}
      <section className="md:hidden mx-4 mt-3 mb-2 flex flex-wrap gap-2">
        {[
          { label: "Stage", value: woData.stage },
          { label: "Status", value: woData.status },
          { label: "Date", value: new Date(woData.created_at).toLocaleDateString("en-GB") },
        ].map((field, idx) => (
          <div key={idx} className="flex items-center gap-1.5 bg-[#F5F7FA] rounded-[8px] px-3 py-1.5">
            <span className="text-[11px] text-[#5C5C5C]">{field.label}:</span>
            <span className="text-[12px] font-semibold text-[#171717]">
              {field.label === "Status" ? <StatusBadge status={field.value} /> : field.value}
            </span>
          </div>
        ))}
      </section>

      {/* Desktop breadcrumb */}
      <section className="hidden md:flex items-center gap-2 px-4 md:px-6 pt-6 mb-2">
        <span className="text-[14px] font-medium text-[#5C5C5C] leading-tight">Work Orders</span>
        <ChevronRight className="w-4 h-4 text-[#A1A1AA]" />
        <span className="text-[14px] font-medium text-[#00B6E2] leading-tight">{woData.work_order_no}</span>
      </section>

      {/* Desktop KPI row */}
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

      {/* Desktop status strip */}
      <section className="hidden md:flex items-center gap-6 px-4 md:px-6 py-4 border-b border-[#EBEBEB] mx-4 md:mx-6">
        <div className="flex items-center gap-2">
          <span className="text-[14px] text-[#5C5C5C]">Stage:</span>
          <span className="text-[14px] font-semibold text-[#171717]">{woData.stage}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[14px] text-[#5C5C5C]">Date:</span>
          <span className="text-[14px] font-semibold text-[#171717]">
            {new Date(woData.created_at).toLocaleDateString("en-GB")}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[14px] text-[#5C5C5C]">Status:</span>
          <StatusBadge status={woData.status} />
        </div>
      </section>

      {/* Tabs + Table */}
      <section className="w-full px-4 md:px-6 py-6 flex flex-col gap-6">
        {/* Tab bar */}
        <div className="flex items-center gap-2 border-b border-[#EBEBEB] pb-4 overflow-x-auto overflow-y-hidden scrollbar-none">
          {(["Raw Material", "Metallisation", "Slitting"] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 md:px-4 py-2 text-[13px] md:text-[14px] font-medium rounded-[8px] transition-colors whitespace-nowrap shrink-0 ${activeTab === tab
                ? "bg-[#00B6E2] text-white"
                : "bg-white text-[#5C5C5C] hover:bg-[#F5F7FA]"
                }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <button
            onClick={() => setIsDocModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-white border border-[#DDE1E8] text-[#171717] text-[13px] font-medium rounded-[8px] h-[36px] px-4 hover:bg-[#F5F7FA] transition-colors self-start sm:self-auto shadow-sm whitespace-nowrap"
          >
            <FileText className="w-4 h-4 text-gray-600" />
            Docs Uploaded
          </button>
          <TableToolbar dateRange={dateRange} onDateRangeChange={setDateRange} onExport={exportCurrentTab} />
        </div>

        {/* Table */}
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
                      if (key === "options") {
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
                            <div className="flex items-center gap-2">
                              <button onClick={() => setQrData({ id: rowId, type: qrType, data: qrDetails })} className="text-[#5C5C5C] hover:text-[#00B6E2] transition-colors p-1" title="Show QR Code">
                                <QrCode className="w-4 h-4" />
                              </button>
                              {isMC && (
                                <button onClick={() => setRowImagesData(row)} className="text-[#5C5C5C] hover:text-[#00B6E2] transition-colors p-1" title="View Coil Images">
                                  <ImageIcon className="w-4 h-4" />
                                </button>
                              )}
                            </div>
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

      <RowImagesModal
        isOpen={!!rowImagesData}
        onClose={() => setRowImagesData(null)}
        rowData={rowImagesData}
      />
    </div>
  );
}
