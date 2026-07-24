"use client";

import { TablePagination } from "@/components/table/TablePagination";
import { useState, useEffect, useMemo } from "react";
import { Plus, Search, X, Check, Package, Warehouse, Activity, Archive, QrCode, Download, Trash2, Mail, Loader2 } from "lucide-react";
import { inventoryService } from "@/src/services/inventoryService";
import { MobileHeader } from "@/components/MobileHeader";
import { QRCodeModal, type QRModalData } from "@/components/QRCodeModal";
import { ScannerInput } from "@/components/ScannerInput";
import * as XLSX from "xlsx";

import { productionStageService } from "@/src/services/productionStageService";

const micronOptions = ["2", "2.5", "3", "3.5", "4", "4.5", "4.5HT", "5", "5.5", "6", "6.5", "7", "7.5"];
const supplierOptions = ["VedaCap Industries", "ElectroForge Capacitors", "NextGen Metallic Pvt Ltd"];

function StatusBadge({ status }: { status: string }) {
  if (status === "In Inventory") {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-[12px] bg-[#E8F8F0] text-[#1CB061] text-[12px] font-medium leading-tight shrink-0">In Inventory</span>;
  }
  if (status === "Being Used") {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-[12px] bg-[#FFF4ED] text-[#E19242] text-[12px] font-medium leading-tight shrink-0">Being Used</span>;
  }
  if (status === "Returned") {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-[12px] bg-[#E6F7FF] text-[#00B6E2] text-[12px] font-medium leading-tight shrink-0">Returned</span>;
  }
  if (status === "Used Completely") {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-[12px] bg-[#F2F4F7] text-[#667085] text-[12px] font-medium leading-tight shrink-0">Used Completely</span>;
  }
  return <span className="inline-flex items-center px-2 py-0.5 rounded-[12px] bg-[#F2F4F7] text-[#667085] text-[12px] font-medium leading-tight shrink-0">{status || "Unknown"}</span>;
}

function getDateString() {
  const today = new Date();
  return `${String(today.getDate()).padStart(2, "0")}/${String(today.getMonth() + 1).padStart(2, "0")}/${today.getFullYear()}`;
}

function generateId(prefix: string) {
  return `${prefix}-${Math.floor(Math.random() * 10000).toString().padStart(4, "0")}`;
}

const defaultForm = {
  rawMaterialId: "",
  rollId: "",
  micron: "4.5",
  width: "30",
  weight: "",
  netWeight: "",
  grossWeight: "",
  usedWeight: "",
  wastageWeight: "",
  damagedWeight: "",
  temperature: "25°C",
  supplier: supplierOptions[0],
};

export default function AdminInventoryPage() {
  const [loading, setLoading] = useState(true);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [qrData, setQrData] = useState<QRModalData | null>(null);

  // Manual Add Form states
  const [addStep, setAddStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState({ ...defaultForm });
  const [showAddHint, setShowAddHint] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Export states
  const [exportFormat, setExportFormat] = useState<"xlsx" | "csv">("xlsx");
  const [sendEmail, setSendEmail] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("vmknexgentemp@gmail.com");
  const [isExporting, setIsExporting] = useState(false);

  const fetchInventory = async () => {
    try {
      const data = await inventoryService.list();

      const formatted = (data as any[]).map((item) => ({
        id: item.id,
        rawMaterialId: item.raw_material_code || "-",
        rollId: item.roll_no || "-",
        micron: item.micron != null ? String(item.micron) : "-",
        width: item.width_m != null ? String(item.width_m) : "-",
        weight: item.net_weight_kg != null ? `${item.net_weight_kg}kgs` : "-",
        netWeight: item.net_weight_kg != null ? `${item.net_weight_kg}kgs` : "-",
        grossWeight: item.gross_weight_kg != null ? `${item.gross_weight_kg}kgs` : "-",
        usedWeight: item.used_weight_kg != null ? `${item.used_weight_kg}kgs` : "-",
        wastageWeight: item.wastage_weight_kg != null ? `${item.wastage_weight_kg}kgs` : "-",
        damagedWeight: "-",
        temperature: item.temperature_c != null ? `${item.temperature_c}°C` : "-",
        supplier: item.supplier || "-",
        date: item.date_received ? new Date(item.date_received).toLocaleDateString("en-GB") : "-",
        status: item.status || "In Inventory"
      }));
      setInventoryItems(formatted);
    } catch (err) {
      console.error("Failed to load inventory:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  // Filtered rows
  const filteredData = useMemo(() => {
    return inventoryItems.filter((row) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        row.rawMaterialId.toLowerCase().includes(q) ||
        row.rollId.toLowerCase().includes(q) ||
        row.supplier.toLowerCase().includes(q)
      );
    });
  }, [inventoryItems, searchQuery]);


  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
  const validPage = Math.min(currentPage, totalPages);
  const paginatedData = filteredData.slice((validPage - 1) * pageSize, validPage * pageSize);

  const totalItems = inventoryItems.length;
  const inInventory = inventoryItems.filter((r) => r.status === "In Inventory").length;
  const beingUsed = inventoryItems.filter((r) => r.status === "Being Used").length;
  const usedUp = inventoryItems.filter((r) => r.status === "Used Completely").length;

  const kpiStats = [
    { label: "Total Raw Materials", value: String(totalItems), icon: Package, valClass: "text-[#171717]", subtext: "Lots in stock" },
    { label: "In Inventory", value: String(inInventory), icon: Warehouse, valClass: "text-[#1CB061]", subtext: "Available" },
    { label: "Being Used", value: String(beingUsed), icon: Activity, valClass: "text-[#E19242]", subtext: "In process" },
    { label: "Used Completely", value: String(usedUp), icon: Archive, valClass: "text-[#667085]", subtext: "Depleted" },
  ];

  // Form validity
  const isFormValid = () => {
    return Boolean(
      form.rawMaterialId.trim() &&
      form.rollId.trim() &&
      micronOptions.includes(form.micron) &&
      form.width.trim() &&
      form.netWeight.trim() &&
      Number(form.netWeight) > 0 &&
      form.grossWeight.trim() &&
      Number(form.grossWeight) > 0 &&
      form.temperature.trim() &&
      form.supplier.trim()
    );
  };

  function getNextSequentialIds(inventoryItems: any[]) {
    let maxRmId = 0;
    for (const row of inventoryItems) {
      const match = row.rawMaterialId?.match(/RM-(\d+)/);
      if (match) {
        maxRmId = Math.max(maxRmId, parseInt(match[1], 10));
      }
    }
    const nextRmId = `RM-${String(maxRmId + 1).padStart(4, "0")}`;

    const currentYear = new Date().getFullYear();
    let maxRollSeq = 0;
    for (const row of inventoryItems) {
      const match = row.rollId?.match(new RegExp(`RL-${currentYear}-(\\d+)`));
      if (match) {
        maxRollSeq = Math.max(maxRollSeq, parseInt(match[1], 10));
      }
    }
    const nextRollId = `RL-${currentYear}-${String(maxRollSeq + 1).padStart(3, "0")}`;

    return { nextRmId, nextRollId, nextRmIdNum: maxRmId + 1, nextRollSeqNum: maxRollSeq + 1 };
  }

  const openAddModal = () => {
    const { nextRmId, nextRollId } = getNextSequentialIds(inventoryItems);
    setForm({
      ...defaultForm,
      rawMaterialId: nextRmId,
      rollId: nextRollId,
    });
    setAddStep(1);
    setShowAddHint(false);
    setIsAddModalOpen(true);
  };

  const handleAddSubmit = async () => {
    if (!isFormValid()) {
      setShowAddHint(true);
      return;
    }
    setIsSubmitting(true);
    let success = false;
    let retries = 0;

    const { nextRmIdNum, nextRollSeqNum } = getNextSequentialIds(inventoryItems);
    let nextIdNum = nextRmIdNum;
    let rollSeqNum = nextRollSeqNum;
    const currentYear = new Date().getFullYear();
    let finalId = "";
    let finalRollId = "";

    while (!success && retries < 3) {
      finalId = `RM-${String(nextIdNum).padStart(4, "0")}`;
      finalRollId = `RL-${currentYear}-${String(rollSeqNum).padStart(3, "0")}`;
      try {
        await inventoryService.create({
          raw_material_code: finalId,
          roll_no: finalRollId,
          micron: Number(form.micron),
          width_m: Number(form.width),
          net_weight_kg: Number(form.netWeight),
          gross_weight_kg: Number(form.grossWeight),
          temperature_c: parseFloat(form.temperature) || 25,
          supplier: form.supplier,
          status: "In Inventory",
        });
        success = true;
      } catch (err: any) {
        // If it's a unique constraint violation on raw_material_code or roll_no, retry
        if (err?.message?.toLowerCase().includes("duplicate") || err?.code === "23505") {
          nextIdNum++;
          rollSeqNum++;
          retries++;
        } else {
          console.error(err);
          alert("Failed to add inventory item");
          setIsSubmitting(false);
          return;
        }
      }
    }

    if (success) {
      setForm(prev => ({ ...prev, rawMaterialId: finalId, rollId: finalRollId })); // update form with the actual IDs used
      await fetchInventory();
      setAddStep(3);
    } else {
      alert("Failed to generate unique RM ID / Roll ID after multiple attempts.");
    }
    setIsSubmitting(false);
  };

  const deleteInventoryItem = async (id: string, rawMaterialCode: string) => {
    if (confirm(`Are you sure you want to delete ${rawMaterialCode}?`)) {
      try {
        await inventoryService.remove(id);
        await fetchInventory();
      } catch (err) {
        console.error("Failed to delete", err);
        alert("Failed to delete item");
      }
    }
  };

  // CSV/Excel Import mapper
  const mapRowToInventoryItem = (row: any) => {
    const normalizedRow: Record<string, any> = {};
    for (const [key, val] of Object.entries(row)) {
      const normKey = key.toLowerCase().trim().replace(/[\s_-]+/g, "");
      normalizedRow[normKey] = val;
    }

    const rawMaterialId = normalizedRow["rawmaterialid"] || normalizedRow["materialid"] || normalizedRow["id"];
    const rollId = normalizedRow["rollid"] || normalizedRow["rollno"] || "";
    const micron = parseFloat(normalizedRow["micron"] || "4.5");
    const width = parseFloat(normalizedRow["width"] || "1.0");
    let weight = parseFloat(normalizedRow["weight"] || "0");
    let netWeight = parseFloat(normalizedRow["netweight"] || weight);
    let grossWeight = parseFloat(normalizedRow["grossweight"] || weight);
    let usedWeight = parseFloat(normalizedRow["usedweight"] || "0");
    let wastageWeight = parseFloat(normalizedRow["wastageweight"] || "0");
    let damagedWeight = parseFloat(normalizedRow["damagedweight"] || "0");
    const temperature = parseFloat(normalizedRow["temperature"] || "25");
    const supplier = normalizedRow["supplier"] || supplierOptions[0];
    let status = normalizedRow["status"] || "In Inventory";

    if (!rawMaterialId || !rollId) return null;

    return {
      raw_material_code: String(rawMaterialId).trim().toUpperCase(),
      roll_no: String(rollId).trim(),
      micron,
      width_m: width,
      net_weight_kg: netWeight,
      gross_weight_kg: grossWeight,
      used_weight_kg: usedWeight,
      wastage_weight_kg: wastageWeight,
      damaged_weight_kg: damagedWeight,
      temperature_c: temperature,
      supplier: String(supplier).trim(),
      status: (status === "Being Used" || status === "Used Completely") ? status : "In Inventory"
    };
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json<any>(worksheet);

        const validItems: any[] = [];
        let skippedCount = 0;

        json.forEach((row) => {
          const item = mapRowToInventoryItem(row);
          if (item) {
            validItems.push(item);
          } else {
            skippedCount++;
          }
        });

        if (validItems.length > 0) {
          await inventoryService.importRows(validItems as any[]);
          await fetchInventory();
        }

        alert(`Successfully imported ${validItems.length} raw material items. ${skippedCount} invalid rows skipped.`);
        setIsUploadModalOpen(false);
      } catch (err) {
        console.error(err);
        alert("Failed to parse file. Please verify that the Excel or CSV template is correct.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Export Flow
  const handleExportSubmit = async () => {
    if (inventoryItems.length === 0) {
      alert("No data available to export.");
      return;
    }

    setIsExporting(true);

    const exportData = inventoryItems.map((item) => ({
      "Raw Material ID": item.rawMaterialId,
      "Roll ID": item.rollId,
      "Micron": item.micron,
      "Width (m)": item.width,
      "Net Weight": item.netWeight ?? item.weight,
      "Gross Weight": item.grossWeight ?? "",
      "Used Weight": item.usedWeight ?? "",
      "Wastage Weight": item.wastageWeight ?? "",
      "Damaged Weight": item.damagedWeight ?? "",
      "Temperature": item.temperature ?? "",
      "Supplier": item.supplier,
      "Date": item.date,
      "Status": item.status,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory");

    const stamp = new Date().toISOString().slice(0, 10);
    const filename = `Capco_Inventory_Export_${stamp}.${exportFormat}`;

    // Download locally
    XLSX.writeFile(workbook, filename);

    // E-mail Automation via API Route
    if (sendEmail && recipientEmail.trim()) {
      const base64Data = XLSX.write(workbook, { bookType: exportFormat, type: "base64" });

      try {
        const res = await fetch("/api/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: recipientEmail.trim(),
            subject: `Capco Inventory Export (${stamp})`,
            message: `Hello,\n\nPlease find attached the exported Capco Capacitors Raw Materials Inventory sheet.\n\nBest regards,\nCapco Capacitors ERP`,
            attachmentBase64: base64Data,
            filename: filename,
          }),
        });

        const resData = await res.json();
        if (resData.ok) {
          alert(`File exported and email sent successfully to ${recipientEmail}!`);
        } else {
          alert(`File downloaded, but email dispatch failed: ${resData.error}`);
        }
      } catch (err: any) {
        alert(`File downloaded, but email dispatch crashed: ${err?.message || err}`);
      }
    } else {
      alert("File downloaded successfully!");
    }

    setIsExporting(false);
    setIsExportModalOpen(false);
  };

  return (
    <div className="font-dm-sans min-h-[calc(100vh-72px)] bg-white flex flex-col overflow-x-hidden">
      <MobileHeader title="Inventory" />

      {/* DESKTOP HEADER */}
      <section className="bg-white border-b border-[#EBEBEB] hidden md:block">
        <div className="px-6 py-6 flex items-center justify-between">
          <div className="flex flex-col">
            <h1 className="text-[20px] font-semibold text-[#171717]">Raw Materials Inventory</h1>
            <p className="text-[14px] text-[#5C5C5C] mt-1">
              Manage, import, export, and track your global production inputs.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setIsExportModalOpen(true)} className="h-[40px] px-4 bg-white border border-[#00B6E2] text-[#00B6E2] rounded-[6px] flex items-center gap-2 text-[14px] font-medium transition-colors hover:bg-[#F0FDFF]">
              <Download className="w-4.5 h-4.5" />
              Export Options
            </button>
            <button onClick={() => setIsUploadModalOpen(true)} className="h-[40px] px-4 bg-white border border-[#DDE1E8] text-[#171717] rounded-[6px] flex items-center gap-2 text-[14px] font-medium transition-colors hover:bg-[#F5F7FA]">
              Import CSV/Excel
            </button>
            <button onClick={openAddModal} className="h-[40px] px-4 bg-[#00B6E2] text-white rounded-[6px] flex items-center gap-2 text-[14px] font-medium hover:bg-[#0092b5] transition-colors">
              <Plus className="w-4.5 h-4.5" />
              Add Material
            </button>
          </div>
        </div>
      </section>

      {/* MOBILE PAGE TITLE */}
      <section className="px-4 pt-20 pb-4 md:hidden flex flex-col gap-3">
        <h1 className="text-[18px] font-semibold text-[#171717]">Raw Materials Inventory</h1>
        <div className="grid grid-cols-3 gap-2">
          <button onClick={openAddModal} className="h-[36px] bg-[#00B6E2] text-white rounded-[6px] text-[12px] font-medium flex items-center justify-center gap-1">
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
          <button onClick={() => setIsUploadModalOpen(true)} className="h-[36px] bg-white border border-[#DDE1E8] text-[#171717] rounded-[6px] text-[12px] font-medium flex items-center justify-center">
            Import
          </button>
          <button onClick={() => setIsExportModalOpen(true)} className="h-[36px] bg-white border border-[#00B6E2] text-[#00B6E2] rounded-[6px] text-[12px] font-medium flex items-center justify-center">
            Export
          </button>
        </div>
      </section>

      <div className="w-full px-4 md:px-6 py-6 flex flex-col gap-6">
        {/* KPI Stats - Mobile 2x2 grid */}
        <section className="grid grid-cols-2 gap-0 md:hidden bg-white border border-[#EBEBEB] rounded-[12px]">
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
                    <span className={`text-[16px] font-semibold ${stat.valClass}`}>{loading ? "-" : stat.value}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        {/* KPI Stats - Desktop row */}
        <section className="hidden md:grid grid-cols-1 lg:grid-cols-4 bg-white border border-[#EBEBEB] rounded-[12px] items-center p-5">
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
                    <span className={`text-[14px] font-semibold ${stat.valClass}`}>{loading ? "-" : stat.value}</span>
                    <span className="text-[12px] text-[#5C5C5C] ml-1">{stat.subtext}</span>
                  </div>
                </div>
                {i < kpiStats.length - 1 && (
                  <div className="hidden lg:block w-[1px] h-[37px] bg-[#EAECF0] ml-auto" />
                )}
              </div>
            );
          })}
        </section>

        {/* TOOLBAR */}
        <section className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:max-w-[400px]">
            <Search className="w-4 h-4 text-[#A1A1AA] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input type="text" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} placeholder="Search by RM ID, Roll ID, or Supplier..." className="h-[40px] w-full pl-9 pr-3 bg-white border border-[#EBEBEB] rounded-[8px] text-[14px] text-[#171717] placeholder:text-[#A1A1AA] focus:outline-none focus:border-[#00B6E2]" />
          </div>
        </section>

        {/* DATA TABLE */}
        <section className="bg-white rounded-[12px] flex flex-col gap-4 overflow-hidden border border-[#EBEBEB]">
          <div className="overflow-x-auto min-h-[300px]">
            <table className="w-full text-left border-collapse min-w-[1200px]">
              <thead>
                <tr className="bg-[#F5F7FA] border-b border-[#EBEBEB]">
                  <th className="px-4 py-[12px] text-[13px] font-semibold text-[#667085]">Raw Material ID</th>
                  <th className="px-4 py-[12px] text-[13px] font-semibold text-[#667085]">Roll ID</th>
                  <th className="px-4 py-[12px] text-[13px] font-semibold text-[#667085]">Micron</th>
                  <th className="px-4 py-[12px] text-[13px] font-semibold text-[#667085]">Width (m)</th>
                  <th className="px-4 py-[12px] text-[13px] font-semibold text-[#667085]">Net Weight</th>
                  <th className="px-4 py-[12px] text-[13px] font-semibold text-[#667085]">Gross Weight</th>
                  <th className="px-4 py-[12px] text-[13px] font-semibold text-[#667085]">Used Weight</th>
                  <th className="px-4 py-[12px] text-[13px] font-semibold text-[#667085]">Wastage/Left Weight</th>
                  <th className="px-4 py-[12px] text-[13px] font-semibold text-[#667085]">Damaged Weight</th>
                  <th className="px-4 py-[12px] text-[13px] font-semibold text-[#667085]">Temperature</th>
                  <th className="px-4 py-[12px] text-[13px] font-semibold text-[#667085]">Supplier</th>
                  <th className="px-4 py-[12px] text-[13px] font-semibold text-[#667085]">Date Received</th>
                  <th className="px-4 py-[12px] text-[13px] font-semibold text-[#667085]">QR Code</th>
                  <th className="px-4 py-[12px] text-[13px] font-semibold text-[#667085]">Status</th>
                  <th className="px-4 py-[12px] text-[13px] font-semibold text-[#667085]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EBEBEB]">
                {loading ? (
                  <tr>
                    <td colSpan={12} className="px-4 py-20 text-center">
                      <div className="flex justify-center items-center h-full">
                        <Loader2 className="w-8 h-8 animate-spin text-[#00B6E2]" />
                      </div>
                    </td>
                  </tr>
                ) : paginatedData.length > 0 ? (
                  paginatedData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-4 text-[14px] text-[#00B6E2] font-semibold whitespace-nowrap">{row.rawMaterialId}</td>
                      <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.rollId}</td>
                      <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.micron}</td>
                      <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.width}</td>
                      <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.netWeight ?? row.weight}</td>
                      <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.grossWeight ?? "-"}</td>
                      <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.usedWeight ?? "-"}</td>
                      <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.wastageWeight ?? "-"}</td>
                      <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.damagedWeight ?? "-"}</td>
                      <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.temperature ?? "-"}</td>
                      <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.supplier}</td>
                      <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.date}</td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <button onClick={() => setQrData({ id: row.rawMaterialId, type: "RM", data: { rollNo: row.rollId, micron: row.micron, width: row.width, netWeight: row.netWeight ?? row.weight, grossWeight: row.grossWeight ?? "-", temperature: row.temperature ?? "-", supplier: row.supplier, status: row.status } })} className="text-[#5C5C5C] hover:text-[#00B6E2] transition-colors p-1" title="View QR Code">
                          <QrCode className="w-4 h-4" />
                        </button>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap"><StatusBadge status={row.status} /></td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <button onClick={() => deleteInventoryItem(row.id, row.rawMaterialId)} className="text-[#5C5C5C] hover:text-[#FB3748] transition-colors p-1" title="Delete Material">
                          <Trash2 className="w-4.5 h-4.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={12} className="px-4 py-12 text-center text-[#5C5C5C] text-[14px]">No inventory raw materials found.</td></tr>
                )}
              </tbody>
            </table>
            <TablePagination currentPage={validPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </div>
        </section>
      </div>

      {/* MANUAL ADD MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#171717]/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-[16px] w-full max-w-[660px] shadow-lg flex flex-col overflow-hidden">
            <div className="flex items-start justify-between px-6 py-5 border-b border-[#EBEBEB]">
              <div className="flex flex-col gap-1">
                <h2 className="text-[18px] md:text-[24px] leading-tight font-semibold text-[#171717]">Add Inventory Item</h2>
                <p className="text-[11px] md:text-[14px] text-[#5C5C5C]">Record a new raw material received from supplier</p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-[#5C5C5C] hover:text-[#171717] transition-colors p-1"><X className="w-5 h-5" /></button>
            </div>

            <div className="max-h-[58vh] overflow-y-auto">
              {addStep === 1 && (
                <div className="px-6 py-6 flex flex-col gap-5">
                  <div className="rounded-[12px] border border-[#DDE1E8] p-4 bg-white">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="flex flex-col gap-2">
                        <label className="text-[13px] font-medium text-[#171717]">Raw Material ID</label>
                        <ScannerInput value={form.rawMaterialId} onChange={(e) => setForm({ ...form, rawMaterialId: e.target.value })} onScanData={(data) => setForm({ ...form, rawMaterialId: data })} placeholder="Auto or scan..." className="h-[42px] rounded-[8px] border border-[#DDE1E8] pl-3 text-[14px]" />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-[13px] font-medium text-[#171717]">Roll ID</label>
                        <input value={form.rollId} onChange={(e) => setForm({ ...form, rollId: e.target.value })} placeholder="Auto or enter" className="h-[42px] rounded-[8px] border border-[#DDE1E8] px-3 text-[14px]" />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-[13px] font-medium text-[#171717]">Micron</label>
                        <select value={form.micron} onChange={(e) => setForm({ ...form, micron: e.target.value })} className="h-[42px] rounded-[8px] border border-[#DDE1E8] px-3 text-[14px]">
                          {micronOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-[13px] font-medium text-[#171717]">Width (m)</label>
                        <input type="number" step="0.1" value={form.width} onChange={(e) => setForm({ ...form, width: e.target.value })} placeholder="Enter width" className="h-[42px] rounded-[8px] border border-[#DDE1E8] px-3 text-[14px]" />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-[13px] font-medium text-[#171717]">Net Weight (Kgs)</label>
                        <div className="relative">
                          <input type="number" min="0.1" step="0.1" value={form.netWeight} onChange={(e) => setForm({ ...form, netWeight: e.target.value })} placeholder="Enter net weight" className="h-[42px] w-full rounded-[8px] border border-[#DDE1E8] pl-3 pr-12 text-[14px]" />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-medium text-[#5C5C5C]">Kgs</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-[13px] font-medium text-[#171717]">Gross Weight (Kgs)</label>
                        <div className="relative">
                          <input type="number" min="0.1" step="0.1" value={form.grossWeight} onChange={(e) => setForm({ ...form, grossWeight: e.target.value })} placeholder="Enter gross weight" className="h-[42px] w-full rounded-[8px] border border-[#DDE1E8] pl-3 pr-12 text-[14px]" />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-medium text-[#5C5C5C]">Kgs</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-[13px] font-medium text-[#171717]">Temperature</label>
                        <input type="text" value={form.temperature} onChange={(e) => setForm({ ...form, temperature: e.target.value })} placeholder="e.g. 25°C" className="h-[42px] rounded-[8px] border border-[#DDE1E8] px-3 text-[14px]" />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-[13px] font-medium text-[#171717]">Supplier</label>
                        <select value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} className="h-[42px] rounded-[8px] border border-[#DDE1E8] px-3 text-[14px]">
                          {supplierOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                  {showAddHint && !isFormValid() && (
                    <p className="text-[12px] text-[#D92D20]">All fields are mandatory.</p>
                  )}
                </div>
              )}
              {addStep === 2 && (
                <div className="px-6 py-6 flex flex-col gap-5">
                  <div className="rounded-[10px] border border-[#DDE1E8] bg-[#FAFCFF] p-4">
                    <p className="text-[15px] font-semibold text-[#1F2937] mb-1">Review Details</p>
                    <p className="text-[13px] text-[#6B7280]">Confirm the inventory item details before adding.</p>
                  </div>
                  <div className="rounded-[12px] border border-[#78CFFA] bg-[#F4FBFF] p-4 grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-6 text-[14px] text-[#49526A]">
                    <p>RM ID: <span className="font-semibold text-black">{form.rawMaterialId}</span></p>
                    <p>Roll ID: <span className="font-semibold text-black">{form.rollId}</span></p>
                    <p>Micron: <span className="font-semibold text-black">{form.micron}</span></p>
                    <p>Width: <span className="font-semibold text-black">{form.width}</span></p>
                    <p>Net Weight: <span className="font-semibold text-black">{form.netWeight}kgs</span></p>
                    <p>Gross Weight: <span className="font-semibold text-black">{form.grossWeight}kgs</span></p>
                    <p>Temperature: <span className="font-semibold text-black">{form.temperature}</span></p>
                    <p>Supplier: <span className="font-semibold text-black">{form.supplier}</span></p>
                  </div>
                </div>
              )}
              {addStep === 3 && (
                <div className="px-6 py-8">
                  <div className="rounded-[16px] border border-[#D6EEF9] bg-[radial-gradient(circle_at_center,_#ECF8FD_0%,_#F8FCFF_45%,_#FFFFFF_100%)] p-8 md:p-10 flex flex-col items-center text-center gap-4">
                    <div className="w-13 md:w-16 h-13 md:h-16 rounded-full bg-[#E6F7FF] border border-[#9DDBF6] flex items-center justify-center">
                      <div className="w-7 md:w-10 h-7 md:h-10 rounded-full bg-[#00B6E2] flex items-center justify-center">
                        <Check className="w-4 md:w-6 h-4 md:h-6 text-white" />
                      </div>
                    </div>
                    <p className="text-[14px] lg:text-[27px] leading-tight text-[#171717] font-semibold">Inventory item added successfully.</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between px-6 py-5 bg-[#FAFAFA] border-t border-[#EBEBEB]">
              {addStep === 1 && (
                <>
                  <button onClick={() => setIsAddModalOpen(false)} className="h-[40px] px-4 bg-white border border-[#EBEBEB] text-[#171717] text-[14px] font-medium rounded-[6px] hover:bg-gray-50">Cancel</button>
                  <button onClick={() => { if (!isFormValid()) { setShowAddHint(true); return; } setShowAddHint(false); setAddStep(2); }}
                    className={`h-[40px] px-5 text-[14px] font-medium rounded-[6px] ${isFormValid() ? "bg-[#00B6E2] text-white hover:bg-[#0092b5]" : "bg-[#A7DDEB] text-white cursor-not-allowed"}`}>Next</button>
                </>
              )}
              {addStep === 2 && (
                <>
                  <button onClick={() => setAddStep(1)} disabled={isSubmitting} className="h-[40px] px-4 bg-white border border-[#EBEBEB] text-[#171717] text-[14px] font-medium rounded-[6px] hover:bg-gray-50">Back</button>
                  <button onClick={handleAddSubmit} disabled={isSubmitting}
                    className="h-[40px] px-5 text-[14px] font-medium rounded-[6px] bg-[#00B6E2] text-white hover:bg-[#0092b5] flex items-center gap-2">
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {isSubmitting ? "Adding..." : "Add to Inventory"}
                  </button>
                </>
              )}
              {addStep === 3 && (
                <button onClick={() => setIsAddModalOpen(false)} className="h-[40px] px-5 bg-[#00B6E2] text-white text-[14px] font-medium rounded-[6px] hover:bg-[#0092b5] ml-auto">Done</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* IMPORT EXCEL/CSV MODAL */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#171717]/40 backdrop-blur-sm" onClick={() => setIsUploadModalOpen(false)} />
          <div className="relative w-full max-w-[600px] bg-white rounded-[12px] shadow-lg flex flex-col overflow-hidden animate-slide-up">
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#EBEBEB]">
              <div>
                <h2 className="text-[18px] font-semibold text-[#171717]">Upload Material List</h2>
                <p className="text-[14px] text-[#5C5C5C] mt-1">Import Excel or CSV template sheets into raw materials inventory.</p>
              </div>
              <button onClick={() => setIsUploadModalOpen(false)} className="p-2 hover:bg-[#F5F7FA] rounded-[8px] transition-colors">
                <X className="w-5 h-5 text-[#5C5C5C]" />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-5">
              <div className="border-2 border-dashed border-[#00B6E2] bg-[#F0FDFF] rounded-[12px] flex flex-col items-center justify-center py-10 px-4 cursor-pointer hover:bg-[#E6F8FC] transition-colors relative">
                <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                <Package className="w-8 h-8 text-[#00B6E2] mb-2" />
                <span className="text-[15px] font-medium text-[#171717]">Click to upload or drag file here</span>
                <span className="text-[12px] text-[#5C5C5C] mt-1">Accepts CSV or Excel (.xlsx) files</span>
              </div>

              <div className="rounded-[8px] bg-[#F9FAFB] border border-[#EBEBEB] p-4 flex flex-col gap-2">
                <p className="text-[13px] font-semibold text-[#171717]">Template Setup</p>
                <p className="text-[12px] text-[#5C5C5C] leading-normal">
                  Make sure your file columns match the template: <span className="font-semibold text-black">Raw Material ID, Roll ID, Micron, Width, Net Weight, Gross Weight, Temperature, Supplier, Date, Status</span>.
                </p>
                <a href="/sample_inventory.csv" download className="text-[#00B6E2] hover:underline font-semibold text-[13px] mt-1 flex items-center gap-1.5 self-start">
                  <Download className="w-3.5 h-3.5" /> Download Sample CSV Template
                </a>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#EBEBEB] bg-[#FAFAFA]">
              <button onClick={() => setIsUploadModalOpen(false)} className="h-[38px] px-4 bg-white border border-[#EBEBEB] text-[#171717] text-[13px] font-medium rounded-[6px] hover:bg-[#F5F7FA]">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EXPORT OPTIONS MODAL */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#171717]/40 backdrop-blur-sm" onClick={() => setIsExportModalOpen(false)} />
          <div className="relative w-full max-w-[500px] bg-white rounded-[12px] shadow-lg flex flex-col overflow-hidden animate-slide-up">
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#EBEBEB]">
              <div>
                <h2 className="text-[18px] font-semibold text-[#171717]">Export Inventory Options</h2>
                <p className="text-[13px] text-[#5C5C5C] mt-0.5">Export logs locally and configure automated email delivery.</p>
              </div>
              <button onClick={() => setIsExportModalOpen(false)} className="p-2 hover:bg-[#F5F7FA] rounded-[8px] transition-colors">
                <X className="w-5 h-5 text-[#5C5C5C]" />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-5">
              <div className="flex flex-col gap-2.5">
                <label className="text-[13px] font-semibold text-[#171717]">Export Format</label>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setExportFormat("xlsx")} className={`h-[42px] border rounded-[8px] font-medium text-[13px] flex items-center justify-center gap-2 transition-colors ${exportFormat === "xlsx" ? "border-[#00B6E2] bg-[#F0FDFF] text-[#00B6E2]" : "border-[#EBEBEB] bg-white text-[#5C5C5C] hover:bg-gray-50"}`}>
                    Excel (.xlsx)
                  </button>
                  <button onClick={() => setExportFormat("csv")} className={`h-[42px] border rounded-[8px] font-medium text-[13px] flex items-center justify-center gap-2 transition-colors ${exportFormat === "csv" ? "border-[#00B6E2] bg-[#F0FDFF] text-[#00B6E2]" : "border-[#EBEBEB] bg-white text-[#5C5C5C] hover:bg-gray-50"}`}>
                    CSV (.csv)
                  </button>
                </div>
              </div>

              <div className="border-t border-[#EBEBEB] pt-4 flex flex-col gap-3">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} className="w-4 h-4 rounded text-[#00B6E2] focus:ring-[#00B6E2] border-gray-300" />
                  <span className="text-[13px] font-medium text-[#171717] flex items-center gap-1.5"><Mail className="w-4 h-4 text-[#5c5c5c]" /> Email exported file upon download</span>
                </label>

                {sendEmail && (
                  <div className="flex flex-col gap-1.5 mt-1 animate-fade-in">
                    <label className="text-[12px] font-semibold text-[#5C5C5C]">Recipient Email Address</label>
                    <input type="email" value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} placeholder="admin@example.com" className="h-[40px] px-3 border border-[#EBEBEB] rounded-[8px] text-[13px] text-black focus:outline-none focus:border-[#00B6E2]" />
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t border-[#EBEBEB] bg-[#FAFAFA]">
              <button onClick={() => setIsExportModalOpen(false)} className="h-[38px] px-4 bg-white border border-[#EBEBEB] text-[#171717] text-[13px] font-medium rounded-[6px] hover:bg-[#F5F7FA]">
                Cancel
              </button>
              <button onClick={handleExportSubmit} disabled={isExporting} className="h-[38px] px-5 bg-[#00B6E2] text-white text-[13px] font-medium rounded-[6px] hover:bg-[#0092b5] transition-colors flex items-center gap-1.5 disabled:opacity-50">
                {isExporting ? "Exporting..." : "Download & Export"}
              </button>
            </div>
          </div>
        </div>
      )}

      {qrData && <QRCodeModal id={qrData.id} type={qrData.type} data={qrData.data} onClose={() => setQrData(null)} />}
    </div>
  );
}