import { Plus } from "lucide-react";
import Link from "next/link";

const mockRows = [
  { stockId: "PM-0001", linkedWoId: "WO-0001", weight: "58.5kgs", width: "4.5", micron: "6.5", grade: "A", stage: "Metallisation", timestamp: "10/01/2025" },
  { stockId: "PM-0002", linkedWoId: "WO-0002", weight: "45.2kgs", width: "3.8", micron: "8.0", grade: "B", stage: "Slitting", timestamp: "10/01/2025" },
  { stockId: "PM-0003", linkedWoId: "WO-0001", weight: "58.5kgs", width: "4.5", micron: "6.5", grade: "A", stage: "Metallisation", timestamp: "10/01/2025" },
  { stockId: "PM-0004", linkedWoId: "WO-0003", weight: "62.8kgs", width: "5.0", micron: "7.5", grade: "A", stage: "Packaging", timestamp: "10/01/2025" },
  { stockId: "PM-0005", linkedWoId: "WO-0002", weight: "45.2kgs", width: "3.8", micron: "8.0", grade: "B", stage: "Slitting", timestamp: "10/01/2025" },
  { stockId: "PM-0006", linkedWoId: "WO-0004", weight: "55.0kgs", width: "4.2", micron: "6.8", grade: "A", stage: "Metallisation", timestamp: "10/01/2025" },
  { stockId: "PM-0007", linkedWoId: "WO-0001", weight: "58.5kgs", width: "4.5", micron: "6.5", grade: "A", stage: "Metallisation", timestamp: "10/01/2025" },
  { stockId: "PM-0008", linkedWoId: "WO-0005", weight: "48.3kgs", width: "4.0", micron: "7.2", grade: "B", stage: "Quality Check", timestamp: "10/01/2025" },
];

function StatusBadge({ status }: { status: string }) {
  if (status === "Out of Stock") {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-[12px] bg-[#FFF0F1] text-[#FB3748] text-[12px] font-medium leading-tight">Out of Stock</span>;
  }
  if (status === "Low Stock") {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-[12px] bg-[#FFF4ED] text-[#E19242] text-[12px] font-medium leading-tight">Low Stock</span>;
  }
  if (status === "In Stock") {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-[12px] bg-[#E8F8F0] text-[#1CB061] text-[12px] font-medium leading-tight">In Stock</span>;
  }
  return null;
}

export default function SupervisorStockPage() {
  const totalLots = mockRows.length;
  const metallisationLots = mockRows.filter((row) => row.stage === "Metallisation").length;
  const slittingLots = mockRows.filter((row) => row.stage === "Slitting").length;
  const qualityCheckLots = mockRows.filter((row) => row.stage === "Quality Check").length;
  const gradeALots = mockRows.filter((row) => row.grade === "A").length;

  const overviewStats = [
    {
      title: "Total Product Lots",
      value: String(totalLots),
      subtext: `${gradeALots} grade A lots`,
      subtextClass: "text-[#1CB061] font-semibold",
      valClass: "text-[#171717]",
    },
    {
      title: "Metallisation Stock",
      value: String(metallisationLots),
      subtext: "Available for slitting",
      subtextClass: "text-[#5C5C5C] font-normal",
      valClass: "text-[#171717]",
    },
    {
      title: "Slitting Queue",
      value: String(slittingLots),
      subtext: "Currently in cut processing",
      subtextClass: "text-[#E19242] font-semibold",
      valClass: "text-[#171717]",
    },
    {
      title: "Quality Check Lots",
      value: String(qualityCheckLots),
      subtext: qualityCheckLots > 0 ? "Needs final clearance" : "No pending QC",
      subtextClass: qualityCheckLots > 0 ? "text-[#FB3748] font-semibold" : "text-[#1CB061] font-semibold",
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
                {mockRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.stockId}</td>
                    <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.linkedWoId}</td>
                    <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.weight}</td>
                    <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.width}</td>
                    <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.micron}</td>
                    <td className="px-4 py-4 text-[14px] font-medium text-[#171717] whitespace-nowrap">{row.grade}</td>
                    <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.stage}</td>
                    <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.timestamp}</td>
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
