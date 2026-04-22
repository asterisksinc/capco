"use client";

import { Search } from "lucide-react";
import { use, useState, useMemo } from "react";
import { useStore } from "@/hooks/useStore";
import { computeWorkflowProgress } from "../../../../lib/data";
import type { TableConfig } from "@/hooks/useTableControls";
import { useTableControls } from "@/hooks/useTableControls";
import { SortableHeader } from "@/components/table/SortableHeader";
import { TableToolbar } from "@/components/table/TableToolbar";
import { OptionsDropdown } from "@/components/table/OptionsDropdown";

type DetailPageProps = {
  params: Promise<{ detailpage: string }>;
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

type TabType = "Raw Material" | "Metallisation" | "Slitting";

const rawMaterialConfig: TableConfig<any> = {
  columns: [
    { key: "rollNo", label: "Roll No", type: "text", sortable: true },
    { key: "weight", label: "Weight", type: "number", sortable: true },
    { key: "thickness", label: "Thickness", type: "number", sortable: true },
    { key: "supplier", label: "Company/Supplier", type: "text", sortable: true },
    { key: "stage", label: "Stage", type: "enum", sortable: false, filter: "dropdown", options: ["Raw Material"] },
    { key: "status", label: "Status", type: "enum", sortable: false, filter: "dropdown", options: ["Yet to Start", "In-progress", "Completed"] },
    { key: "options", label: "Action", type: "text", sortable: false }
  ]
};

const metallisationConfig: TableConfig<any> = {
  columns: [
    { key: "coilNo", label: "Coil No.", type: "text", sortable: true },
    { key: "rmId", label: "RM ID", type: "text", sortable: true },
    { key: "machineNo", label: "Machine No.", type: "text", sortable: true },
    { key: "weight", label: "Weight", type: "number", sortable: true },
    { key: "opticalDensity", label: "Optical Density (OD)", type: "text", sortable: true },
    { key: "resistance", label: "Resistance", type: "text", sortable: true },
    { key: "timestamp", label: "Timestamp", type: "date", sortable: true },
    { key: "nextStage", label: "Next Stage", type: "text", sortable: false },
    { key: "status", label: "Status", type: "enum", sortable: false, filter: "dropdown", options: ["Yet to Start", "In-progress", "Completed"] },
    { key: "options", label: "Action", type: "text", sortable: false }
  ]
};

const slittingConfig: TableConfig<any> = {
  columns: [
    { key: "productNo", label: "Product No", type: "text", sortable: true },
    { key: "rmId", label: "RM ID", type: "text", sortable: true },
    { key: "weight", label: "Weight", type: "number", sortable: true },
    { key: "thickness", label: "Thickness", type: "number", sortable: true },
    { key: "grade", label: "Grade", type: "text", sortable: true },
    { key: "timestampAdded", label: "Timestamp Added", type: "date", sortable: true },
    { key: "stage", label: "Stage", type: "enum", sortable: false, filter: "dropdown", options: ["Slitting", "Completed"] },
    { key: "status", label: "Status", type: "enum", sortable: false, filter: "dropdown", options: ["Yet to Start", "In-progress", "Completed"] },
    { key: "options", label: "Action", type: "text", sortable: false }
  ]
};

export default function SupervisorWorkOrderDetailPage({ params }: DetailPageProps) {
  const { detailpage } = use(params);
  const orderId = detailpage.toUpperCase();
  const { store, mounted } = useStore();
  const workOrderFlowData = store.flowDataMap[orderId];
  const workflowProgress = computeWorkflowProgress(workOrderFlowData);
  const [activeTab, setActiveTab] = useState<TabType>("Raw Material");

  const currentConfig = useMemo(() => {
    switch (activeTab) {
      case "Raw Material": return rawMaterialConfig;
      case "Metallisation": return metallisationConfig;
      case "Slitting": return slittingConfig;
      default: return rawMaterialConfig;
    }
  }, [activeTab]);

  const currentData = useMemo(() => {
    if (!workOrderFlowData) return [];
    switch (activeTab) {
      case "Raw Material": return workOrderFlowData.rawMaterialRows;
      case "Metallisation": return workOrderFlowData.metallisationRows;
      case "Slitting": return workOrderFlowData.slittingRows;
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
    setDateRange
  } = useTableControls({ data: currentData, config: currentConfig });

  if (!mounted) return null;
  if (!workOrderFlowData) return null;
  return (
    <div className="font-dm-sans min-h-[calc(100vh-72px)] bg-white flex flex-col">
      {/* Top Section - Overview */}
      <section className="w-full px-6 py-8 flex flex-col gap-6 border-b border-[#EBEBEB]">
        <h1 className="text-[16px] font-semibold text-[#171717] leading-tight">Work Orders Overview</h1>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-2">
          {/* Row 1 Stats */}
          <div className="flex flex-col gap-1.5">
            <p className="text-[12px] font-medium text-[#5C5C5C] leading-tight">Word Count</p>
            <p className="text-[14px] font-semibold text-[#171717] leading-tight">{workOrderFlowData.overview.wordCount}</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <p className="text-[12px] font-medium text-[#5C5C5C] leading-tight">Micron</p>
            <p className="text-[14px] font-semibold text-[#171717] leading-tight">{workOrderFlowData.overview.micron}</p>
          </div>
          <div className="flex flex-col gap-1.5">
             <p className="text-[12px] font-medium text-[#5C5C5C] leading-tight">Width</p>
            <p className="text-[14px] font-semibold text-[#171717] leading-tight">{workOrderFlowData.overview.width}</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <p className="text-[12px] font-medium text-[#5C5C5C] leading-tight">Quantity</p>
            <p className="text-[14px] font-semibold text-[#171717] leading-tight">{workOrderFlowData.overview.quantity}</p>
          </div>

          {/* Row 2 Stats */}
          <div className="flex flex-col gap-1.5">
            <p className="text-[12px] font-medium text-[#5C5C5C] leading-tight">Stage</p>
            <p className="text-[14px] font-semibold text-[#171717] leading-tight">{workflowProgress.stage}</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <p className="text-[12px] font-medium text-[#5C5C5C] leading-tight">Date</p>
            <p className="text-[14px] font-semibold text-[#171717] leading-tight">{workOrderFlowData.overview.date}</p>
          </div>
          <div className="flex flex-col gap-1.5 items-start">
            <p className="text-[12px] font-medium text-[#5C5C5C] leading-tight">Status</p>
            <div className="mt-0.5">
              <StatusBadge status={workflowProgress.status} />
            </div>
          </div>
        </div>
      </section>

      {/* Main Content - Table */}
      <div className="w-full px-6 py-6 flex flex-col gap-6">
        
        {/* Controls Row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="relative w-full max-w-[291px] h-[40px] flex items-center border border-[#EBEBEB] rounded-[6px] px-[10px] gap-2 bg-white shrink-0">
            <Search className="w-5 h-5 text-[#525866]" />
            <input
              type="text"
              placeholder="Search"
              className="w-full bg-transparent text-[14px] text-[#171717] placeholder:text-[#525866] focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center bg-[#F5F7FA] rounded-[6px] p-1 border border-[#EBEBEB] w-full sm:w-auto overflow-x-auto shrink-0 pt-1 pb-1">
              {(["Raw Material", "Metallisation", "Slitting"] as TabType[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`h-[32px] px-4 rounded-[4px] text-[14px] font-medium shadow-sm transition-colors whitespace-nowrap ${
                    activeTab === tab
                      ? "bg-[#00B6E2] text-white"
                      : "bg-transparent text-[#5C5C5C] hover:text-[#171717]"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <TableToolbar
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              onExport={() => alert("Exporting data...")}
            />
          </div>
        </div>

        {/* Table itself */}
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
                {processedData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50 transition-colors group">
                    {currentConfig.columns.map((col) => {
                      if (String(col.key) === "options") {
                        return (
                          <td key={String(col.key)} className="px-4 py-3 whitespace-nowrap">
                            <OptionsDropdown 
                              onEdit={() => alert(`Edit ${activeTab} Row ${idx}`)}
                              onDelete={() => alert(`Delete ${activeTab} Row ${idx}`)}
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
                        <td key={String(col.key)} className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">
                          {row[col.key]}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
