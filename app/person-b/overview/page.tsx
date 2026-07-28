"use client";

import { useStore } from "@/hooks/useStore";
import Link from "next/link";
import { ClipboardList, Clock, Activity, CheckCircle } from "lucide-react";
import { MobileHeader } from "@/components/MobileHeader";

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

export default function PersonBOverviewPage() {
  const { store, mounted } = useStore();

  if (!mounted) return null;

  const productOrders = store.productOrders;
  const totalPO = productOrders.length;
  const poInProgress = productOrders.filter((p) => p.status === "In-progress").length;
  const poYetToStart = productOrders.filter((p) => p.status === "Yet to Start").length;
  const poCompleted = productOrders.filter((p) => p.status === "Completed").length;

  const recentPOs = productOrders.slice(0, 5);

  const kpiStats = [
    { label: "Total Product Orders", value: String(totalPO), icon: ClipboardList, valClass: "text-[#171717]", subtext: `${poInProgress} in-progress` },
    { label: "Yet to Start", value: String(poYetToStart), icon: Clock, valClass: "text-[#FB3748]", subtext: "Pending processing" },
    { label: "In Progress", value: String(poInProgress), icon: Activity, valClass: "text-[#E19242]", subtext: "Active production" },
    { label: "Completed", value: String(poCompleted), icon: CheckCircle, valClass: "text-[#1CB061]", subtext: "Ready for next stage" },
  ];

  return (
    <div className="font-dm-sans min-h-[calc(100vh-72px)] bg-[#FAFAFA] flex flex-col w-full pb-12 overflow-x-hidden">
      <MobileHeader title="Person B Overview" />

      {/* Mobile KPI 2x2 */}
      <section className="grid grid-cols-2 gap-0 md:hidden mx-4 mt-[72px] bg-white border border-[#EBEBEB] rounded-[12px]">
        {kpiStats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className={`p-3 ${i % 2 === 0 ? 'border-r border-b border-[#EBEBEB]' : 'border-b border-[#EBEBEB]'} ${i >= 2 ? 'border-b-0' : ''}`}>
              <div className="flex items-start gap-2">
                <div className="w-8 h-8 rounded-full bg-[#E6F8FD] flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-[#00B6E2]" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <p className="text-[11px] font-medium text-[#5C5C5C]">{stat.label}</p>
                  <span className={`text-[16px] font-semibold ${stat.valClass}`}>{stat.value}</span>
                  <span className="text-[10px] text-[#5C5C5C]">{stat.subtext}</span>
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* Desktop KPI row */}
      <section className="hidden md:grid grid-cols-1 lg:grid-cols-4 mx-4 md:mx-6 mt-6 bg-white border border-[#EBEBEB] rounded-[12px] items-center p-5">
        {kpiStats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="flex items-center gap-4 px-4 py-2">
              <div className="w-10 h-10 rounded-full bg-[#E6F8FD] flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-[#00B6E2]" />
              </div>
              <div className="flex flex-col gap-[2px]">
                <p className="text-[12px] font-medium text-[#5C5C5C] leading-tight">{stat.label}</p>
                <div className="flex items-baseline gap-2">
                  <span className={`text-[14px] font-semibold ${stat.valClass}`}>{stat.value}</span>
                  <span className="text-[12px] text-[#5C5C5C]">{stat.subtext}</span>
                </div>
              </div>
              {i < kpiStats.length - 1 && (
                <div className="hidden lg:block w-[1px] h-[37px] bg-[#EAECF0] ml-auto" />
              )}
            </div>
          );
        })}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 px-4 md:px-6 mt-6">
        <div className="bg-white border border-[#EBEBEB] rounded-[12px] p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-[#171717]">Recent Product Orders</h2>
            <Link href="/person-b/product-orders" className="text-[12px] text-[#00B6E2] font-medium hover:underline">View All</Link>
          </div>
          {recentPOs.length === 0 ? (
            <p className="text-[13px] text-[#5C5C5C]">No product orders yet.</p>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#EBEBEB] text-[12px] text-[#5C5C5C] font-medium">
                  <th className="py-2">Order ID</th>
                  <th className="py-2">Product Code</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F0F0]">
                {recentPOs.map((po) => (
                  <tr key={po.id}>
                    <td className="py-2.5 text-[13px] text-[#00B6E2] font-medium">
                      <Link href={`/person-b/product-orders/${po.id.replace('#', '')}`} className="hover:underline">{po.id}</Link>
                    </td>
                    <td className="py-2.5 text-[13px] text-[#5C5C5C]">{po.micron}</td>
                    <td className="py-2.5"><StatusBadge status={po.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="bg-white border border-[#EBEBEB] rounded-[12px] p-5 flex flex-col gap-4">
          <h2 className="text-[15px] font-semibold text-[#171717]">Stage Summary</h2>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-[#5C5C5C]">Winding</span>
              <span className="font-medium text-[#171717]">{productOrders.filter(p => p.stage === "Yet to Start" || p.stage === "Raw Material").length} pending</span>
            </div>
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-[#5C5C5C]">Spray</span>
              <span className="font-medium text-[#171717]">{productOrders.filter(p => p.stage === "Metallisation" || p.stage === "Slitting").length} pending</span>
            </div>
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-[#5C5C5C]">Completed</span>
              <span className="font-medium text-[#1CB061]">{poCompleted}</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
