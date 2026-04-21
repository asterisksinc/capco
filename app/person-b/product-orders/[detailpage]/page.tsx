"use client";

import { use, useState } from "react";
import { Search } from "lucide-react";

type DetailPageProps = {
  params: Promise<{ detailpage: string }>;
};

type TabType = "Product Material" | "Winding" | "Spray";

export default function PersonBProductOrderDetail({ params }: DetailPageProps) {
  const { detailpage } = use(params);
  const displayId = (detailpage || "PO-0001").toUpperCase();
  const [activeTab, setActiveTab] = useState<TabType>("Winding");

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
             <div className="relative w-full max-w-[340px]">
              <Search className="w-[18px] h-[18px] text-[#5C5C5C] absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Search" 
                className="w-full h-[40px] pl-9 pr-3 rounded-[8px] border border-[#EBEBEB] text-[14px] focus:outline-none focus:border-[#00B6E2] placeholder:text-[#8F8F8F]"
               />
            </div>
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
            {activeTab === "Product Material" && (
               <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-[#F5F7FA] border-b border-[#EBEBEB]">
                    <th className="px-5 py-[12px] text-[12px] font-semibold text-[#171717] uppercase tracking-wider">STOCK ID</th>
                    <th className="px-5 py-[12px] text-[12px] font-semibold text-[#171717] uppercase tracking-wider">Linked WO ID</th>
                    <th className="px-5 py-[12px] text-[12px] font-semibold text-[#171717] uppercase tracking-wider">Weight</th>
                    <th className="px-5 py-[12px] text-[12px] font-semibold text-[#171717] uppercase tracking-wider">Width</th>
                    <th className="px-5 py-[12px] text-[12px] font-semibold text-[#171717] uppercase tracking-wider">Micron</th>
                    <th className="px-5 py-[12px] text-[12px] font-semibold text-[#171717] uppercase tracking-wider">Grade</th>
                    <th className="px-5 py-[12px] text-[12px] font-semibold text-[#171717] uppercase tracking-wider">Handover By</th>
                    <th className="px-5 py-[12px] text-[12px] font-semibold text-[#171717] uppercase tracking-wider">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EBEBEB]">
                  {Array(6).fill(null).map((_, i) => (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-4 text-[14px] font-medium text-[#5C5C5C]">PM-0001</td>
                      <td className="px-5 py-4 text-[14px] text-[#5C5C5C]">WO-0001</td>
                      <td className="px-5 py-4 text-[14px] text-[#5C5C5C]">58.5kgs</td>
                      <td className="px-5 py-4 text-[14px] text-[#5C5C5C]">4.5</td>
                      <td className="px-5 py-4 text-[14px] text-[#5C5C5C]">6.5</td>
                      <td className="px-5 py-4 text-[14px] text-[#5C5C5C]">A</td>
                      <td className="px-5 py-4 text-[14px] text-[#5C5C5C]">Person A</td>
                      <td className="px-5 py-4 text-[14px] text-[#5C5C5C]">10/01/2025: 08:24:20</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === "Winding" && (
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-[#F5F7FA] border-b border-[#EBEBEB]">
                    <th className="px-5 py-[12px] text-[12px] font-semibold text-[#171717] uppercase tracking-wider">WD-ID</th>
                    <th className="px-5 py-[12px] text-[12px] font-semibold text-[#171717] uppercase tracking-wider">Linked PM-ID</th>
                    <th className="px-5 py-[12px] text-[12px] font-semibold text-[#171717] uppercase tracking-wider">Film Width</th>
                    <th className="px-5 py-[12px] text-[12px] font-semibold text-[#171717] uppercase tracking-wider">Winding Tension</th>
                    <th className="px-5 py-[12px] text-[12px] font-semibold text-[#171717] uppercase tracking-wider">Turns Count</th>
                    <th className="px-5 py-[12px] text-[12px] font-semibold text-[#171717] uppercase tracking-wider">Quantity Wound</th>
                    <th className="px-5 py-[12px] text-[12px] font-semibold text-[#171717] uppercase tracking-wider">Stage</th>
                    <th className="px-5 py-[12px] text-[12px] font-semibold text-[#171717] uppercase tracking-wider">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EBEBEB]">
                  {Array(6).fill(null).map((_, i) => (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                       <td className="px-5 py-4 text-[14px] font-medium text-[#5C5C5C]">WD-0001</td>
                      <td className="px-5 py-4 text-[14px] text-[#5C5C5C]">PM-0001</td>
                      <td className="px-5 py-4 text-[14px] text-[#5C5C5C]">7mm</td>
                      <td className="px-5 py-4 text-[14px] text-[#5C5C5C]">0.5 N</td>
                      <td className="px-5 py-4 text-[14px] text-[#5C5C5C]">120</td>
                      <td className="px-5 py-4 text-[14px] text-[#5C5C5C]">250</td>
                      <td className="px-5 py-4 text-[14px] text-[#5C5C5C]">Spray</td>
                      <td className="px-5 py-4 text-[14px] text-[#5C5C5C]">10/01/2025: 08:24:20</td>
                     </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === "Spray" && (
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-[#F5F7FA] border-b border-[#EBEBEB]">
                    <th className="px-5 py-[12px] text-[12px] font-semibold text-[#171717] uppercase tracking-wider">SP-ID</th>
                    <th className="px-5 py-[12px] text-[12px] font-semibold text-[#171717] uppercase tracking-wider">Linked WD-ID</th>
                    <th className="px-5 py-[12px] text-[12px] font-semibold text-[#171717] uppercase tracking-wider">Spray Type</th>
                    <th className="px-5 py-[12px] text-[12px] font-semibold text-[#171717] uppercase tracking-wider">Feed Rate</th>
                    <th className="px-5 py-[12px] text-[12px] font-semibold text-[#171717] uppercase tracking-wider">Pressure Sitting</th>
                    <th className="px-5 py-[12px] text-[12px] font-semibold text-[#171717] uppercase tracking-wider">Stage</th>
                     <th className="px-5 py-[12px] text-[12px] font-semibold text-[#171717] uppercase tracking-wider">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EBEBEB]">
                  {Array(6).fill(null).map((_, i) => (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                       <td className="px-5 py-4 text-[14px] font-medium text-[#5C5C5C]">SP-0001</td>
                      <td className="px-5 py-4 text-[14px] text-[#5C5C5C]">WD-0001</td>
                      <td className="px-5 py-4 text-[14px] text-[#5C5C5C]">7mm</td>
                      <td className="px-5 py-4 text-[14px] text-[#5C5C5C]">0.5 N</td>
                      <td className="px-5 py-4 text-[14px] text-[#5C5C5C]">120</td>
                      <td className="px-5 py-4 text-[14px] text-[#5C5C5C]">Moved to Person C</td>
                      <td className="px-5 py-4 text-[14px] text-[#5C5C5C]">10/01/2025: 08:24:20</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}