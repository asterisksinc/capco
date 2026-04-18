"use client";

import { use } from "react";
import { Search } from "lucide-react";
import { useState } from "react";

type DetailPageProps = {
  params: Promise<{ detailpage: string }>;
};

const rawMaterialRows = [
  { id: "RM-0001", micron: "8", width: "1", qty: "1", stage: "Metallisation", date: "10/01/2025", status: "Yet to Start" },
  { id: "RM-0002", micron: "12", width: "1", qty: "1", stage: "Slitting", date: "10/01/2025", status: "In-progress" },
  { id: "RM-0003", micron: "5", width: "1", qty: "1", stage: "Slitting", date: "10/01/2025", status: "Completed" },
  { id: "RM-0004", micron: "15", width: "1", qty: "1", stage: "Metallisation", date: "10/01/2025", status: "Yet to Start" },
  { id: "RM-0005", micron: "7", width: "1", qty: "1", stage: "Slitting", date: "10/01/2025", status: "Completed" },
];

const metallisationRows = [
  { id: "MET-0001", machineNo: "M-01", od: "2.4", resistance: "1.5 Ohms", rollLength: "1500m", date: "11/01/2025", status: "In-progress" },
  { id: "MET-0002", machineNo: "M-02", od: "2.5", resistance: "1.4 Ohms", rollLength: "2000m", date: "11/01/2025", status: "Completed" },
  { id: "MET-0003", machineNo: "M-01", od: "TBD", resistance: "TBD", rollLength: "1800m", date: "12/01/2025", status: "Yet to Start" },
];

const slittingRows = [
  { id: "SLT-0001", machineNo: "S-04", cutWidth: "10mm", cuts: "50", yieldPct: "98%", date: "13/01/2025", status: "Completed" },
  { id: "SLT-0002", machineNo: "S-02", cutWidth: "12mm", cuts: "40", yieldPct: "95%", date: "13/01/2025", status: "In-progress" },
  { id: "SLT-0003", machineNo: "S-03", cutWidth: "8mm", cuts: "60", yieldPct: "TBD", date: "14/01/2025", status: "Yet to Start" },
];

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

export default function SupervisorWorkOrderDetailPage({ params }: DetailPageProps) {
  const { detailpage } = use(params);
  const orderId = detailpage.toUpperCase();
  const [activeTab, setActiveTab] = useState<TabType>("Raw Material");
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);

  const handleRawMaterialView = (index: number) => {
    setSelectedItemIndex(index);
    setActiveTab("Metallisation");
  };

  const handleMetallisationView = (index: number) => {
    setSelectedItemIndex(index);
    setActiveTab("Slitting");
  };

  const handleSlittingView = (index: number) => {
    // This could link to a detailed view or completion screen
    alert(`Slitting process for SLT-${String(index + 1).padStart(4, "0")} is complete!`);
  };

  return (
    <div className="font-dm-sans min-h-[calc(100vh-72px)] bg-white flex flex-col">
      {/* Top Section - Overview */}
      <section className="w-full px-6 py-8 flex flex-col gap-6 border-b border-[#EBEBEB]">
        <h1 className="text-[16px] font-semibold text-[#171717] leading-tight">Work Orders Overview</h1>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-2">
          {/* Row 1 Stats */}
          <div className="flex flex-col gap-1.5">
            <p className="text-[12px] font-medium text-[#5C5C5C] leading-tight">Word Count</p>
            <p className="text-[14px] font-semibold text-[#171717] leading-tight">4,200 words</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <p className="text-[12px] font-medium text-[#5C5C5C] leading-tight">Micron</p>
            <p className="text-[14px] font-semibold text-[#171717] leading-tight">8</p>
          </div>
          <div className="flex flex-col gap-1.5">
             <p className="text-[12px] font-medium text-[#5C5C5C] leading-tight">Width</p>
            <p className="text-[14px] font-semibold text-[#171717] leading-tight">1</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <p className="text-[12px] font-medium text-[#5C5C5C] leading-tight">Quantity</p>
            <p className="text-[14px] font-semibold text-[#171717] leading-tight">1</p>
          </div>

          {/* Row 2 Stats */}
          <div className="flex flex-col gap-1.5">
            <p className="text-[12px] font-medium text-[#5C5C5C] leading-tight">Stage</p>
            <p className="text-[14px] font-semibold text-[#171717] leading-tight">Metallisation</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <p className="text-[12px] font-medium text-[#5C5C5C] leading-tight">Date</p>
            <p className="text-[14px] font-semibold text-[#171717] leading-tight">10/01/2025</p>
          </div>
          <div className="flex flex-col gap-1.5 items-start">
            <p className="text-[12px] font-medium text-[#5C5C5C] leading-tight">Status</p>
            <div className="mt-0.5">
              <StatusBadge status="Yet to Start" />
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
        </div>

        {/* Table itself */}
        <div className="bg-white border border-[#EBEBEB] rounded-[12px] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-[#F5F7FA] border-b border-[#EBEBEB]">
                  {activeTab === "Raw Material" && (
                    <>
                      <th className="px-4 py-[11px] text-[14px] font-medium text-[#171717]">ID</th>
                      <th className="px-4 py-[11px] text-[14px] font-medium text-[#171717]">Micron</th>
                      <th className="px-4 py-[11px] text-[14px] font-medium text-[#171717]">Width</th>
                      <th className="px-4 py-[11px] text-[14px] font-medium text-[#171717]">Quantity</th>
                      <th className="px-4 py-[11px] text-[14px] font-medium text-[#171717]">Stage</th>
                      <th className="px-4 py-[11px] text-[14px] font-medium text-[#171717]">Date</th>
                    </>
                  )}
                  {activeTab === "Metallisation" && (
                    <>
                      <th className="px-4 py-[11px] text-[14px] font-medium text-[#171717]">ID</th>
                      <th className="px-4 py-[11px] text-[14px] font-medium text-[#171717]">Machine No.</th>
                      <th className="px-4 py-[11px] text-[14px] font-medium text-[#171717]">Optical Density (OD)</th>
                      <th className="px-4 py-[11px] text-[14px] font-medium text-[#171717]">Resistance</th>
                      <th className="px-4 py-[11px] text-[14px] font-medium text-[#171717]">Roll Length</th>
                      <th className="px-4 py-[11px] text-[14px] font-medium text-[#171717]">Date</th>
                    </>
                  )}
                  {activeTab === "Slitting" && (
                    <>
                      <th className="px-4 py-[11px] text-[14px] font-medium text-[#171717]">ID</th>
                      <th className="px-4 py-[11px] text-[14px] font-medium text-[#171717]">Machine No.</th>
                      <th className="px-4 py-[11px] text-[14px] font-medium text-[#171717]">Cut Width</th>
                      <th className="px-4 py-[11px] text-[14px] font-medium text-[#171717]">No. of Cuts</th>
                      <th className="px-4 py-[11px] text-[14px] font-medium text-[#171717]">Yield (%)</th>
                      <th className="px-4 py-[11px] text-[14px] font-medium text-[#171717]">Date</th>
                    </>
                  )}
                  <th className="px-4 py-[11px] text-[14px] font-medium text-[#171717]">Status</th>
                  <th className="px-4 py-[11px] text-[14px] font-medium text-[#171717]">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAECF0]">
                {activeTab === "Raw Material" && rawMaterialRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.id}</td>
                    <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.micron}</td>
                    <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.width}</td>
                    <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.qty}</td>
                    <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.stage}</td>
                    <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.date}</td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button onClick={() => handleRawMaterialView(idx)} className="inline-flex px-4 py-[6px] bg-[#00B6E2] hover:bg-[#0092b5] text-white text-[12px] font-medium rounded-[4px] transition-colors">
                        View
                      </button>
                    </td>
                  </tr>
                ))}
                
                {activeTab === "Metallisation" && metallisationRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.id}</td>
                    <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.machineNo}</td>
                    <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.od}</td>
                    <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.resistance}</td>
                    <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.rollLength}</td>
                    <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.date}</td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button onClick={() => handleMetallisationView(idx)} className="inline-flex px-4 py-[6px] bg-[#00B6E2] hover:bg-[#0092b5] text-white text-[12px] font-medium rounded-[4px] transition-colors">
                        View
                      </button>
                    </td>
                  </tr>
                ))}

                {activeTab === "Slitting" && slittingRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.id}</td>
                    <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.machineNo}</td>
                    <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.cutWidth}</td>
                    <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.cuts}</td>
                    <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.yieldPct}</td>
                    <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.date}</td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button onClick={() => handleSlittingView(idx)} className="inline-flex px-4 py-[6px] bg-[#00B6E2] hover:bg-[#0092b5] text-white text-[12px] font-medium rounded-[4px] transition-colors">
                        View
                      </button>
                    </td>
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
