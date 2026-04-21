"use client";

import { Plus } from "lucide-react";
import { useStore } from "@/hooks/useStore";

export default function SupervisorStockPage() {
  const { store, mounted } = useStore();

  const getStockRows = () => {
    if (!mounted) return [];
    const rows = [];
    for (const [woId, flow] of Object.entries(store.flowDataMap)) {
      for (const row of flow.slittingRows) {
        rows.push({
          stockId: row.productNo,
          linkedWoId: woId,
          weight: row.weight,
          width: flow.overview.width || "-",
          micron: row.thickness || flow.overview.micron || "-",
          grade: row.grade,
          stage: row.stage || "Ready for Winding",
          timestamp: row.timestampAdded || flow.overview.date || "-",
        });
      }
    }
    // Most recent first (basic reverse, properly they are chronological as pushed)
    return rows.reverse();
  };

  const actualRows = getStockRows();

  const totalLots = actualRows.length;
  // Basic metrics from the slitting output rules
  const qualityCheckLots = actualRows.filter((row) => row.stage.includes("QC") || row.stage.includes("Hold")).length;
  const gradeALots = actualRows.filter((row) => row.grade === "A").length;
  const inStockLots = actualRows.filter((row) => row.stage === "Ready for Winding" || row.stage === "Ready for Dispatch").length;

  const overviewStats = [
    {
      title: "Total Product Lots",
      value: mounted ? String(totalLots) : "-",
      subtext: `${gradeALots} grade A lots`,
      subtextClass: "text-[#1CB061] font-semibold",
      valClass: "text-[#171717]",
    },
    {
      title: "In Stock / Dispatch",
      value: mounted ? String(inStockLots) : "-",
      subtext: "Available for next stage",
      subtextClass: "text-[#5C5C5C] font-normal",
      valClass: "text-[#171717]",
    },
    {
      title: "Quality Check Pending",
      value: mounted ? String(qualityCheckLots) : "-",
      subtext: qualityCheckLots > 0 ? "Needs final clearance" : "All cleared",
      subtextClass: qualityCheckLots > 0 ? "text-[#E19242] font-semibold" : "text-[#1CB061] font-semibold",
      valClass: "text-[#171717]",
    },
    {
      title: "Recent Additions",
      value: mounted ? String(Math.min(totalLots, 5)) : "-",
      subtext: "Last 48 hours",
      subtextClass: "text-[#5C5C5C] font-normal",
      valClass: "text-[#171717]",
    },
  ];

  return (
    <div className="font-dm-sans min-h-[calc(100vh-72px)] bg-white flex flex-col">
      {/* Header section (Frame 66 style) */}
      <section className="bg-white w-full flex justify-start border-b border-[#EBEBEB]">
        <div className="w-full px-6 py-6 pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 h-auto">
          <div className="flex flex-col gap-1">
            <h1 className="text-[16px] font-medium text-[#171717] leading-tight">Stock Management</h1>
            <p className="text-[14px] font-normal text-[#5C5C5C] leading-tight">
              Manage and view current inventory levels
            </p>
          </div>
          <button className="flex items-center justify-center gap-2 bg-[#00B6E2] text-white text-[14px] font-medium rounded-[6px] h-[40px] px-[18px] hover:bg-[#0092b5] transition-colors shrink-0">
            <Plus className="w-5 h-5 shrink-0" strokeWidth={2.5} />
            <span className="leading-tight">Add Stock</span>
          </button>
        </div>
      </section>

      {/* Main Content */}
      <div className="w-full px-6 py-6 flex flex-col gap-6">
        {/* Stats Cards (Frame 70) */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 bg-white border border-[#EBEBEB] rounded-[12px] items-center p-5">
          {overviewStats.map((stat, i) => (
            <div key={i} className="flex items-center justify-between px-6 py-2 sm:py-0">
              <div className="flex flex-col gap-[6px]">
                <p className="text-[12px] font-medium text-[#5C5C5C] leading-tight">{stat.title}</p>
                <div className="flex items-baseline gap-3">
                  <span className={`text-[14px] font-semibold leading-tight ${stat.valClass}`}>{stat.value}</span>
                  <span className={`text-[12px] leading-tight ${stat.subtextClass}`}>{stat.subtext}</span>
                </div>
              </div>
              {i < overviewStats.length - 1 && (
                <div className="hidden lg:block w-[1px] h-[37px] bg-[#EAECF0]"></div>
              )}
            </div>
          ))}
        </section>

        {/* Data Table (Frame 71) */}
        <section className="bg-white border border-[#EBEBEB] rounded-[12px] p-6 flex flex-col gap-4 overflow-hidden">
          <h2 className="text-[16px] font-semibold text-[#171717] leading-tight">Current Stock</h2>
          
          <div className="border border-[#EAECF0] rounded-[8px] overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-[#F5F7FA] border-b border-[#EBEBEB]">
                  <th className="px-4 py-[11px] text-[14px] font-medium text-[#171717] w-[12%]">STOCK ID</th>
                  <th className="px-4 py-[11px] text-[14px] font-medium text-[#171717] w-[12%]">Linked WO ID</th>
                  <th className="px-4 py-[11px] text-[14px] font-medium text-[#171717] w-[12%]">Weight</th>
                  <th className="px-4 py-[11px] text-[14px] font-medium text-[#171717] w-[10%]">Width</th>
                  <th className="px-4 py-[11px] text-[14px] font-medium text-[#171717] w-[10%]">Micron</th>
                  <th className="px-4 py-[11px] text-[14px] font-medium text-[#171717] w-[8%]">Grade</th>
                  <th className="px-4 py-[11px] text-[14px] font-medium text-[#171717] w-[15%]">Stage</th>
                  <th className="px-4 py-[11px] text-[14px] font-medium text-[#171717] w-[12%]">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAECF0]">
                {mounted ? actualRows.length > 0 ? (actualRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-4 py-4 text-[14px] font-medium text-[#00B6E2] whitespace-nowrap">{row.stockId}</td>
                    <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.linkedWoId}</td>
                    <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.weight}</td>
                    <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.width}</td>
                    <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.micron}</td>
                    <td className="px-4 py-4 text-[14px] font-medium text-[#171717] whitespace-nowrap">{row.grade}</td>
                    <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">
                       <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-[6px] text-xs font-medium tracking-wide">
                          {row.stage}
                       </span>
                    </td>
                    <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.timestamp}</td>
                  </tr>
                ))) : (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-[#5C5C5C] text-[14px]">
                      No stock available. Complete a slitting order to generate stock.
                    </td>
                  </tr>
                ) : (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-[#5C5C5C] text-[14px]">
                      Loading stock data...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}