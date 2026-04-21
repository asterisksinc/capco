"use client";

import Link from "next/link";
import { Plus, X, ChevronDown, Search, Info, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

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

  const filteredProductOrders = productOrders.filter((row) =>
    row.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
              Lorem ipsum dolor sit amet, consectetur adipiscing elit
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
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Product Order ID..." 
              className="h-[40px] w-full pl-9 pr-3 bg-white border border-[#EBEBEB] rounded-[8px] text-[14px] text-[#171717] placeholder:text-[#A1A1AA] focus:outline-none focus:border-[#00B6E2] shadow-sm" 
            />
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative">
              <select className="h-[40px] appearance-none bg-white border border-[#EBEBEB] rounded-[8px] pl-3 pr-9 text-[14px] text-[#171717] focus:outline-none focus:border-[#00B6E2] shadow-sm font-medium">
                <option>This Month</option>
              </select>
              <ChevronDown className="w-4 h-4 text-[#525866] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <div className="relative">
              <select className="h-[40px] appearance-none bg-white border border-[#EBEBEB] rounded-[8px] pl-3 pr-9 text-[14px] text-[#171717] focus:outline-none focus:border-[#00B6E2] shadow-sm font-medium">
                <option>Completion Date</option>
              </select>
              <ChevronDown className="w-4 h-4 text-[#525866] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </section>

        {/* Data Table */}
        <section className="bg-white border border-[#EBEBEB] rounded-[12px] px-6 py-4 flex flex-col gap-4 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="border-b border-[#EBEBEB]">
                  <th className="px-1 py-[12px] text-[14px] font-semibold text-[#171717] w-[14%]">Order ID</th>
                  <th className="px-1 py-[12px] text-[14px] font-semibold text-[#171717] w-[12%]">Product Code</th>
                  <th className="px-1 py-[12px] text-[14px] font-semibold text-[#171717] w-[12%]">Capacitor Type</th>
                  <th className="px-1 py-[12px] text-[14px] font-semibold text-[#171717] w-[8%]">Grade</th>
                  <th className="px-1 py-[12px] text-[14px] font-semibold text-[#171717] w-[10%]">Batch Size</th>
                  <th className="px-1 py-[12px] text-[14px] font-semibold text-[#171717] w-[10%]">Status</th>
                  <th className="px-1 py-[12px] text-[14px] font-semibold text-[#171717] w-[10%]">Stage</th>
                  <th className="px-1 py-[12px] text-[14px] font-semibold text-[#171717] w-[16%]">Created Timestamp</th>
                  <th className="px-1 py-[12px] text-[14px] font-semibold text-[#171717] w-[8%]">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAECF0]">
                {filteredProductOrders.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-1 py-4 text-[14px] text-[#5C5C5C] font-medium whitespace-nowrap">{row.id}</td>
                    <td className="px-1 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.code}</td>
                    <td className="px-1 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.type}</td>
                    <td className="px-1 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.grade}</td>
                    <td className="px-1 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.batchSize}</td>
                    <td className="px-1 py-4 whitespace-nowrap">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-1 py-4 whitespace-nowrap">
                      <StatusBadge status={row.stage} />
                    </td>
                    <td className="px-1 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.timestamp}</td>
                    <td className="px-1 py-3 whitespace-nowrap">
                      <Link 
                        href={`/supervisor/productorders/${row.id.replace('#', '')}`}
                        className="inline-flex items-center justify-center px-5 py-[8px] bg-[#00B6E2] hover:bg-[#0092b5] text-white text-[14px] font-medium rounded-[6px] transition-colors"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
                {filteredProductOrders.length === 0 && (
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
              Showing <span className="font-semibold text-[#171717]">6</span> of <span className="font-semibold text-[#171717]">12</span> documents
            </p>
            <div className="flex items-center gap-1">
              <button className="w-8 h-8 flex items-center justify-center rounded-[6px] border border-[#EBEBEB] text-[#5C5C5C] hover:bg-gray-50 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button className="w-8 h-8 flex items-center justify-center rounded-[6px] bg-[#00B6E2] text-white font-medium text-[14px]">
                1
              </button>
              <button className="w-8 h-8 flex items-center justify-center rounded-[6px] border border-[#EBEBEB] text-[#5C5C5C] font-medium text-[14px] hover:bg-gray-50 transition-colors">
                2
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
