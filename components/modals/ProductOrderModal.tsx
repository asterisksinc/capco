import React, { useState, useEffect } from "react";
import { X, ChevronDown } from "lucide-react";

export type ProductOrderFormData = {
  poId: string;
  micron: string;
  width: string;
  product: string;
  grade: string;
  specifications: string;
  quantity: string;
  customer: string;
  instructions: string;
};

type ProductOrderModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ProductOrderFormData, isEditMode: boolean) => void;
  initialData?: ProductOrderFormData | null;
  generateId?: () => string;
};

export function ProductOrderModal({ isOpen, onClose, onSubmit, initialData, generateId }: ProductOrderModalProps) {
  const isEditMode = !!initialData;
  const [formData, setFormData] = useState<ProductOrderFormData>({
    poId: "",
    micron: "",
    width: "",
    product: "",
    grade: "",
    specifications: "",
    quantity: "",
    customer: "",
    instructions: "",
  });

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData(initialData);
      } else {
        setFormData({
          poId: generateId ? generateId() : `PO-CC-${String(Date.now()).slice(-6)}`,
          micron: "",
          width: "",
          product: "",
          grade: "",
          specifications: "",
          quantity: "",
          customer: "",
          instructions: "",
        });
      }
    }
  }, [isOpen, initialData, generateId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#171717]/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-[12px] w-full max-w-[700px] flex flex-col overflow-hidden max-h-[90vh]">
        <div className="flex items-start justify-between px-6 py-5 border-b border-[#EBEBEB]">
          <div className="flex flex-col gap-1">
            <h2 className="text-[18px] font-semibold text-[#171717] leading-tight">
              {isEditMode ? "Edit Product Order" : "Add New Product Order"}
            </h2>
            <p className="text-[14px] text-[#5C5C5C] leading-tight">
              Enter product specifications and planning details to create a new order.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[#5C5C5C] hover:text-[#171717] transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col gap-8 px-6 py-6 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[14px] font-medium text-[#171717]">Product Order ID <span className="text-[#FB3748]">*</span></label>
              <input type="text" disabled value={formData.poId} className="h-[40px] px-3 bg-[#F5F7FA] border border-[#EBEBEB] rounded-[8px] text-[14px] text-[#5C5C5C] focus:outline-none" />
            </div>
            <div className="flex flex-col gap-1.5 relative">
              <label className="text-[14px] font-medium text-[#171717]">Micron <span className="text-[#FB3748]">*</span></label>
              <select value={formData.micron} onChange={(e) => setFormData({ ...formData, micron: e.target.value })} className="h-[40px] pl-3 pr-9 bg-white border border-[#EBEBEB] rounded-[8px] text-[14px] text-[#171717] focus:outline-none focus:border-[#00B6E2] appearance-none">
                <option value="" disabled>Select Micron</option>
                {["3.5", "4 HT", "4.5 HT", "5.0", "5.5", "5.5 HT", "6.0", "6 HT", "6.5", "6.5 HT", "7.0", "7.5", "8.0", "9.0", "10.0", "12.0"].map(m => (
                  <option key={m} value={m}>{m}μm</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-[#5C5C5C] absolute right-3 top-[34px] pointer-events-none" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5 relative">
              <label className="text-[14px] font-medium text-[#171717]">Width (mm) <span className="text-[#FB3748]">*</span></label>
              <select value={formData.width} onChange={(e) => setFormData({ ...formData, width: e.target.value })} className="h-[40px] pl-3 pr-9 bg-white border border-[#EBEBEB] rounded-[8px] text-[14px] text-[#171717] focus:outline-none focus:border-[#00B6E2] appearance-none">
                <option value="" disabled>Select Width</option>
                {[...Array(12)].map((_, i) => (
                  <option key={i} value={String(25 + i * 5)}>{25 + i * 5}mm</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-[#5C5C5C] absolute right-3 top-[34px] pointer-events-none" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[14px] font-medium text-[#171717]">Product Type <span className="text-[#FB3748]">*</span></label>
              <select value={formData.product} onChange={(e) => setFormData({ ...formData, product: e.target.value })} className="h-[40px] pl-3 pr-9 bg-white border border-[#EBEBEB] rounded-[8px] text-[14px] text-[#171717] focus:outline-none focus:border-[#00B6E2] appearance-none">
                <option value="" disabled>Select Product</option>
                <option value="Zinc (Zn)">Zinc (Zn)</option>
                <option value="Aluminum (Al)">Aluminum (Al)</option>
                <option value="Zn-Al Alloy">Zn-Al Alloy</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[14px] font-medium text-[#171717]">Quality Grade</label>
              <select value={formData.grade} onChange={(e) => setFormData({ ...formData, grade: e.target.value })} className="h-[40px] pl-3 pr-9 bg-white border border-[#EBEBEB] rounded-[8px] text-[14px] text-[#171717] focus:outline-none focus:border-[#00B6E2] appearance-none">
                <option value="" disabled>Select Grade</option>
                {["A Grade", "B Grade", "Export Quality"].map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[14px] font-medium text-[#171717]">Specifications</label>
              <input type="text" placeholder="e.g. Heavy Edge 2.5 ohms" value={formData.specifications} onChange={(e) => setFormData({ ...formData, specifications: e.target.value })} className="h-[40px] px-3 bg-white border border-[#EBEBEB] rounded-[8px] text-[14px] text-[#171717] focus:outline-none focus:border-[#00B6E2]" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[14px] font-medium text-[#171717]">Target Quantity (kg) <span className="text-[#FB3748]">*</span></label>
              <input type="number" placeholder="Enter target quantity" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} className="h-[40px] px-3 bg-white border border-[#EBEBEB] rounded-[8px] text-[14px] text-[#171717] focus:outline-none focus:border-[#00B6E2]" />
            </div>
            <div className="flex flex-col gap-1.5 relative">
              <label className="text-[14px] font-medium text-[#171717]">Customer</label>
              <select value={formData.customer} onChange={(e) => setFormData({ ...formData, customer: e.target.value })} className="h-[40px] pl-3 pr-9 bg-white border border-[#EBEBEB] rounded-[8px] text-[14px] text-[#171717] focus:outline-none focus:border-[#00B6E2] appearance-none">
                <option value="">Select Customer</option>
                {["ElectroCap Industries", "PowerTech Global", "Volttronix Inc.", "MegaVolt Systems"].map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-[#5C5C5C] absolute right-3 top-[34px] pointer-events-none" />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[14px] font-medium text-[#171717]">Instructions</label>
            <textarea rows={3} placeholder="Add any special instructions..." value={formData.instructions} onChange={(e) => setFormData({ ...formData, instructions: e.target.value })} className="p-3 bg-white border border-[#EBEBEB] rounded-[8px] text-[14px] text-[#171717] focus:outline-none focus:border-[#00B6E2] resize-none"></textarea>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-6 border-t border-[#EBEBEB]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[14px] font-medium text-[#5C5C5C] bg-white border border-[#EBEBEB] rounded-[8px] hover:bg-[#F5F7FA] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onSubmit(formData, isEditMode)}
            disabled={!formData.micron || !formData.width || !formData.product || !formData.quantity}
            className="px-4 py-2 text-[14px] font-medium text-white bg-[#00B6E2] rounded-[8px] hover:bg-[#00A0E3] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isEditMode ? "Save Changes" : "Create Product Order"}
          </button>
        </div>
      </div>
    </div>
  );
}
