import { Plus } from "lucide-react";
import Link from "next/link";

const overviewStats = [
  {
    title: "Total Items in Stock",
    value: "1,204",
    subtext: "5% vs Last Month",
    subtextClass: "text-[#1CB061] font-semibold",
    valClass: "text-[#171717]",
  },
  {
    title: "Low Stock Items",
    value: "42",
    subtext: "Action needed",
    subtextClass: "text-[#5C5C5C] font-normal",
    valClass: "text-[#171717]",
  },
  {
    title: "New Arrivals",
    value: "15",
    subtext: "+0.2% vs Last Month",
    subtextClass: "text-[#1CB061] font-semibold",
    valClass: "text-[#171717]",
  },
  {
    title: "Out of Stock",
    value: "08",
    subtext: "Critical",
    subtextClass: "text-[#FB3748] font-semibold",
    valClass: "text-[#FB3748]",
  },
];

const mockRows = [
  { id: "STK-0001", name: "Premium Capacitor", category: "Electronics", qty: "150", minLevel: "50", date: "10/01/2025", status: "In Stock" },
  { id: "STK-0002", name: "Copper Wire Roll", category: "Raw Material", qty: "20", minLevel: "30", date: "10/01/2025", status: "Low Stock" },
  { id: "STK-0003", name: "Insulation Tape", category: "Packaging", qty: "500", minLevel: "100", date: "10/01/2025", status: "In Stock" },
  { id: "STK-0004", name: "Silver Film 15μm", category: "Raw Material", qty: "0", minLevel: "10", date: "10/01/2025", status: "Out of Stock" },
  { id: "STK-0005", name: "Cardboard Box", category: "Packaging", qty: "250", minLevel: "50", date: "10/01/2025", status: "In Stock" },
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
                  <th className="px-4 py-[11px] text-[14px] font-medium text-[#171717] w-[15%]">Item ID</th>
                  <th className="px-4 py-[11px] text-[14px] font-medium text-[#171717] w-[20%]">Name</th>
                  <th className="px-4 py-[11px] text-[14px] font-medium text-[#171717] w-[15%]">Category</th>
                  <th className="px-4 py-[11px] text-[14px] font-medium text-[#171717] w-[10%]">Quantity</th>
                  <th className="px-4 py-[11px] text-[14px] font-medium text-[#171717] w-[10%]">Min Level</th>
                  <th className="px-4 py-[11px] text-[14px] font-medium text-[#171717] w-[10%]">Date Added</th>
                  <th className="px-4 py-[11px] text-[14px] font-medium text-[#171717] w-[10%]">Status</th>
                  <th className="px-4 py-[11px] text-[14px] font-medium text-[#171717] w-[10%]">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAECF0]">
                {mockRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.id}</td>
                    <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.name}</td>
                    <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.category}</td>
                    <td className="px-4 py-4 text-[14px] font-medium text-[#171717] whitespace-nowrap">{row.qty}</td>
                    <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.minLevel}</td>
                    <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.date}</td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Link 
                        href={`/supervisor/stock/${row.id}`} 
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
