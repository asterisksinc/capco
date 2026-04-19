"use client";

import Link from "next/link";
import { use } from "react";
import { 
  ChevronRight, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ChevronDown,
  AlertCircle
} from "lucide-react";

type DetailPageProps = {
  params: Promise<{ detailpage: string }>;
};

function StatusBadge({ status }: { status: string }) {
  if (status === "Yet to Start") {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-xl bg-[#FFF0F1] text-[#FB3748] text-xs font-medium leading-tight">Yet to Start</span>;
  }
  if (status === "In-progress" || status === "Pending") {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-xl bg-[#FFF4ED] text-[#E19242] text-xs font-medium leading-tight">In-progress</span>;
  }
  if (status === "Completed" || status === "Approved") {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-xl bg-[#E8F8F0] text-[#1CB061] text-xs font-medium leading-tight">Completed</span>;
  }
  return <span className="inline-flex items-center px-2 py-0.5 rounded-xl bg-gray-100 text-gray-600 text-xs font-medium leading-tight">{status}</span>;
}

export default function ProductOrderDetail({ params }: DetailPageProps) {
  const { detailpage } = use(params);
  const displayId = detailpage.toUpperCase();

  return (
    <div className="font-dm-sans min-h-[calc(100vh-72px)] bg-[#FAFAFA] flex flex-col md:px-6 md:py-6 p-4">
      {/* Breadcrumb & Header */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center gap-2 text-sm text-[#5C5C5C]">
          <Link href="/supervisor" className="hover:text-[#171717] transition-colors">Home</Link>
          <ChevronRight className="w-4 h-4" />
          <Link href="/supervisor/productorders" className="hover:text-[#171717] transition-colors">Work Orders</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-[#171717] font-medium">{displayId}</span>
        </div>

        <h1 className="text-xl md:text-2xl font-semibold text-[#171717]">
          {displayId} - Order Detail
        </h1>
      </div>

      {/* Top Stats Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-[#EBEBEB] rounded-xl p-4 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-[#E6F8FD] text-[#00B6E2] flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xl font-bold text-[#171717]">4 / 6</span>
            <span className="text-xs text-[#5C5C5C]">Stage Completed</span>
          </div>
        </div>

        <div className="bg-white border border-[#EBEBEB] rounded-xl p-4 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-[#E6F8FD] text-[#00B6E2] flex items-center justify-center">
            <span className="font-bold">U</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xl font-bold text-[#171717]">3,250</span>
            <span className="text-xs text-[#5C5C5C]">Units Processed</span>
          </div>
        </div>

        <div className="bg-white border border-[#EBEBEB] rounded-xl p-4 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-[#FFF4ED] text-[#E19242] flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xl font-bold text-[#171717]">+1.12 Hrs</span>
            <span className="text-xs text-[#5C5C5C]">Delay</span>
          </div>
        </div>

        <div className="bg-white border border-[#EBEBEB] rounded-xl p-4 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-[#E6F8FD] text-[#00B6E2] flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xl font-bold text-[#171717]">68%</span>
            <span className="text-xs text-[#5C5C5C]">Quality score</span>
          </div>
        </div>
      </section>

      {/* Detail Cards Row */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Left Card: Product Order Details */}
        <div className="bg-white border border-[#EBEBEB] rounded-xl p-6 shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-[#EBEBEB] pb-4">
            <h2 className="text-base font-semibold text-[#171717]">Product Order Details</h2>
            <div className="flex gap-2">
               <span className="bg-[#FFF4ED] text-[#E19242] text-xs font-semibold px-2 py-1 rounded-md uppercase tracking-wide">High Priority</span>
               <span className="bg-[#E6F8FD] text-[#00B6E2] text-xs font-semibold px-2 py-1 rounded-md tracking-wide">Epoxy Filling</span>
            </div>
          </div>
          
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center py-1">
              <span className="text-sm text-[#5C5C5C]">Order Number</span>
              <span className="text-sm font-medium text-[#171717]">{displayId}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-sm text-[#5C5C5C]">Capacitor Type</span>
              <span className="text-sm font-medium text-[#171717]">Film (MKT Series)</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-sm text-[#5C5C5C]">Grade</span>
              <span className="text-sm font-medium text-[#171717]">A - Premium</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-sm text-[#5C5C5C]">Batch Quantity</span>
              <span className="text-sm font-medium text-[#171717]">5,000 Units</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-sm text-[#5C5C5C]">Customer</span>
              <span className="text-sm font-medium text-[#171717]">Firm MKT SdnBhd</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-sm text-[#5C5C5C]">Tolerance</span>
              <span className="text-sm font-medium text-[#171717]">± 5%</span>
            </div>

            <div className="mt-2 bg-[#FFF9E6] border border-[#FDE0B4] p-3 rounded-lg flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-[#E19242] shrink-0" />
              <p className="text-sm text-[#E19242] font-medium">Priority production - Metallization grade is AA - QC</p>
            </div>
          </div>
        </div>

        {/* Right Card: Execution Summary */}
        <div className="bg-white border border-[#EBEBEB] rounded-xl p-6 shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-[#EBEBEB] pb-4">
            <h2 className="text-base font-semibold text-[#171717]">Execution Summary</h2>
            <button className="text-sm text-[#00B6E2] font-medium hover:underline flex items-center gap-1">
              View History <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center py-1">
              <span className="text-sm text-[#5C5C5C]">Current Stage</span>
              <span className="text-sm font-medium text-[#171717] bg-gray-100 px-2 py-0.5 rounded-md">Epoxy Filling</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-sm text-[#5C5C5C]">Started</span>
              <span className="text-sm font-medium text-[#171717]">01 Jan 2025, 09:30 AM</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-sm text-[#5C5C5C]">Deadline</span>
              <span className="text-sm font-medium text-[#171717]">31 Jan 2025, 09:00 PM</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-sm text-[#5C5C5C]">Next Stage</span>
              <span className="text-sm font-medium text-[#171717]">Test PV94 & Pack</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-sm text-[#5C5C5C]">Product Voltage</span>
              <span className="text-sm font-semibold text-[#1CB061] bg-[#E8F8F0] px-2 py-0.5 rounded-md">63 VDC</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-sm text-[#5C5C5C]">Remaining Quantity</span>
              <span className="text-sm font-medium text-[#171717]">1,750 Units Pending</span>
            </div>
            
            <div className="mt-2 flex items-center justify-between border-t border-[#EBEBEB] pt-4">
              <div className="flex items-center gap-3">
                 <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-sm">HI</div>
                 <div className="flex flex-col">
                   <span className="text-xs text-[#5C5C5C]">Supervisor</span>
                   <span className="text-sm font-medium text-[#171717]">Hasan Iqbal</span>
                 </div>
              </div>
              <button className="border border-[#EBEBEB] text-[#171717] text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                Raise Escalation
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Stage execution metrics */}
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-[#171717] mb-2">Stage execution metrics</h2>

        {/* Winding - Completed */}
        <div className="bg-white border border-[#EBEBEB] rounded-xl shadow-sm overflow-hidden mb-4">
          <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-[#EBEBEB] cursor-pointer hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3">
              <ChevronDown className="w-5 h-5 text-[#5C5C5C]" />
              <h3 className="text-base font-semibold text-[#171717]">Winding</h3>
              <StatusBadge status="Completed" />
            </div>
            <span className="text-sm text-[#5C5C5C]">03 Jan → 07 Jan</span>
          </div>
          
          <div className="p-6">
            <div className="overflow-x-auto border border-[#EBEBEB] rounded-lg">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-[#F5F7FA] border-b border-[#EBEBEB]">
                    <th className="px-4 py-3 text-xs font-semibold text-[#5C5C5C] uppercase">Material Ref</th>
                    <th className="px-4 py-3 text-xs font-semibold text-[#5C5C5C] uppercase">Roll Width (m)</th>
                    <th className="px-4 py-3 text-xs font-semibold text-[#5C5C5C] uppercase">Turns/Layer</th>
                    <th className="px-4 py-3 text-xs font-semibold text-[#5C5C5C] uppercase">Qty Wound</th>
                    <th className="px-4 py-3 text-xs font-semibold text-[#5C5C5C] uppercase">Rejected</th>
                    <th className="px-4 py-3 text-xs font-semibold text-[#5C5C5C] uppercase">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EBEBEB]">
                  <tr className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-[#00B6E2]">Polypropylene Film</td>
                    <td className="px-4 py-3 text-sm text-[#5C5C5C]">40mm</td>
                    <td className="px-4 py-3 text-sm text-[#5C5C5C]">120</td>
                    <td className="px-4 py-3 text-sm text-[#5C5C5C]">5050</td>
                    <td className="px-4 py-3 text-sm font-medium text-[#FB3748]">12</td>
                    <td className="px-4 py-3 text-sm text-[#5C5C5C]">Minor tension issue</td>
                  </tr>
                  <tr className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-[#00B6E2]">Aluminum Foil</td>
                    <td className="px-4 py-3 text-sm text-[#5C5C5C]">38mm</td>
                    <td className="px-4 py-3 text-sm text-[#5C5C5C]">120</td>
                    <td className="px-4 py-3 text-sm text-[#5C5C5C]">5045</td>
                    <td className="px-4 py-3 text-sm font-medium text-[#FB3748]">5</td>
                    <td className="px-4 py-3 text-sm text-[#5C5C5C]">Within tolerance</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center mt-4">
              <button className="text-sm text-[#00B6E2] font-medium flex items-center gap-1 hover:underline">
                <ChevronRight className="w-4 h-4" /> 2 Stage History
              </button>
              <div className="flex gap-3">
                <button className="border border-[#EBEBEB] text-[#171717] text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">Send Back</button>
                <button className="bg-[#00B6E2] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#0092b5] transition-colors">Approve</button>
              </div>
            </div>
          </div>
        </div>

        {/* Epoxy - In Progress */}
        <div className="bg-white border border-[#EBEBEB] rounded-xl shadow-sm overflow-hidden mb-4 border-l-4 border-l-[#E19242]">
          <div className="flex items-center justify-between px-6 py-4 bg-[#FFF9F5] border-b border-[#EBEBEB] cursor-pointer hover:bg-[#FFF4ED] transition-colors">
            <div className="flex items-center gap-3">
              <ChevronDown className="w-5 h-5 text-[#5C5C5C]" />
              <h3 className="text-base font-semibold text-[#171717]">Epoxy</h3>
              <StatusBadge status="In-progress" />
            </div>
            <span className="text-sm text-[#5C5C5C]">Started: 12 Jan 2025</span>
          </div>
          
          <div className="p-6">
            <div className="mb-4 bg-[#FFF0F1] border border-[#FDC2C8] p-3 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[#FB3748] shrink-0" />
              <p className="text-sm text-[#FB3748] font-medium">Cure oven temp variance detected - monitoring all materials</p>
            </div>

            <div className="overflow-x-auto border border-[#EBEBEB] rounded-lg">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-[#F5F7FA] border-b border-[#EBEBEB]">
                    <th className="px-4 py-3 text-xs font-semibold text-[#5C5C5C] uppercase">Material Ref</th>
                    <th className="px-4 py-3 text-xs font-semibold text-[#5C5C5C] uppercase">Epoxy Type</th>
                    <th className="px-4 py-3 text-xs font-semibold text-[#5C5C5C] uppercase">Fill %</th>
                    <th className="px-4 py-3 text-xs font-semibold text-[#5C5C5C] uppercase">Cure Status</th>
                    <th className="px-4 py-3 text-xs font-semibold text-[#5C5C5C] uppercase">Qty Completed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EBEBEB]">
                  <tr className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-[#00B6E2]">Polypropylene Film</td>
                    <td className="px-4 py-3 text-sm text-[#5C5C5C]">Araldite 2011</td>
                    <td className="px-4 py-3 text-sm text-[#5C5C5C]">72%</td>
                    <td className="px-4 py-3 text-sm text-[#E19242] font-medium">Pending</td>
                    <td className="px-4 py-3 text-sm text-[#5C5C5C]">3250</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center mt-4">
               <button className="text-sm text-[#00B6E2] font-medium flex items-center gap-1 hover:underline">
                <ChevronRight className="w-4 h-4" /> 1 Delay Flag
              </button>
              <div className="flex gap-3">
                <button className="border border-[#EBEBEB] text-[#171717] text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">Send Back</button>
                <button className="bg-[#00B6E2] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#0092b5] transition-colors shadow-sm">Save Progress</button>
              </div>
            </div>
          </div>
        </div>

        {/* Test PV94 & Pack - Not Started */}
        <div className="bg-white border border-[#EBEBEB] rounded-xl shadow-sm overflow-hidden mb-4 opacity-70">
          <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-[#EBEBEB]">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-gray-200" />
              <h3 className="text-base font-semibold text-[#171717]">Test PV94 & Pack</h3>
              <StatusBadge status="Not Started" />
            </div>
            <span className="text-sm text-[#5C5C5C]">Upcoming</span>
          </div>
        </div>

        {/* Finished Goods - Not Started */}
        <div className="bg-white border border-[#EBEBEB] rounded-xl shadow-sm overflow-hidden opacity-70">
          <div className="flex items-center justify-between px-6 py-4 bg-white">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-gray-200" />
              <h3 className="text-base font-semibold text-[#171717]">Finished Goods</h3>
              <StatusBadge status="Not Started" />
            </div>
            <span className="text-sm text-[#5C5C5C]">Upcoming</span>
          </div>
        </div>

      </section>
    </div>
  );
}