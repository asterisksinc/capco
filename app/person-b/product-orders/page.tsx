"use client";

import Link from "next/link";
import { Plus, X, ChevronDown, Search, Info, ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

type ProductOrderRow = {
  id: string;
  code: string;
  type: string;
  grade: string;
  batchSize: string;
  status: string;
  stage: string;
  timestamp: string;
};

type ProductOrderFormData = {
  poId: string;
  productCode: string;
  capacitance: string;
  voltage: string;
  capacitorType: string;
  grade: string;
  tolerance: string;
  dielectric: string;
  batchSize: string;
  priority: string;
  customerName: string;
  customerReference: string;
  specialInstructions: string;
};

type TimeFilter = "All Time" | "Today" | "This Month" | "Last 30 Days";
type SortOption =
  | "Newest First"
  | "Oldest First"
  | "Order ID (A-Z)"
  | "Order ID (Z-A)"
  | "Product Code (A-Z)"
  | "Batch Size (High-Low)"
  | "Batch Size (Low-High)"
  | "Grade (A-Z)";

const TIME_FILTER_OPTIONS: TimeFilter[] = ["All Time", "Today", "This Month", "Last 30 Days"];
const SORT_OPTIONS: SortOption[] = [
  "Newest First",
  "Oldest First",
  "Order ID (A-Z)",
  "Order ID (Z-A)",
  "Product Code (A-Z)",
  "Batch Size (High-Low)",
  "Batch Size (Low-High)",
  "Grade (A-Z)",
];

function createDefaultFormData(poId = "PO-CC-4567"): ProductOrderFormData {
  return {
    poId,
    productCode: "C-450V-100uF",
    capacitance: "100uF",
    voltage: "450V",
    capacitorType: "Motor",
    grade: "AA",
    tolerance: "±5%",
    dielectric: "Metallized Polypropylene",
    batchSize: "5000",
    priority: "High",
    customerName: "Apex Industrial Systems",
    customerReference: "APS-2026-041",
    specialInstructions: "Standard QC hold before dispatch.",
  };
}

function parseTimestamp(timestamp: string) {
  const separatorIndex = timestamp.indexOf(":");
  if (separatorIndex === -1) {
    return new Date(timestamp);
  }

  const datePart = timestamp.slice(0, separatorIndex);
  const timePart = timestamp.slice(separatorIndex + 1);
  const [day, month, year] = datePart.split("/").map(Number);
  const [hour, minute, second] = timePart.split(":").map(Number);
  return new Date(year, month - 1, day, hour, minute, second);
}

function isWithinTimeFilter(date: Date, filter: TimeFilter) {
  if (filter === "All Time") return true;

  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (filter === "Today") {
    return sameDay;
  }

  if (filter === "This Month") {
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  }

  const dayDiff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  return dayDiff >= 0 && dayDiff <= 30;
}

function compareProductOrders(a: ProductOrderRow, b: ProductOrderRow, sortOption: SortOption) {
  const batchA = Number.parseInt(a.batchSize, 10) || 0;
  const batchB = Number.parseInt(b.batchSize, 10) || 0;
  const dateA = parseTimestamp(a.timestamp).getTime();
  const dateB = parseTimestamp(b.timestamp).getTime();

  switch (sortOption) {
    case "Oldest First":
      return dateA - dateB;
    case "Order ID (A-Z)":
      return a.id.localeCompare(b.id);
    case "Order ID (Z-A)":
      return b.id.localeCompare(a.id);
    case "Product Code (A-Z)":
      return a.code.localeCompare(b.code);
    case "Batch Size (High-Low)":
      return batchB - batchA;
    case "Batch Size (Low-High)":
      return batchA - batchB;
    case "Grade (A-Z)":
      return a.grade.localeCompare(b.grade);
    case "Newest First":
    default:
      return dateB - dateA;
  }
}

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

export default function PersonBProductOrdersPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("All Time");
  const [sortOption, setSortOption] = useState<SortOption>("Newest First");
  const [currentPage, setCurrentPage] = useState(1);
  const [formData, setFormData] = useState<ProductOrderFormData>(() => createDefaultFormData());

  const generateProductOrderId = () => `PO-CC-${String(Date.now()).slice(-6)}`;

  const openNewOrderModal = () => {
    setFormData(createDefaultFormData(generateProductOrderId()));
    setIsModalOpen(true);
  };

  const [productOrders, setProductOrders] = useState<ProductOrderRow[]>(
    Array.from({ length: 8 }).map((_, index) => ({
      id: `#PO-CC-${String(4567 - index).padStart(4, "0")}`,
      code: "C-450V-100uF",
      type: "Motor",
      grade: "AA",
      batchSize: "5000",
      status: "Yet to Start",
      stage: "Yet to Start",
      timestamp: "19/03/2026:01:55:26",
    }))
  );

  const handleCreateOrder = () => {
    const nextFormData = {
      ...createDefaultFormData(generateProductOrderId()),
      ...formData,
    };

    const now = new Date();
    const timestamp = `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}:${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
    const generatedOrderId = nextFormData.poId.trim() || generateProductOrderId();
    const normalizedId = generatedOrderId.startsWith("#")
      ? generatedOrderId
      : `#${generatedOrderId}`;

    const newOrder: ProductOrderRow = {
      id: normalizedId,
      code: nextFormData.productCode,
      type: nextFormData.capacitorType,
      grade: nextFormData.grade.toUpperCase(),
      batchSize: nextFormData.batchSize,
      status: "Yet to Start",
      stage: "Yet to Start",
      timestamp,
    };

    setProductOrders((prev) => [newOrder, ...prev]);
    setIsModalOpen(false);
    setFormData(createDefaultFormData(generateProductOrderId()));
    setCurrentPage(1);
  };

  const filteredSortedProductOrders = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return [...productOrders]
      .filter((row) => {
        if (!query) return true;

        return [row.id, row.code, row.type, row.grade, row.batchSize, row.status, row.stage, row.timestamp]
          .some((value) => value.toLowerCase().includes(query));
      })
      .filter((row) => isWithinTimeFilter(parseTimestamp(row.timestamp), timeFilter))
      .sort((a, b) => compareProductOrders(a, b, sortOption));
  }, [productOrders, searchQuery, timeFilter, sortOption]);

  const pageSize = 6;
  const totalPages = Math.max(1, Math.ceil(filteredSortedProductOrders.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedProductOrders = filteredSortedProductOrders.slice(
    (safeCurrentPage - 1) * pageSize,
    safeCurrentPage * pageSize,
  );
  const rangeStart = filteredSortedProductOrders.length === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safeCurrentPage * pageSize, filteredSortedProductOrders.length);

  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1).slice(
    Math.max(0, safeCurrentPage - 2),
    Math.min(totalPages, safeCurrentPage + 1),
  );

  const goToPage = (page: number) => {
    const nextPage = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(nextPage);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleTimeFilterChange = (value: TimeFilter) => {
    setTimeFilter(value);
    setCurrentPage(1);
  };

  const handleSortChange = (value: SortOption) => {
    setSortOption(value);
    setCurrentPage(1);
  };

  return (
    <div className="font-dm-sans min-h-[calc(100vh-72px)] bg-[#FAFAFA] flex flex-col relative">
      {/* Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#171717]/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-[12px] w-full max-w-[700px] shadow-lg flex flex-col overflow-hidden max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-start justify-between px-6 py-5 border-b border-[#EBEBEB]">
              <div className="flex flex-col gap-1">
                <h2 className="text-[18px] font-semibold text-[#171717] leading-tight">Add New Product Order</h2>
                <p className="text-[14px] text-[#5C5C5C] leading-tight">Enter product specifications and planning details to create a new order.</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-[#5C5C5C] hover:text-[#171717] transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="flex flex-col gap-8 px-6 py-6 overflow-y-auto custom-scrollbar">
              
              {/* Capacitor Specification */}
              <div className="flex flex-col gap-5">
                <h3 className="text-[16px] font-medium text-[#171717] leading-tight border-b border-[#EBEBEB] pb-2">Capacitor Specification</h3>
                
                <div className="flex flex-col gap-2">
                  <label className="text-[14px] text-[#171717] leading-tight">Product Order ID</label>
                  <input 
                    type="text"
                    value={formData.poId}
                    readOnly
                    placeholder="PO-CC-000000"
                    className="w-full h-[44px] bg-[#F5F7FA] border border-[#EBEBEB] rounded-[8px] px-3 text-[14px] text-[#5C5C5C] focus:outline-none focus:border-[#00B6E2] transition-colors"
                  />
                  <div className="flex items-center gap-1.5 text-[12px] text-[#5C5C5C] mt-1">
                    <Info className="w-3.5 h-3.5" />
                    <p>Use format like PO-CC-4589 for easier tracking.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-5">
                  <div className="flex flex-col gap-2">
                    <label className="text-[14px] text-[#171717] leading-tight">Product Code / Moden No.</label>
                    <div className="relative">
                      <select 
                        value={formData.productCode}
                        onChange={(e) => setFormData({...formData, productCode: e.target.value})}
                        className="w-full h-[44px] bg-white border border-[#EBEBEB] rounded-[8px] px-3 text-[14px] text-[#5C5C5C] appearance-none focus:outline-none focus:border-[#00B6E2] transition-colors"
                      >
                        <option value="" disabled hidden>Select or Search Product Code...</option>
                        <option value="C-450V-100uF">C-450V-100uF</option>
                        <option value="C-630V-47uF">C-630V-47uF</option>
                        <option value="MKT-250V-22uF">MKT-250V-22uF</option>
                        <option value="MKP-400V-10uF">MKP-400V-10uF</option>
                        <option value="SNUB-1KV-1uF">SNUB-1KV-1uF</option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-[#525866] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[14px] text-[#171717] leading-tight">Capacitance Value</label>
                    <div className="relative">
                      <select 
                        value={formData.capacitance}
                        onChange={(e) => setFormData({...formData, capacitance: e.target.value})}
                        className="w-full h-[44px] bg-white border border-[#EBEBEB] rounded-[8px] px-3 text-[14px] text-[#5C5C5C] appearance-none focus:outline-none focus:border-[#00B6E2] transition-colors"
                      >
                        <option value="" disabled hidden>Select Value...</option>
                        <option value="1uF">1uF</option>
                        <option value="10uF">10uF</option>
                        <option value="22uF">22uF</option>
                        <option value="47uF">47uF</option>
                        <option value="100uF">100uF</option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-[#525866] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[14px] text-[#171717] leading-tight">Voltage Rating</label>
                    <div className="relative">
                      <select 
                        value={formData.voltage}
                        onChange={(e) => setFormData({...formData, voltage: e.target.value})}
                        className="w-full h-[44px] bg-white border border-[#EBEBEB] rounded-[8px] px-3 text-[14px] text-[#5C5C5C] appearance-none focus:outline-none focus:border-[#00B6E2] transition-colors"
                      >
                        <option value="" disabled hidden>Select Voltage Rating...</option>
                        <option value="63V">63V</option>
                        <option value="250V">250V</option>
                        <option value="400V">400V</option>
                        <option value="450V">450V</option>
                        <option value="630V">630V</option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-[#525866] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[14px] text-[#171717] leading-tight">Capacitor Type</label>
                    <div className="relative">
                      <select 
                        value={formData.capacitorType}
                        onChange={(e) => setFormData({...formData, capacitorType: e.target.value})}
                        className="w-full h-[44px] bg-white border border-[#EBEBEB] rounded-[8px] px-3 text-[14px] text-[#5C5C5C] appearance-none focus:outline-none focus:border-[#00B6E2] transition-colors"
                      >
                        <option value="" disabled hidden>Select type...</option>
                        <option value="Motor">Motor</option>
                        <option value="Snubber">Snubber</option>
                        <option value="Power">Power</option>
                        <option value="Lighting">Lighting</option>
                        <option value="General Purpose">General Purpose</option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-[#525866] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Grade & Tolerance */}
              <div className="flex flex-col gap-5">
                <h3 className="text-[16px] font-medium text-[#171717] leading-tight border-b border-[#EBEBEB] pb-2">Grade & Tolerance</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-5">
                  <div className="flex flex-col gap-2">
                    <label className="text-[14px] text-[#171717] leading-tight">Grade</label>
                    <div className="relative">
                      <select 
                        value={formData.grade}
                        onChange={(e) => setFormData({...formData, grade: e.target.value})}
                        className="w-full h-[44px] bg-white border border-[#EBEBEB] rounded-[8px] px-3 text-[14px] text-[#5C5C5C] appearance-none focus:outline-none focus:border-[#00B6E2] transition-colors"
                      >
                        <option value="" disabled hidden>Choose Grade...</option>
                        <option value="A+">A+</option>
                        <option value="AA">AA</option>
                        <option value="A">A</option>
                        <option value="B">B</option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-[#525866] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[14px] text-[#171717] leading-tight">Tolerance</label>
                    <div className="relative">
                      <select 
                        value={formData.tolerance}
                        onChange={(e) => setFormData({...formData, tolerance: e.target.value})}
                        className="w-full h-[44px] bg-white border border-[#EBEBEB] rounded-[8px] px-3 text-[14px] text-[#5C5C5C] appearance-none focus:outline-none focus:border-[#00B6E2] transition-colors"
                      >
                        <option value="" disabled hidden>Select Value...</option>
                        <option value="±1%">±1%</option>
                        <option value="±2%">±2%</option>
                        <option value="±5%">±5%</option>
                        <option value="±10%">±10%</option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-[#525866] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 col-span-1 sm:col-span-2">
                    <label className="text-[14px] text-[#171717] leading-tight">Dielectric Material</label>
                    <div className="relative">
                      <select 
                        value={formData.dielectric}
                        onChange={(e) => setFormData({...formData, dielectric: e.target.value})}
                        className="w-full h-[44px] bg-white border border-[#EBEBEB] rounded-[8px] px-3 text-[14px] text-[#5C5C5C] appearance-none focus:outline-none focus:border-[#00B6E2] transition-colors"
                      >
                        <option value="" disabled hidden>Select Material...</option>
                        <option value="Metallized Polypropylene">Metallized Polypropylene</option>
                        <option value="Metallized Polyester">Metallized Polyester</option>
                        <option value="Paper-Oil">Paper-Oil</option>
                        <option value="Ceramic Hybrid">Ceramic Hybrid</option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-[#525866] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Production Quantity */}
              <div className="flex flex-col gap-5">
                <h3 className="text-[16px] font-medium text-[#171717] leading-tight border-b border-[#EBEBEB] pb-2">Production Quantity</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-5">
                  <div className="flex flex-col gap-2">
                    <label className="text-[14px] text-[#171717] leading-tight">Batch Size</label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={formData.batchSize}
                      onChange={(e) => setFormData({...formData, batchSize: e.target.value})}
                      placeholder="Enter batch size"
                      className="w-full h-[44px] bg-[#FAFAFA] border border-[#EBEBEB] rounded-[8px] px-3 text-[14px] text-[#5C5C5C] placeholder:text-[#A1A1AA] focus:outline-none focus:border-[#00B6E2] transition-colors"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[14px] text-[#171717] leading-tight">Production Priority</label>
                    <div className="relative">
                      <select 
                        value={formData.priority}
                        onChange={(e) => setFormData({...formData, priority: e.target.value})}
                        className="w-full h-[44px] bg-white border border-[#EBEBEB] rounded-[8px] px-3 text-[14px] text-[#5C5C5C] appearance-none focus:outline-none focus:border-[#00B6E2] transition-colors"
                      >
                        <option value="" disabled hidden>Select Value...</option>
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        <option value="Critical">Critical</option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-[#525866] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                 

                  <div className="flex flex-col gap-2 col-span-1 sm:col-span-2">
                    <label className="text-[14px] text-[#171717] leading-tight">Special Instructions</label>
                    <textarea
                      rows={3}
                      value={formData.specialInstructions}
                      onChange={(e) => setFormData({ ...formData, specialInstructions: e.target.value })}
                      placeholder="Add any process notes, dispatch priority, or QC instructions..."
                      className="w-full bg-[#FAFAFA] border border-[#EBEBEB] rounded-[8px] px-3 py-2.5 text-[14px] text-[#5C5C5C] placeholder:text-[#A1A1AA] focus:outline-none focus:border-[#00B6E2] transition-colors resize-none"
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-6 py-5 bg-white border-t border-[#EBEBEB]">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="h-[40px] px-4 bg-white border border-[#EBEBEB] text-[#171717] text-[14px] font-medium rounded-[6px] hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateOrder}
                className="h-[40px] px-5 bg-[#00B6E2] text-white text-[14px] font-medium rounded-[6px] hover:bg-[#0092b5] transition-colors"
              >
                Create Product Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header section */}
      <section className="bg-white w-full flex justify-start border-b border-[#EBEBEB]">
        <div className="w-full px-6 py-6 pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 h-auto">
          <div className="flex flex-col gap-1">
            <h1 className="text-[18px] font-semibold text-[#171717] leading-tight">Product Orders</h1>
            <p className="text-[14px] font-normal text-[#5C5C5C] leading-tight">
              Manage and track all capacitor production orders in the facility.
            </p>
          </div>
          <button 
            onClick={openNewOrderModal}
            className="flex items-center justify-center gap-2 bg-[#00B6E2] text-white text-[14px] font-medium rounded-[6px] h-[40px] px-[18px] hover:bg-[#0092b5] transition-colors shrink-0"
          >
            <Plus className="w-5 h-5 shrink-0" strokeWidth={2.5} />
            <span className="leading-tight">Add Product Order</span>
          </button>
        </div>
      </section>

      {/* Main Content */}
      <div className="w-full px-6 flex flex-col gap-6 mt-6 mb-6">
        
        {/* Stats Section */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 bg-white border border-[#EBEBEB] rounded-[12px] items-center p-5 shadow-sm">
          <div className="flex items-center justify-between px-6 py-2 sm:py-0">
            <div className="flex flex-col gap-[8px]">
              <p className="text-[12px] font-medium text-[#5C5C5C] leading-tight">Total Product Orders</p>
              <div className="flex items-baseline gap-3">
                <span className="text-[20px] font-semibold leading-tight text-[#171717]">148</span>
                <span className="text-[12px] leading-tight text-[#5C5C5C]">
                  <span className="text-[#1CB061] font-medium">12%</span> vs Last Month
                </span>
              </div>
            </div>
            <div className="hidden lg:block w-[1px] h-[37px] bg-[#EAECF0]"></div>
          </div>
          
          <div className="flex items-center justify-between px-6 py-2 sm:py-0">
            <div className="flex flex-col gap-[8px]">
              <p className="text-[12px] font-medium text-[#5C5C5C] leading-tight">Units Planned</p>
              <div className="flex items-baseline gap-3">
                <span className="text-[20px] font-semibold leading-tight text-[#171717]">24,500</span>
                <span className="text-[12px] leading-tight text-[#5C5C5C]">
                  18 active SKUs
                </span>
              </div>
            </div>
            <div className="hidden lg:block w-[1px] h-[37px] bg-[#EAECF0]"></div>
          </div>

          <div className="flex items-center justify-between px-6 py-2 sm:py-0">
            <div className="flex flex-col gap-[8px]">
              <p className="text-[12px] font-medium text-[#5C5C5C] leading-tight">In-Progress Orders</p>
              <div className="flex items-baseline gap-3">
                <span className="text-[20px] font-semibold leading-tight text-[#171717]">37</span>
                <span className="text-[12px] leading-tight text-[#5C5C5C]">
                  <span className="text-[#1CB061] font-medium">+0.2%</span> vs Last Month
                </span>
              </div>
            </div>
            <div className="hidden lg:block w-[1px] h-[37px] bg-[#EAECF0]"></div>
          </div>

          <div className="flex items-center justify-between px-6 py-2 sm:py-0">
            <div className="flex flex-col gap-[8px]">
              <p className="text-[12px] font-medium text-[#5C5C5C] leading-tight">Pending Orders</p>
              <div className="flex items-baseline gap-3">
                <span className="text-[20px] font-semibold leading-tight text-[#171717]">22</span>
                <span className="text-[12px] leading-tight text-[#FB3748] font-medium">Critical</span>
              </div>
            </div>
          </div>
        </section>

        {/* Filters Row */}
        <section className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative max-w-[400px] w-full">
            <Search className="w-4 h-4 text-[#A1A1AA] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search by Product Order ID..." 
              className="h-[40px] w-full pl-9 pr-3 bg-white border border-[#EBEBEB] rounded-[8px] text-[14px] text-[#171717] placeholder:text-[#A1A1AA] focus:outline-none focus:border-[#00B6E2] shadow-sm" 
            />
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative">
              <select
                value={timeFilter}
                onChange={(e) => handleTimeFilterChange(e.target.value as TimeFilter)}
                className="h-[40px] appearance-none bg-white border border-[#EBEBEB] rounded-[8px] pl-3 pr-9 text-[14px] text-[#171717] focus:outline-none focus:border-[#00B6E2] shadow-sm font-medium"
              >
                {TIME_FILTER_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-[#525866] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <div className="relative">
              <select
                value={sortOption}
                onChange={(e) => handleSortChange(e.target.value as SortOption)}
                className="h-[40px] appearance-none bg-white border border-[#EBEBEB] rounded-[8px] pl-3 pr-9 text-[14px] text-[#171717] focus:outline-none focus:border-[#00B6E2] shadow-sm font-medium"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-[#525866] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </section>

        {/* Data Table */}
        <section className="bg-white border border-[#EBEBEB] rounded-[12px] p-0 flex flex-col gap-0 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[#EBEBEB] bg-[#F5F7FA]">
                  <th className="px-5 py-[12px] text-[12px] font-semibold uppercase tracking-wider text-[#5C5C5C] w-[14%]">Order ID</th>
                  <th className="px-5 py-[12px] text-[12px] font-semibold uppercase tracking-wider text-[#5C5C5C] w-[12%]">Product Code</th>
                  <th className="px-5 py-[12px] text-[12px] font-semibold uppercase tracking-wider text-[#5C5C5C] w-[12%]">Capacitor Type</th>
                  <th className="px-5 py-[12px] text-[12px] font-semibold uppercase tracking-wider text-[#5C5C5C] w-[8%]">Grade</th>
                  <th className="px-5 py-[12px] text-[12px] font-semibold uppercase tracking-wider text-[#5C5C5C] w-[10%]">Batch Size</th>
                  <th className="px-5 py-[12px] text-[12px] font-semibold uppercase tracking-wider text-[#5C5C5C] w-[10%]">Status</th>
                  <th className="px-5 py-[12px] text-[12px] font-semibold uppercase tracking-wider text-[#5C5C5C] w-[10%]">Stage</th>
                  <th className="px-5 py-[12px] text-[12px] font-semibold uppercase tracking-wider text-[#5C5C5C] w-[16%]">Created Timestamp</th>
                  <th className="px-5 py-[12px] text-[12px] font-semibold uppercase tracking-wider text-[#5C5C5C] w-[8%]">Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedProductOrders.map((row, idx) => (
                  <tr key={idx} className="border-b border-[#EBEBEB] last:border-b-0 hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4 text-[14px] font-medium text-[#5C5C5C] whitespace-nowrap">{row.id}</td>
                    <td className="px-5 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.code}</td>
                    <td className="px-5 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.type}</td>
                    <td className="px-5 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.grade}</td>
                    <td className="px-5 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.batchSize}</td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <StatusBadge status={row.stage} />
                    </td>
                    <td className="px-5 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.timestamp}</td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <Link 
                        href={`/person-b/product-orders/${row.id.replace('#', '')}`}
                        className="inline-flex items-center justify-center rounded-[6px] bg-[#00B6E2] px-4 py-[10px] text-[12px] font-medium text-white transition-colors hover:bg-[#0092b5]"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
                {paginatedProductOrders.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-5 py-8 text-center text-[14px] text-[#5C5C5C]">
                      No product orders found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="flex items-center justify-between border-t border-[#EAECF0] px-6 py-4">
            <p className="text-[14px] text-[#5C5C5C]">
              Showing <span className="font-semibold text-[#171717]">{rangeStart}</span> to <span className="font-semibold text-[#171717]">{rangeEnd}</span> of <span className="font-semibold text-[#171717]">{filteredSortedProductOrders.length}</span> documents
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => goToPage(safeCurrentPage - 1)}
                disabled={safeCurrentPage === 1}
                className="w-8 h-8 flex items-center justify-center rounded-[6px] border border-[#EBEBEB] text-[#5C5C5C] hover:bg-gray-50 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {pageNumbers.map((pageNumber) => (
                <button
                  key={pageNumber}
                  type="button"
                  onClick={() => goToPage(pageNumber)}
                  className={`w-8 h-8 flex items-center justify-center rounded-[6px] text-[14px] font-medium transition-colors ${
                    pageNumber === safeCurrentPage
                      ? "bg-[#00B6E2] text-white"
                      : "border border-[#EBEBEB] text-[#5C5C5C] hover:bg-gray-50"
                  }`}
                >
                  {pageNumber}
                </button>
              ))}
              <button
                type="button"
                onClick={() => goToPage(safeCurrentPage + 1)}
                disabled={safeCurrentPage === totalPages}
                className="w-8 h-8 flex items-center justify-center rounded-[6px] border border-[#EBEBEB] text-[#5C5C5C] hover:bg-gray-50 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
