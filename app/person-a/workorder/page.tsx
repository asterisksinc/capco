"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { useStore } from "@/hooks/useStore";

function StatusBadge({ status }: { status: string }) {
  if (status === "Yet to Start") {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-[12px] bg-[#FFF0F1] text-[#FB3748] text-[12px] font-medium leading-tight">Yet to Start</span>;
  }
  if (status === "In-progress") {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-[12px] bg-[#FFF4ED] text-[#E19242] text-[12px] font-medium leading-tight">In-progress</span>;
  }
  if (status === "Completed") {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-[12px] bg-[#E8F8F0] text-[#1CB061] text-[12px] font-medium leading-tight">Completed</span>;
  }
  return null;
}

export default function OperatorWorkOrderPage() {
  const { workOrders: rows, mounted } = useStore();

  const totalWorkOrders = rows.length;
  const rawMaterialCount = rows.filter((row) => row.stage.toLowerCase().includes("raw material")).length;
  const metallisationCount = rows.filter((row) => row.stage.toLowerCase().includes("metallisation")).length;
  const slittingCount = rows.filter((row) => row.stage.toLowerCase().includes("slitting")).length;
  const completedCount = rows.filter((row) => row.status === "Completed").length;
  const inProgressCount = rows.filter((row) => row.status === "In-progress").length;
  const yetToStartCount = rows.filter((row) => row.status === "Yet to Start").length;
  const yetRawCount = rows.filter((row) => row.status === "Yet to Start" && row.stage.toLowerCase().includes("raw material")).length;
  const yetMetCount = rows.filter((row) => row.status === "Yet to Start" && row.stage.toLowerCase().includes("metallisation")).length;
  const yetSlitCount = rows.filter((row) => row.status === "Yet to Start" && row.stage.toLowerCase().includes("slitting")).length;
  const inProgressMetCount = rows.filter((row) => row.status === "In-progress" && row.stage.toLowerCase().includes("metallisation")).length;
  const inProgressSlitCount = rows.filter((row) => row.status === "In-progress" && row.stage.toLowerCase().includes("slitting")).length;
  const completedSlitCount = rows.filter((row) => row.status === "Completed" && row.stage.toLowerCase().includes("slitting")).length;

  const overviewStats = [
    {
      title: "Total Work Orders",
      value: String(totalWorkOrders),
      subtext: `Yet ${yetToStartCount} | In-progress ${inProgressCount} | Completed ${completedCount}`,
      subtextClass: "text-[#5C5C5C] font-normal",
      valClass: "text-[#171717]",
    },
    {
      title: "Yet to Start",
      value: String(yetToStartCount),
      subtext: `Raw ${yetRawCount} | Met ${yetMetCount} | Slit ${yetSlitCount}`,
      subtextClass: "text-[#E19242] font-semibold",
      valClass: "text-[#171717]",
    },
    {
      title: "In-progress",
      value: String(inProgressCount),
      subtext: `Met ${inProgressMetCount} | Slit ${inProgressSlitCount}`,
      subtextClass: "text-[#1CB061] font-semibold",
      valClass: "text-[#171717]",
    },
    {
      title: "Completed",
      value: String(completedCount),
      subtext: `Slitting completed ${completedSlitCount}`,
      subtextClass: "text-[#1CB061] font-semibold",
      valClass: "text-[#171717]",
    },
  ];

  if (!mounted) return null; // Avoid hydration mismatch

  return (
    <div className="font-dm-sans min-h-[calc(100vh-72px)] bg-white flex flex-col relative">
      {/* Header section (Frame 66 style) */}
      <section className="bg-white w-full flex justify-start border-b border-[#EBEBEB]">
        <div className="w-full px-6 py-6 pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 h-auto">
          <div className="flex flex-col gap-1">
            <h1 className="text-[16px] font-medium text-[#171717] leading-tight">Work Orders</h1>
            <p className="text-[14px] font-normal text-[#5C5C5C] leading-tight">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit
            </p>
          </div>
          {/* Operator cannot add work order */}
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
          <h2 className="text-[16px] font-semibold text-[#171717] leading-tight">Work Orders</h2>
          
          <div className="border border-[#EAECF0] rounded-[8px] overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-[#F5F7FA] border-b border-[#EBEBEB]">
                  <th className="px-4 py-[11px] text-[14px] font-medium text-[#171717] w-[15%]">Work Orders ID</th>
                  <th className="px-4 py-[11px] text-[14px] font-medium text-[#171717] w-[10%]">Micron</th>
                  <th className="px-4 py-[11px] text-[14px] font-medium text-[#171717] w-[10%]">Width</th>
                  <th className="px-4 py-[11px] text-[14px] font-medium text-[#171717] w-[10%]">Quantity</th>
                  <th className="px-4 py-[11px] text-[14px] font-medium text-[#171717] w-[15%]">Stage</th>
                  <th className="px-4 py-[11px] text-[14px] font-medium text-[#171717] w-[15%]">Date</th>
                  <th className="px-4 py-[11px] text-[14px] font-medium text-[#171717] w-[15%]">Status</th>
                  <th className="px-4 py-[11px] text-[14px] font-medium text-[#171717] w-[10%]">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAECF0]">
                {rows.map((row, idx) => (
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
                      <Link 
                        href={`/person-a/workorder/${row.id}`} 
                        className="inline-flex items-center justify-center px-4 py-[6px] bg-[#00B6E2] hover:bg-[#0092b5] text-white text-[12px] font-medium rounded-[4px] transition-colors"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}