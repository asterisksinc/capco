"use client";

import { use, useState, useMemo } from "react";
import { Search } from "lucide-react";
import type { TableConfig } from "@/hooks/useTableControls";
import { useTableControls } from "@/hooks/useTableControls";
import { SortableHeader } from "@/components/table/SortableHeader";
import { TableToolbar } from "@/components/table/TableToolbar";
import { OptionsDropdown } from "@/components/table/OptionsDropdown";

type DetailPageProps = {
  params: Promise<{ detailpage: string }>;
};

type TabType = "Product Material" | "Winding" | "Spray";

const productMaterialConfig: TableConfig<any> = {
  columns: [
    { key: "stockId", label: "STOCK ID", type: "text", sortable: true },
    { key: "linkedWoId", label: "Linked WO ID", type: "text", sortable: true },
    { key: "weight", label: "Weight", type: "text", sortable: true },
    { key: "width", label: "Width", type: "text", sortable: true },
    { key: "micron", label: "Micron", type: "text", sortable: true },
    { key: "grade", label: "Grade", type: "text", sortable: true },
    { key: "handoverBy", label: "Handover By", type: "text", sortable: true },
    { key: "timestamp", label: "Timestamp", type: "text", sortable: true },
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

const mockProductMaterial = Array(6).fill(null).map((_, i) => ({
  id: i, stockId: "PM-0001", linkedWoId: "WO-0001", weight: "58.5kgs", width: "4.5", micron: "6.5", grade: "A", handoverBy: "Person A", timestamp: "10/01/2025: 08:24:20"
}));
const mockWinding = Array(6).fill(null).map((_, i) => ({
  id: i, wdId: "WD-0001", linkedPmId: "PM-0001", filmWidth: "7mm", windingTension: "0.5 N", turnsCount: "120", quantityWound: "250", stage: "Spray", timestamp: "10/01/2025: 08:24:20"
}));
const mockSpray = Array(6).fill(null).map((_, i) => ({
  id: i, spId: "SP-0001", linkedWdId: "WD-0001", sprayType: "7mm", feedRate: "0.5 N", pressureSitting: "120", stage: "Moved to Person C", timestamp: "10/01/2025: 08:24:20"
}));

export default function PersonBProductOrderDetail({ params }: DetailPageProps) {
  const { detailpage } = use(params);
  const displayId = (detailpage || "PO-0001").toUpperCase();
  const [activeTab, setActiveTab] = useState<TabType>("Winding");

  const currentConfig = useMemo(() => {
    switch (activeTab) {
      case "Product Material": return productMaterialConfig;
      case "Winding": return windingConfig;
      case "Spray": return sprayConfig;
      default: return windingConfig;
    }
  }, [activeTab]);

  const currentData = useMemo(() => {
    switch (activeTab) {
      case "Product Material": return mockProductMaterial;
      case "Winding": return mockWinding;
      case "Spray": return mockSpray;
      default: return [];
    }
  }, [activeTab]);

  const {
    processedData,
    sortConfig,
    handleSort,
    filters,
    handleFilterChange,
    dateRange,
    setDateRange
  } = useTableControls({ data: currentData, config: currentConfig });

  return (
    <div className="font-dm-sans min-h-[calc(100vh-72px)] bg-[#FAFAFA] flex flex-col relative w-full pt-[72px] md:pt-0 pb-10">
      
      {/* Header section */}
      <section className="bg-white w-full flex justify-start border-b border-[#EBEBEB]">
        <div className="w-full px-6 py-5 flex items-center justify-between">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <h1 className="text-[20px] font-semibold text-[#171717] leading-tight">Product Order Details</h1>
            </div>
            <p className="text-[14px] text-[#5C5C5C] flex items-center gap-2">
              Priority order — aviation-grade QC
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="bg-[#FFF4ED] text-[#E19242] text-[12px] font-medium px-3 py-[6px] rounded-[24px]">High Priority</span>
            <span className="bg-[#E6F8FD] text-[#00B6E2] text-[12px] font-medium px-3 py-[6px] rounded-[24px]">Epoxy Filling</span>
          </div>
        </div>
      </section>

      {/* Detail grid */}
      <section className="bg-white px-6 py-6 border-b border-[#EBEBEB] grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-y-6 gap-x-4">
        {/* Column 1 */}
        <div className="flex flex-col gap-5">
           <div className="flex flex-col gap-1">
            <span className="text-[13px] text-[#5C5C5C]">Capacitor Type</span>
            <span className="text-[14px] font-medium text-[#171717]">Film (MKT Series)</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[13px] text-[#5C5C5C]">Tolerance</span>
            <span className="text-[14px] font-medium text-[#171717]">±5%</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[13px] text-[#5C5C5C]">Delivery commitment</span>
            <span className="text-[14px] font-medium text-[#171717]">31 Jan 2025, 09:00 IST</span>
          </div>
        </div>
        {/* Column 2 */}
        <div className="flex flex-col gap-5">
           <div className="flex flex-col gap-1">
            <span className="text-[13px] text-[#5C5C5C]">Capacitance</span>
            <span className="text-[14px] font-medium text-[#171717]">10μF</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[13px] text-[#5C5C5C]">Batch quantity</span>
            <span className="text-[14px] font-medium text-[#171717]">5,000 Units</span>
          </div>
        </div>
        {/* Column 3 */}
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <span className="text-[13px] text-[#5C5C5C]">Voltage rating</span>
            <span className="text-[14px] font-medium text-[#171717]">63V DC</span>
          </div>
           <div className="flex flex-col gap-1">
            <span className="text-[13px] text-[#5C5C5C]">Winding requirement</span>
            <span className="text-[14px] font-medium text-[#171717]">120 turns/layer, 3-layer</span>
          </div>
        </div>
        {/* Column 4 */}
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <span className="text-[13px] text-[#5C5C5C]">Grade</span>
            <span className="text-[14px] font-medium text-[#171717]">A — Premium</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[13px] text-[#5C5C5C]">Spray requirement</span>
            <span className="text-[14px] font-medium text-[#171717]">Zinc-spray, Batch ZS-447</span>
          </div>
        </div>
      </section>

      <section className="bg-white m-6 border border-[#EBEBEB] rounded-[8px]">
        {/* Tabs */}
        <div className="flex gap-2 px-6 pt-5 pb-5 border-b border-[#EBEBEB]">
          {(["Product Material", "Winding", "Spray"] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-[16px] py-[8px] rounded-[6px] text-[14px] font-medium transition-colors ${
                activeTab === tab 
                  ? "bg-[#00B6E2] text-white" 
                  : "bg-[#F5F7FA] text-[#5C5C5C] hover:bg-[#e4e7ec]"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Table Controls section */}
        <div className="px-6 py-6 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <TableToolbar
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              onExport={() => alert("Exporting data...")}
            />
            <div className="flex items-center gap-3 w-full sm:w-auto">
              {activeTab === "Winding" && (
                <button className="h-[40px] px-4 bg-[#00B6E2] hover:bg-[#0092b5] text-white text-[14px] font-medium rounded-[8px] flex items-center justify-center gap-2 whitespace-nowrap transition-colors">
                   + Winding
                </button>
              )}
              {activeTab === "Spray" && (
                 <button className="h-[40px] px-4 bg-[#00B6E2] hover:bg-[#0092b5] text-white text-[14px] font-medium rounded-[8px] flex items-center justify-center gap-2 whitespace-nowrap transition-colors">
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
                {processedData.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    {currentConfig.columns.map((col) => {
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
                {processedData.length === 0 && (
                  <tr>
                    <td colSpan={currentConfig.columns.length} className="px-5 py-8 text-center text-[#5C5C5C]">
                      No records found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}