"use client";

import { use, useState } from "react";
import { Search, ChevronDown, Check, X } from "lucide-react";
import Link from "next/link";

type DetailPageProps = {
  params: Promise<{ detailpage: string }>;
};

export default function OperatorProductOrderDetail({ params }: DetailPageProps) {
  const { detailpage } = use(params);
  const displayId = detailpage.toUpperCase() || "WO-0001"; // keeping WO-0001 visually identical if needed, or PO-0001
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="font-dm-sans min-h-[calc(100vh-72px)] bg-white flex flex-col relative w-full pt-[72px] md:pt-0">
      
      {/* Header section similar to image */}
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

      {/* Detail grid matching Image 3 precisely */}
      <section className="px-6 py-6 border-b border-[#EBEBEB] grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-y-6 gap-x-4">
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

      {/* Table section matching Image 3 closely */}
      <section className="px-6 py-6 flex flex-col gap-4">
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
            <div className="relative w-[150px]">
              <select className="w-full h-[40px] px-3 pr-9 appearance-none border border-[#EBEBEB] rounded-[8px] text-[14px] text-[#171717] bg-white focus:outline-none focus:border-[#00B6E2]">
                <option>All</option>
              </select>
              <ChevronDown className="w-4 h-4 text-[#5C5C5C] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="h-[40px] px-4 bg-[#00B6E2] hover:bg-[#0092b5] text-white text-[14px] font-medium rounded-[8px] flex items-center justify-center gap-2 whitespace-nowrap transition-colors"
            >
               + Pass to Next Stage
            </button>
          </div>
        </div>

        <div className="overflow-x-auto border border-[#EBEBEB] rounded-[8px]">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-[#F5F7FA] border-b border-[#EBEBEB]">
                <th className="px-5 py-[12px] text-[12px] font-semibold text-[#5C5C5C] uppercase tracking-wider">Stock ID</th>
                <th className="px-5 py-[12px] text-[12px] font-semibold text-[#5C5C5C] uppercase tracking-wider">Weight</th>
                <th className="px-5 py-[12px] text-[12px] font-semibold text-[#5C5C5C] uppercase tracking-wider">Width</th>
                <th className="px-5 py-[12px] text-[12px] font-semibold text-[#5C5C5C] uppercase tracking-wider">Micron</th>
                <th className="px-5 py-[12px] text-[12px] font-semibold text-[#5C5C5C] uppercase tracking-wider">Grade</th>
                <th className="px-5 py-[12px] text-[12px] font-semibold text-[#5C5C5C] uppercase tracking-wider">Status</th>
                <th className="px-5 py-[12px] text-[12px] font-semibold text-[#5C5C5C] uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EBEBEB]">
              <tr className="hover:bg-gray-50 transition-colors">
                <td className="px-5 py-4 text-[14px] font-medium text-[#5C5C5C]">PM-0001</td>
                <td className="px-5 py-4 text-[14px] text-[#5C5C5C]">58.5kgs</td>
                <td className="px-5 py-4 text-[14px] text-[#5C5C5C]">4.5</td>
                <td className="px-5 py-4 text-[14px] text-[#5C5C5C]">6.5</td>
                <td className="px-5 py-4 text-[14px] text-[#5C5C5C]">A</td>
                <td className="px-5 py-4">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-[12px] bg-[#FFF4ED] text-[#E19242] text-[12px] font-medium">Pending</span>
                </td>
                <td className="px-5 py-4">
                  <button className="text-[#FB3748] text-[13px] font-medium hover:underline">Remove</button>
                </td>
              </tr>
              <tr className="hover:bg-gray-50 transition-colors">
                <td className="px-5 py-4 text-[14px] font-medium text-[#5C5C5C]">PM-0001</td>
                <td className="px-5 py-4 text-[14px] text-[#5C5C5C]">58.5kgs</td>
                <td className="px-5 py-4 text-[14px] text-[#5C5C5C]">4.5</td>
                <td className="px-5 py-4 text-[14px] text-[#5C5C5C]">6.5</td>
                <td className="px-5 py-4 text-[14px] text-[#5C5C5C]">A</td>
                <td className="px-5 py-4">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-[12px] bg-[#E8F8F0] text-[#1CB061] text-[12px] font-medium">Approved</span>
                </td>
                <td className="px-5 py-4 text-[#5C5C5C] text-[14px]">-</td>
              </tr>
              <tr className="hover:bg-gray-50 transition-colors">
                <td className="px-5 py-4 text-[14px] font-medium text-[#5C5C5C]">PM-0001</td>
                <td className="px-5 py-4 text-[14px] text-[#5C5C5C]">58.5kgs</td>
                <td className="px-5 py-4 text-[14px] text-[#5C5C5C]">4.5</td>
                <td className="px-5 py-4 text-[14px] text-[#5C5C5C]">6.5</td>
                <td className="px-5 py-4 text-[14px] text-[#5C5C5C]">A</td>
                <td className="px-5 py-4">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-[12px] bg-[#FFF4ED] text-[#E19242] text-[12px] font-medium">Pending</span>
                </td>
                <td className="px-5 py-4">
                  <button className="text-[#FB3748] text-[13px] font-medium hover:underline">Remove</button>
                </td>
              </tr>
              <tr className="hover:bg-gray-50 transition-colors">
                <td className="px-5 py-4 text-[14px] font-medium text-[#5C5C5C]">PM-0001</td>
                <td className="px-5 py-4 text-[14px] text-[#5C5C5C]">58.5kgs</td>
                <td className="px-5 py-4 text-[14px] text-[#5C5C5C]">4.5</td>
                <td className="px-5 py-4 text-[14px] text-[#5C5C5C]">6.5</td>
                <td className="px-5 py-4 text-[14px] text-[#5C5C5C]">A</td>
                <td className="px-5 py-4">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-[12px] bg-[#FFF4ED] text-[#E19242] text-[12px] font-medium">Pending</span>
                </td>
                <td className="px-5 py-4">
                  <button className="text-[#FB3748] text-[13px] font-medium hover:underline">Remove</button>
                </td>
              </tr>
              <tr className="hover:bg-gray-50 transition-colors">
                <td className="px-5 py-4 text-[14px] font-medium text-[#5C5C5C]">PM-0001</td>
                <td className="px-5 py-4 text-[14px] text-[#5C5C5C]">58.5kgs</td>
                <td className="px-5 py-4 text-[14px] text-[#5C5C5C]">4.5</td>
                <td className="px-5 py-4 text-[14px] text-[#5C5C5C]">6.5</td>
                <td className="px-5 py-4 text-[14px] text-[#5C5C5C]">A</td>
                <td className="px-5 py-4">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-[12px] bg-[#E8F8F0] text-[#1CB061] text-[12px] font-medium">Approved</span>
                </td>
                <td className="px-5 py-4 text-[#5C5C5C] text-[14px]">-</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Pass to Next Stage Modal matching Image 2 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#171717]/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-[12px] w-full max-w-[600px] shadow-lg flex flex-col overflow-hidden max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#EBEBEB]">
              <h2 className="text-[18px] font-semibold text-[#171717]">Stage Transition</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-[#5C5C5C] hover:text-[#171717]">
                <X className="w-5 h-5"/>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex flex-col gap-6">
              {/* Search and Filter */}
              <div className="flex gap-4">
                <div className="relative w-full">
                  <Search className="w-[18px] h-[18px] text-[#5C5C5C] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input type="text" placeholder="Search" className="w-full h-[40px] pl-9 pr-3 rounded-[8px] border border-[#EBEBEB] text-[14px] focus:outline-none focus:border-[#00B6E2]" />
                </div>
                <div className="relative w-[180px] shrink-0">
                  <select className="w-full h-[40px] px-3 pr-9 appearance-none border border-[#EBEBEB] rounded-[8px] text-[14px] bg-white focus:outline-none focus:border-[#00B6E2]">
                    <option>All Grade</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-[#5C5C5C] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Items List */}
              <div className="flex flex-col gap-3">
                {/* Selected Item */}
                <div className="border border-[#00B6E2] rounded-[8px] bg-[#F5FBFE] p-4 flex flex-col gap-3 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-[#00B6E2]"></div>
                  <div className="flex items-center gap-3">
                    <div className="w-[18px] h-[18px] rounded border border-[#00B6E2] bg-[#00B6E2] flex items-center justify-center shrink-0 cursor-pointer">
                      <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                    </div>
                    <span className="font-semibold text-[#171717] text-[15px]">PM-0001</span>
                  </div>
                  <div className="grid grid-cols-2 ml-8 gap-y-2">
                    <p className="text-[13px] text-[#5C5C5C]"><span className="text-[#8F8F8F]">Weight:</span> 58.5kgs</p>
                    <p className="text-[13px] text-[#5C5C5C]"><span className="text-[#8F8F8F]">Width:</span> 4.5</p>
                    <p className="text-[13px] text-[#5C5C5C]"><span className="text-[#8F8F8F]">Micron:</span> 6.5</p>
                    <p className="text-[13px] text-[#5C5C5C]"><span className="text-[#8F8F8F]">Grade:</span> A</p>
                  </div>
                </div>

                {/* Unselected Item */}
                <div className="border border-[#EBEBEB] rounded-[8px] bg-white p-4 flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-[18px] h-[18px] rounded border border-[#C2C2C2] flex items-center justify-center shrink-0 cursor-pointer">
                    </div>
                    <span className="font-semibold text-[#171717] text-[15px]">PM-0002</span>
                  </div>
                  <div className="grid grid-cols-2 ml-8 gap-y-2">
                    <p className="text-[13px] text-[#5C5C5C]"><span className="text-[#8F8F8F]">Weight:</span> 58.5kgs</p>
                    <p className="text-[13px] text-[#5C5C5C]"><span className="text-[#8F8F8F]">Width:</span> 4.5</p>
                    <p className="text-[13px] text-[#5C5C5C]"><span className="text-[#8F8F8F]">Micron:</span> 6.5</p>
                    <p className="text-[13px] text-[#5C5C5C]"><span className="text-[#8F8F8F]">Grade:</span> A</p>
                  </div>
                </div>

                {/* Unselected Item */}
                <div className="border border-[#EBEBEB] rounded-[8px] bg-white p-4 flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-[18px] h-[18px] rounded border border-[#C2C2C2] flex items-center justify-center shrink-0 cursor-pointer">
                    </div>
                    <span className="font-semibold text-[#171717] text-[15px]">PM-0003</span>
                  </div>
                  <div className="grid grid-cols-2 ml-8 gap-y-2">
                    <p className="text-[13px] text-[#5C5C5C]"><span className="text-[#8F8F8F]">Weight:</span> 58.5kgs</p>
                    <p className="text-[13px] text-[#5C5C5C]"><span className="text-[#8F8F8F]">Width:</span> 4.5</p>
                    <p className="text-[13px] text-[#5C5C5C]"><span className="text-[#8F8F8F]">Micron:</span> 6.5</p>
                    <p className="text-[13px] text-[#5C5C5C]"><span className="text-[#8F8F8F]">Grade:</span> A</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t border-[#EBEBEB] bg-[#FAFAFA]">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2 text-[14px] font-medium text-[#171717] bg-white border border-[#EBEBEB] rounded-[6px] hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2 text-[14px] font-medium text-white bg-[#00B6E2] rounded-[6px] hover:bg-[#0092b5] transition-colors"
              >
                Passing to Next Stage
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}