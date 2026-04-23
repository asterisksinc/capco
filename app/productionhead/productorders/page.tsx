"use client";

import Link from "next/link";
import { Plus, X, ChevronDown, Search, Info, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import type { TableConfig } from "@/hooks/useTableControls";
import { useTableControls } from "@/hooks/useTableControls";
import { SortableHeader } from "@/components/table/SortableHeader";
import { TableToolbar } from "@/components/table/TableToolbar";
import { OptionsDropdown } from "@/components/table/OptionsDropdown";
import { FilterPopover, FilterChips, type FilterConfig, type FilterState, type EnumFilter, type TextFilter, type NumberRangeFilter } from "@/components/table/FilterPopover";
import { exportToExcel, convertDataToExportFormat } from "@/lib/exportExcel";
import { MobileHeader, MobileSpacer } from "@/components/MobileHeader";

const STATUS_OPTIONS = ["Yet to Start", "In-progress", "Completed"];
const STAGE_OPTIONS = ["Yet to Start", "Raw Material", "Metallisation", "Slitting", "Completed"];

const statusFilter: EnumFilter = { label: "Status", key: "status", options: STATUS_OPTIONS };
const stageFilter: EnumFilter = { label: "Stage", key: "stage", options: STAGE_OPTIONS };
const textFilters: TextFilter[] = [
  { label: "Product Code", key: "productCode", placeholder: "Search..." },
  { label: "Capacitor Type", key: "capacitorType" },
  { label: "Grade", key: "grade" },
];
const numberFilters: NumberRangeFilter[] = [
  { label: "Batch Size", minKey: "batchSizeMin", maxKey: "batchSizeMax" },
];

const filterConfig: FilterConfig = {
  enums: [statusFilter, stageFilter],
  texts: textFilters,
  numberRanges: numberFilters,
};

export type ProductOrderRow = {
  id: string;
  code: string;
  type: string;
  grade: string;
  batchSize: string;
  status: string;
  stage: string;
  timestamp: string;
  [key: string]: string; // for type safety in useTableControls
};

const productOrderConfig: TableConfig<ProductOrderRow> = {
  columns: [
    { key: "id", label: "Order ID", type: "text", sortable: true },
    { key: "code", label: "Product Code", type: "text", sortable: true },
    { key: "type", label: "Capacitor Type", type: "text", sortable: true },
    { key: "grade", label: "Grade", type: "text", sortable: true },
    { key: "batchSize", label: "Batch Size", type: "number", sortable: true },
    { 
      key: "status", 
      label: "Status", 
      type: "enum", 
      sortable: false, 
      filter: "dropdown", 
      options: ["Yet to Start", "In-progress", "Completed"] 
    },
    { 
      key: "stage", 
      label: "Stage", 
      type: "enum", 
      sortable: false, 
      filter: "dropdown", 
      options: ["Yet to Start", "Raw Material", "Metallisation", "Slitting", "Completed"] 
    },
    { key: "timestamp", label: "Created Timestamp", type: "date", sortable: true },
    { key: "options", label: "Action", type: "text", sortable: false }
  ],
};

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
  return <span className="inline-flex items-center px-2 py-0.5 rounded-[12px] bg-gray-100 text-gray-700 text-[12px] font-medium leading-tight">{status}</span>;
}

export default function SupervisorProductOrdersPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState({
    poId: "PO-CC-4567",
    productCode: "",
    capacitance: "",
    voltage: "",
    capacitorType: "",
    grade: "",
    tolerance: "",
    dielectric: "",
    batchSize: "",
    priority: "",
    customerName: "",
    customerReference: "",
    specialInstructions: ""
  });

  const generateProductOrderId = () => `PO-CC-${String(Date.now()).slice(-6)}`;

  const openNewOrderModal = () => {
    setFormData((current) => ({
      ...current,
      poId: generateProductOrderId(),
      productCode: "",
      capacitance: "",
      voltage: "",
      capacitorType: "",
      grade: "",
      tolerance: "",
      dielectric: "",
      batchSize: "",
      priority: "",
      customerName: "",
      customerReference: "",
      specialInstructions: "",
    }));
    setIsModalOpen(true);
  };

  const openEditModal = (order: ProductOrderRow) => {
    setFormData({
      poId: order.id,
      productCode: order.code,
      capacitance: "",
      voltage: "",
      capacitorType: order.type,
      grade: order.grade,
      tolerance: "",
      dielectric: "",
      batchSize: order.batchSize,
      priority: "",
      customerName: "",
      customerReference: "",
      specialInstructions: "",
    });
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

  const {
    processedData,
    sortConfig,
    handleSort,
    filters,
    handleFilterChange,
    dateRange,
    setDateRange
  } = useTableControls({ data: productOrders, config: productOrderConfig });

  const [tableFilters, setTableFilters] = useState<FilterState>(() => {
    const state: FilterState = {};
    state.status = [...STATUS_OPTIONS];
    state.stage = [...STAGE_OPTIONS];
    state.productCode = "";
    state.capacitorType = "";
    state.grade = "";
    state.batchSizeMin = "";
    state.batchSizeMax = "";
    return state;
  });

  const handleApplyFilters = (newFilters: FilterState) => {
    setTableFilters(newFilters);
  };

  const handleRemoveFilter = (key: string) => {
    if (key === "status") {
      setTableFilters({ ...tableFilters, status: [...STATUS_OPTIONS] });
    } else if (key === "stage") {
      setTableFilters({ ...tableFilters, stage: [...STAGE_OPTIONS] });
    } else if (key === "productCode") {
      setTableFilters({ ...tableFilters, productCode: "" });
    } else if (key === "capacitorType") {
      setTableFilters({ ...tableFilters, capacitorType: "" });
    } else if (key === "grade") {
      setTableFilters({ ...tableFilters, grade: "" });
    } else if (key === "batchSizeMin") {
      setTableFilters({ ...tableFilters, batchSizeMin: "", batchSizeMax: "" });
    }
  };

  const filteredData = processedData.filter((row) => {
    const f = tableFilters;
    if (!(f.status as string[])?.includes(row.status)) return false;
    if (!(f.stage as string[])?.includes(row.stage)) return false;
    if (f.productCode && !row.code.toLowerCase().includes((f.productCode as string).toLowerCase())) return false;
    if (f.capacitorType && row.type !== (f.capacitorType as string)) return false;
    if (f.grade && row.grade !== (f.grade as string)) return false;
    if (f.batchSizeMin && parseInt(row.batchSize) < parseInt(f.batchSizeMin as string)) return false;
    if (f.batchSizeMax && parseInt(row.batchSize) > parseInt(f.batchSizeMax as string)) return false;
    return true;
  });

  const handleCreateOrder = () => {
    if (
      !formData.productCode ||
      !formData.capacitorType ||
      !formData.grade ||
      !formData.batchSize
    ) {
      return;
    }

    const now = new Date();
    const timestamp = `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}:${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
    const generatedOrderId = formData.poId.trim() || generateProductOrderId();
    const normalizedId = generatedOrderId.startsWith("#")
      ? formData.poId.trim()
      : `#${generatedOrderId}`;

    const newOrder: ProductOrderRow = {
      id: normalizedId,
      code: formData.productCode,
      type: formData.capacitorType,
      grade: formData.grade.toUpperCase(),
      batchSize: formData.batchSize,
      status: "Yet to Start",
      stage: "Yet to Start",
      timestamp,
    };

    setProductOrders((prev) => [newOrder, ...prev]);
    setIsModalOpen(false);
    setFormData({
      poId: generateProductOrderId(),
      productCode: "",
      capacitance: "",
      voltage: "",
      capacitorType: "",
      grade: "",
      tolerance: "",
      dielectric: "",
      batchSize: "",
      priority: "",
      customerName: "",
      customerReference: "",
      specialInstructions: ""
    });
  };

  const searchedData = filteredData.filter((row) =>
    row.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="font-dm-sans min-h-[calc(100vh-72px)] bg-white flex flex-col relative w-full max-w-full">
      <MobileHeader title="Product Orders" />

      {/* Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#171717]/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-[12px] w-full max-w-[700px]  flex flex-col overflow-hidden max-h-[90vh]">
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
            
            <div className="flex flex-col gap-8 px-6 py-6 overflow-y-auto custom-scrollbar">
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
        <div className="w-full px-4 md:px-6 pt-[72px] pb-4 md:pt-6 md:pb-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 h-auto">
          <div className="flex flex-col gap-1">
            <h1 className="text-[18px] font-semibold text-[#171717] leading-tight">Product Orders</h1>
            <p className="text-[14px] font-normal text-[#5C5C5C] leading-tight hidden md:block">
              Manage orders
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
      <div className="w-full px-4 md:px-6 flex flex-col mt-6 gap-4 md:gap-6 mb-6">
        
        {/* Stats Section - Mobile 2x2 grid */}
        <section className="grid grid-cols-2 gap-0 md:hidden bg-white border border-[#EBEBEB] rounded-[12px]">
          {[
            { title: "Total Orders", value: "148", valClass: "text-[#171717]", subtextClass: "text-[#5C5C5C]", subtext: "" },
            { title: "Units Planned", value: "24,500", valClass: "text-[#171717]", subtextClass: "text-[#5C5C5C]", subtext: "" },
            { title: "In Progress", value: "32", valClass: "text-[#171717]", subtextClass: "text-[#5C5C5C]", subtext: "" },
            { title: "Completed", value: "116", valClass: "text-[#171717]", subtextClass: "text-[#5C5C5C]", subtext: "" },
          ].map((stat, i) => (
            <div key={i} className={`p-3 ${i % 2 === 0 ? 'border-r border-b border-[#EBEBEB]' : 'border-b border-[#EBEBEB]'}`}>
              <div className="flex flex-col gap-1">
                <p className="text-[11px] font-medium text-[#5C5C5C]">{stat.title}</p>
                <span className={`text-[16px] font-semibold ${stat.valClass}`}>{stat.value}</span>
              </div>
            </div>
          ))}
        </section>

        {/* Desktop Stats */}
        <section className="hidden md:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 bg-white border border-[#EBEBEB] rounded-[12px] items-center p-5">
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
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Product Order ID..." 
              className="h-[40px] w-full pl-9 pr-3 bg-white border border-[#EBEBEB] rounded-[8px] text-[14px] text-[#171717] placeholder:text-[#A1A1AA] focus:outline-none focus:border-[#00B6E2] " 
            />
          </div>
          
          <TableToolbar
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            onExport={() => {
              const exportData = searchedData.map(row => ({
                "Order ID": row.id,
                "Product Code": row.code,
                "Capacitor Type": row.type,
                "Grade": row.grade,
                "Batch Size": row.batchSize,
                "Status": row.status,
                "Stage": row.stage,
                "Created Timestamp": row.timestamp,
              }));
              exportToExcel(exportData, "product-orders", "Product Orders");
            }}
            filterConfig={filterConfig}
            filters={tableFilters}
            onApplyFilters={handleApplyFilters}
          />
        </section>

        {/* Active Filter Chips */}
        <FilterChips config={filterConfig} filters={tableFilters} onRemove={handleRemoveFilter} />

        {/* Data Table */}
        <section className="bg-white border border-[#EBEBEB] rounded-[12px] flex flex-col gap-4 overflow-hidden shadow-sm">
          <div className="border border-[#EAECF0] rounded-[8px] overflow-x-auto min-h-[400px]">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-[#F5F7FA] border-b border-[#EBEBEB]">
                  {productOrderConfig.columns.map((col) => (
                    <th key={String(col.key)} className="px-4 py-[11px]">
                      <SortableHeader
                        column={col}
                        sortConfig={sortConfig}
                        onSort={handleSort}
                        filters={filters}
                        onFilterChange={handleFilterChange}
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAECF0]">
                {searchedData.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-4 py-4 text-[14px] text-[#5C5C5C] font-medium whitespace-nowrap">
                      <Link href={`/productionhead/productorders/${row.id.replace('#', '')}`} className="hover:text-[#00B6E2] hover:underline cursor-pointer">
                        {row.id}
                      </Link>
                    </td>
                    <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.code}</td>
                    <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.type}</td>
                    <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.grade}</td>
                    <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.batchSize}</td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <StatusBadge status={row.stage} />
                    </td>
                    <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.timestamp}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <OptionsDropdown 
                        viewHref={`/productionhead/productorders/${row.id.replace('#', '')}`}
                        status={row.status}
                        onEdit={() => openEditModal(row)}
                        onDelete={() => {
                          if (confirm(`Are you sure you want to delete ${row.id}?`)) {
                            setProductOrders(prev => prev.filter(p => p.id !== row.id));
                          }
                        }}
                      />
                    </td>
                  </tr>
                ))}
                {searchedData.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-1 py-8 text-center text-[14px] text-[#5C5C5C]">
                      No product orders found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Footer */}
          <div className="flex items-center justify-between border-t border-[#EAECF0] pt-4 mt-2">
            <p className="text-[14px] text-[#5C5C5C]">
              Showing <span className="font-semibold text-[#171717]">{searchedData.length}</span> documents
            </p>
            <div className="flex items-center gap-1">
              <button className="w-8 h-8 flex items-center justify-center rounded-[6px] border border-[#EBEBEB] text-[#5C5C5C] hover:bg-gray-50 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button className="w-8 h-8 flex items-center justify-center rounded-[6px] bg-[#00B6E2] text-white font-medium text-[14px]">
                1
              </button>
              <button className="w-8 h-8 flex items-center justify-center rounded-[6px] border border-[#EBEBEB] text-[#5C5C5C] hover:bg-gray-50 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}

