"use client";

import { TablePagination } from "@/components/table/TablePagination";
import { useState, useEffect, useMemo } from "react";
import { Plus, Search, X, Check, Package, Warehouse, Activity, Archive, QrCode, Download, Trash2, Mail, Loader2, Edit2 } from "lucide-react";
import { inventoryService } from "@/src/services/inventoryService";
import { MobileHeader } from "@/components/MobileHeader";
import { QRCodeModal, type QRModalData } from "@/components/QRCodeModal";
import { ScannerInput } from "@/components/ScannerInput";
import * as XLSX from "xlsx";

import { productionStageService } from "@/src/services/productionStageService";
import { getAccessToken } from "@/src/services/supabaseClient";

const micronOptions = ["3", "3.5", "4", "4.5HT", "5", "5.5", "5.5HT", "6", "6HT", "6.5", "6.5HT", "7", "7.5", "8.0", "9.0", "10.0", "12.0"];
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

const createEmptyRow = (sno: number) => ({
  sno: String(sno),
  rollId: "",
  width: "",
  netWeight: "",
  grossWeight: "",
  packageNo: "",
  coreInch: "",
});

const createInitialRows = () =>
  Array.from({ length: 10 }, (_, index) => createEmptyRow(index + 1));

export default function AdminInventoryPage() {
  const [loading, setLoading] = useState(true);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [qrData, setQrData] = useState<QRModalData | null>(null);

  // Bulk Actions states
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkUpdateField, setBulkUpdateField] = useState<"Micron" | "Supplier" | "">("");
  const [bulkUpdateValue, setBulkUpdateValue] = useState("");

  // Upload Material states
  const [stagedBatches, setStagedBatches] = useState<{ id: number; rows: any[]; micron: string; supplier: string }[]>([]);
  const [activeBatchId, setActiveBatchId] = useState<number>(1);
  const [nextBatchId, setNextBatchId] = useState<number>(2);
  const [pasteGridRows, setPasteGridRows] = useState<any[]>(createInitialRows());
  const [uploadMicron, setUploadMicron] = useState(micronOptions[0]);
  const [uploadSupplier, setUploadSupplier] = useState(supplierOptions[0]);

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
        packageNo: item.package_no || "-",
        coreInch: item.core_inch != null ? String(item.core_inch) : "-",
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
        if (err?.message?.toLowerCase().includes("duplicate") || err?.micron === "23505") {
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

    const handleGridPaste = (e: React.ClipboardEvent, rowIndex: number, colIndex: number) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text");
    if (!pasteData) return;

    const rows = pasteData.split(/\r?\n/).filter(r => r.trim() !== "");
    const newGrid = [...pasteGridRows];

    rows.forEach((rowStr, i) => {
      const targetRowIndex = rowIndex + i;
      if (targetRowIndex >= newGrid.length) {
        newGrid.push({});
      }
      
      const cols = rowStr.split(/\t/);
      const rowObj = { ...newGrid[targetRowIndex] };
      
      const fieldNames = ["sno", "rollId", "width", "netWeight", "grossWeight", "packageNo", "coreInch"];
      
      cols.forEach((colVal, j) => {
        const targetColIndex = colIndex + j;
        if (targetColIndex < fieldNames.length) {
          rowObj[fieldNames[targetColIndex]] = colVal.trim();
        }
      });
      newGrid[targetRowIndex] = rowObj;
    });

    setPasteGridRows(newGrid.slice(0, 100));
  };

  const handleGridChange = (rowIndex: number, field: string, value: string) => {
    const newGrid = [...pasteGridRows];
    newGrid[rowIndex] = { ...newGrid[rowIndex], [field]: value };
    setPasteGridRows(newGrid);
  };

  const removeGridRow = (rowIndex: number) => {
    const newGrid = pasteGridRows.filter((_, i) => i !== rowIndex);
    if (newGrid.length === 0) newGrid.push({});
    setPasteGridRows(newGrid);
  };

  const handleAddBatch = () => {
    setStagedBatches([...stagedBatches, {
      id: activeBatchId,
      rows: pasteGridRows,
      micron: uploadMicron,
      supplier: uploadSupplier
    }]);
    setActiveBatchId(nextBatchId);
    setNextBatchId(prev => prev + 1);
    setPasteGridRows(createInitialRows());
    setUploadMicron(micronOptions[0]);
    setUploadSupplier(supplierOptions[0]);
  };

  const handleEditBatch = (batchId: number) => {
    const hasData = pasteGridRows.some(row => row.rollId && row.rollId.trim() !== "");
    let newStaged = [...stagedBatches];
    
    if (hasData) {
      newStaged.push({ id: activeBatchId, rows: pasteGridRows, micron: uploadMicron, supplier: uploadSupplier });
    }
    
    const batchToEdit = newStaged.find(b => b.id === batchId);
    if (batchToEdit) {
      newStaged = newStaged.filter(b => b.id !== batchId);
      setStagedBatches(newStaged);
      setActiveBatchId(batchToEdit.id);
      setPasteGridRows(batchToEdit.rows);
      setUploadMicron(batchToEdit.micron);
      setUploadSupplier(batchToEdit.supplier);
    }
  };

  const handleDeleteBatch = (batchId: number) => {
    if (confirm("Are you sure you want to delete this batch?")) {
      setStagedBatches(stagedBatches.filter(b => b.id !== batchId));
    }
  };

  const addGridRow = () => {
    if (pasteGridRows.length < 100) {
      setPasteGridRows([...pasteGridRows, {}]);
    }
  };

  const handleUploadSubmit = async () => {
    setIsSubmitting(true);
    try {
      const { nextRmIdNum } = getNextSequentialIds(inventoryItems);
      let currentRmIdNum = nextRmIdNum;
      
      // TODO: Once multi-batch backend support exists, loop over stagedBatches + active batch here
      const validRows = pasteGridRows.filter(row => row.rollId && row.rollId.trim() !== "");
      if (validRows.length === 0) {
        alert("No valid rows to import. Roll ID is required.");
        setIsSubmitting(false);
        return;
      }
      
      const finalRows = validRows.map((row) => {
        const rawMaterialCode = `RM-${String(currentRmIdNum).padStart(4, "0")}`;
        currentRmIdNum++;
        return {
          roll_no: String(row.rollId).trim(),
          width_m: parseFloat(row.width || "1.0"),
          net_weight_kg: parseFloat(row.netWeight || row.weight || "0"),
          gross_weight_kg: parseFloat(row.grossWeight || row.weight || "0"),
          used_weight_kg: 0,
          wastage_weight_kg: 0,
          damaged_weight_kg: 0,
          temperature_c: 25,
          package_no: String(row.packageNo || "").trim(),
          core_inch: parseFloat(row.coreInch || "0"),
          status: "In Inventory" as any,
          raw_material_code: rawMaterialCode,
          micron: Number(uploadMicron),
          supplier: uploadSupplier,
        };
      });

      await inventoryService.importRows(finalRows);
      await fetchInventory();
      alert(`Successfully imported ${finalRows.length} raw material items.`);
      setIsUploadModalOpen(false);
      setPasteGridRows(createInitialRows());
    } catch (err) {
      console.error(err);
      alert("Failed to import rows. There may be a conflict or network issue.");
    } finally {
      setIsSubmitting(false);
    }
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

  // Bulk Actions
  const toggleAllSelection = () => {
    if (selectedIds.size === paginatedData.length && paginatedData.length > 0) {
      setSelectedIds(new Set());
    } else {
      const newSelected = new Set(selectedIds);
      paginatedData.forEach(row => {
        if (row.id) newSelected.add(row.id);
      });
      setSelectedIds(newSelected);
    }
  };

  const toggleRowSelection = (id: string) => {
    if (!id) return;
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkUpdate = async () => {
    if (!bulkUpdateField || !bulkUpdateValue || selectedIds.size === 0) return;
    
    try {
      const token = getAccessToken();
      const payload: any = {
        inventoryIds: Array.from(selectedIds),
      };
      
      if (bulkUpdateField === "Micron") {
        payload.micron = Number(bulkUpdateValue);
      } else if (bulkUpdateField === "Supplier") {
        payload.supplier = bulkUpdateValue;
      }
       
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/inventory/bulk-update`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        let errMsg = "Bulk update failed";
        try {
          const rawText = await res.text();
          console.error(`Bulk update API failed with status ${res.status}:`, rawText);
          const errData = JSON.parse(rawText);
          errMsg = errData.error || errData.message || errMsg;
        } catch(e) {
          console.error("Failed to parse error response:", e);
        }
        
        if (res.status === 403) {
          throw new Error("You don't have permission to perform bulk updates");
        }
        throw new Error(errMsg);
      }
      
      const data = await res.json();
      
      if (data.ok && data.inventory) {
        setInventoryItems(prevItems => {
          const map = new Map(data.inventory.map((i: any) => [i.id, i]));
          return prevItems.map(item => map.has(item.id) ? { ...item, ...(map.get(item.id) as any) } : item);
        });
      }
      
      setSelectedIds(new Set());
      setIsBulkModalOpen(false);
      setBulkUpdateField("");
      setBulkUpdateValue("");
    } catch (err: any) {
      console.error(err);
      alert(err.message || "An error occurred during bulk update");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    
    // Optimistic UI Update
    const updatedItems = inventoryItems.filter(item => !selectedIds.has(item.id));
    setInventoryItems(updatedItems);
    
    // TODO: call inventoryService.remove(id) here once bulk-delete backend is ready
    // Array.from(selectedIds).forEach(id => {
    //   inventoryService.remove(id);
    // });
    
    setSelectedIds(new Set());
    setIsBulkModalOpen(false);
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
            <button onClick={() => { setPasteGridRows(createInitialRows());; setStagedBatches([]); setActiveBatchId(1); setNextBatchId(2); setIsUploadModalOpen(true); }} className="h-[40px] px-4 bg-white border border-[#DDE1E8] text-[#171717] rounded-[6px] flex items-center gap-2 text-[14px] font-medium transition-colors hover:bg-[#F5F7FA]">
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
          <button onClick={() => { setPasteGridRows(createInitialRows()); setStagedBatches([]); setActiveBatchId(1); setNextBatchId(2); setIsUploadModalOpen(true); }} className="h-[36px] bg-white border border-[#DDE1E8] text-[#171717] rounded-[6px] text-[12px] font-medium flex items-center justify-center">
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

        {/* SELECTION BANNER */}
        {selectedIds.size > 0 && (
          <section className="bg-[#f1fcff] border border-[#00B6E2] rounded-[8px] px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#1E40AF]">
              <div className="w-5 h-5 rounded flex items-center justify-center bg-[#3B82F6] text-white">
                <Check className="w-3.5 h-3.5" />
              </div>
              <span className="text-[14px] font-medium">
                {selectedIds.size} Raw Material{selectedIds.size > 1 ? "s" : ""} selected
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setIsBulkModalOpen(true)} className="h-[32px] px-4 bg-[#00B6E2] text-white rounded-[6px] text-[13px] font-medium flex items-center gap-2 hover:bg-[#0092b5] transition-colors">
                <Edit2 className="w-3.5 h-3.5" />
                Bulk Update
              </button>
              <button onClick={() => setSelectedIds(new Set())} className="h-[32px] px-3 bg-white border border-[#00B6E2] text-[#00B6E2] rounded-[6px] text-[13px] font-medium hover:bg-gray-50 flex items-center gap-1.5 transition-colors">
                <X className="w-3.5 h-3.5" />
                Cancel
              </button>
            </div>
          </section>
        )}

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
                  <th className="px-4 py-[12px] w-[40px]">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded border-[#DDE1E8] text-[#00B6E2] focus:ring-[#00B6E2]"
                      checked={selectedIds.size === paginatedData.length && paginatedData.length > 0}
                      onChange={toggleAllSelection}
                    />
                  </th>
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
                  <th className="px-4 py-[12px] text-[13px] font-semibold text-[#667085]">Package No</th>
                  <th className="px-4 py-[12px] text-[13px] font-semibold text-[#667085]">Core (Inch)</th>
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
                      <td className="px-4 py-4 w-[40px]">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded border-[#DDE1E8] text-[#00B6E2] focus:ring-[#00B6E2]"
                          checked={row.id ? selectedIds.has(row.id) : false}
                          onChange={() => row.id && toggleRowSelection(row.id)}
                        />
                      </td>
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
                      <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.packageNo ?? "-"}</td>
                      <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.coreInch ?? "-"}</td>
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
          <div className="relative w-full max-w-[1400px] h-full max-h-[95vh] bg-white rounded-[12px] shadow-lg flex flex-col overflow-hidden animate-slide-up">
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#EBEBEB]">
              <div>
                <h2 className="text-[18px] font-semibold text-[#171717]">Upload Material List</h2>
                <p className="text-[14px] text-[#5C5C5C] mt-1">Paste your Excel/CSV data below. Roll ID is required.</p>
              </div>
              <button onClick={() => setIsUploadModalOpen(false)} className="p-2 hover:bg-[#F5F7FA] rounded-[8px] transition-colors">
                <X className="w-5 h-5 text-[#5C5C5C]" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 bg-[#F9FAFB]">
              {/* ACTIVE BATCH CONTAINER (Moved to top, Header removed) */}
              <div className="flex flex-col gap-4">
                <div className="border border-[#EBEBEB] rounded-[8px] overflow-auto max-h-[50vh] bg-white">
                  <table className="w-full text-left border-collapse text-[13px]">
                    <thead className="sticky top-0 bg-[#F5F7FA] z-10 shadow-[0_1px_0_#EBEBEB]">
                      <tr>
                        <th className="px-3 py-2 font-semibold text-[#5C5C5C] w-[60px]">S.No</th>
                        <th className="px-3 py-2 font-semibold text-[#171717]">Roll ID*</th>
                        <th className="px-3 py-2 font-semibold text-[#5C5C5C]">Width</th>
                        <th className="px-3 py-2 font-semibold text-[#5C5C5C]">Net Wt.</th>
                        <th className="px-3 py-2 font-semibold text-[#5C5C5C]">Gross Wt.</th>
                        <th className="px-3 py-2 font-semibold text-[#5C5C5C]">Package No</th>
                        <th className="px-3 py-2 font-semibold text-[#5C5C5C]">Core(In)</th>
                        <th className="px-3 py-2 font-semibold text-[#5C5C5C] w-[40px]"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EBEBEB]">
                      {pasteGridRows.map((row, i) => {
                        const isMissingRollId = !row.rollId || row.rollId.trim() === "";
                        const hasOtherData = row.width || row.netWeight || row.grossWeight || row.packageNo || row.coreInch;
                        const showError = isMissingRollId && hasOtherData;
                        
                        return (
                          <tr key={i} className="hover:bg-gray-50/50">
                            <td className="px-2 py-1">
                              <input 
                                className="w-full bg-transparent border-none focus:ring-1 focus:ring-[#00B6E2] rounded px-1 text-center h-[30px]" 
                                value={row.sno || ""} 
                                onChange={(e) => handleGridChange(i, "sno", e.target.value)}
                                onPaste={(e) => handleGridPaste(e, i, 0)}
                                placeholder={(i + 1).toString()}
                              />
                            </td>
                            <td className="px-2 py-1">
                              <input 
                                className={`w-full bg-transparent border ${showError ? 'border-red-400 bg-red-50' : 'border-transparent'} focus:ring-1 focus:ring-[#00B6E2] rounded px-1 h-[30px]`}
                                value={row.rollId || ""} 
                                onChange={(e) => handleGridChange(i, "rollId", e.target.value)}
                                onPaste={(e) => handleGridPaste(e, i, 1)}
                              />
                            </td>
                            <td className="px-2 py-1">
                              <input 
                                className="w-full bg-transparent border-none focus:ring-1 focus:ring-[#00B6E2] rounded px-1 h-[30px]" 
                                value={row.width || ""} 
                                onChange={(e) => handleGridChange(i, "width", e.target.value)}
                                onPaste={(e) => handleGridPaste(e, i, 2)}
                              />
                            </td>
                            <td className="px-2 py-1">
                              <input 
                                className="w-full bg-transparent border-none focus:ring-1 focus:ring-[#00B6E2] rounded px-1 h-[30px]" 
                                value={row.netWeight || ""} 
                                onChange={(e) => handleGridChange(i, "netWeight", e.target.value)}
                                onPaste={(e) => handleGridPaste(e, i, 3)}
                              />
                            </td>
                            <td className="px-2 py-1">
                              <input 
                                className="w-full bg-transparent border-none focus:ring-1 focus:ring-[#00B6E2] rounded px-1 h-[30px]" 
                                value={row.grossWeight || ""} 
                                onChange={(e) => handleGridChange(i, "grossWeight", e.target.value)}
                                onPaste={(e) => handleGridPaste(e, i, 4)}
                              />
                            </td>
                            <td className="px-2 py-1">
                              <input 
                                className="w-full bg-transparent border-none focus:ring-1 focus:ring-[#00B6E2] rounded px-1 h-[30px]" 
                                value={row.packageNo || ""} 
                                onChange={(e) => handleGridChange(i, "packageNo", e.target.value)}
                                onPaste={(e) => handleGridPaste(e, i, 5)}
                              />
                            </td>
                            <td className="px-2 py-1">
                              <input 
                                className="w-full bg-transparent border-none focus:ring-1 focus:ring-[#00B6E2] rounded px-1 h-[30px]" 
                                value={row.coreInch || ""} 
                                onChange={(e) => handleGridChange(i, "coreInch", e.target.value)}
                                onPaste={(e) => handleGridPaste(e, i, 6)}
                              />
                            </td>
                            <td className="px-2 py-1 text-center">
                              <button onClick={() => removeGridRow(i)} className="p-1 hover:bg-red-50 text-[#5C5C5C] hover:text-red-500 rounded transition-colors" title="Remove row">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 mt-2 shrink-0">
                  <div className="flex flex-col gap-1.5 flex-1">
                    <label className="text-[12px] font-medium text-[#444444]">Micron</label>
                    <select value={uploadMicron} onChange={(e) => setUploadMicron(e.target.value)} className="h-[36px] rounded-[6px] border border-[#DDE1E8] px-3 text-[13px] bg-white">
                      {micronOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5 flex-1">
                    <label className="text-[12px] font-medium text-[#444444]">Supplier</label>
                    <select value={uploadSupplier} onChange={(e) => setUploadSupplier(e.target.value)} className="h-[36px] rounded-[6px] border border-[#DDE1E8] px-3 text-[13px] bg-white">
                      {supplierOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* STAGED BATCHES LIST (Moved to bottom) */}
              {stagedBatches.map(batch => (
                <div key={batch.id} className="rounded-[8px] border border-[#EBEBEB] bg-white p-4 flex items-center justify-between shadow-sm shrink-0">
                  <div className="flex items-center gap-6">
                    <span className="text-[15px] font-semibold text-[#171717]">Material Set {batch.id}</span>
                    <span className="text-[13px] text-[#5C5C5C]">No. of Rows: <span className="font-medium text-[#171717]">{batch.rows.filter(r => r.rollId).length}</span></span>
                    <span className="text-[13px] text-[#5C5C5C]">Micron: <span className="font-medium text-[#171717]">{batch.micron}</span></span>
                    <span className="text-[13px] text-[#5C5C5C]">Supplier: <span className="font-medium text-[#171717]">{batch.supplier}</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleEditBatch(batch.id)} className="p-1.5 text-[#5C5C5C] hover:text-[#00B6E2] hover:bg-[#F0FDFF] rounded transition-colors" title="Edit Batch">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDeleteBatch(batch.id)} className="p-1.5 text-[#5C5C5C] hover:text-red-500 hover:bg-red-50 rounded transition-colors" title="Delete Batch">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t border-[#EBEBEB] bg-white shrink-0">
              <button onClick={() => setIsUploadModalOpen(false)} className="h-[38px] px-4 bg-white border border-[#EBEBEB] text-[#171717] text-[13px] font-medium rounded-[6px] hover:bg-[#F5F7FA]">
                Cancel
              </button>
              <div className="flex items-center gap-3">
                <button onClick={handleAddBatch} className="h-[38px] px-4 bg-white border border-[#DDE1E8] text-[#171717] text-[13px] font-medium rounded-[6px] hover:bg-[#F5F7FA] transition-colors flex items-center gap-1.5">
                  <Plus className="w-4 h-4" /> Add Material Set
                </button>
                <button onClick={handleUploadSubmit} disabled={isSubmitting} className="h-[38px] px-5 bg-[#00B6E2] text-white text-[13px] font-medium rounded-[6px] hover:bg-[#0092b5] transition-colors flex items-center gap-1.5 disabled:opacity-50">
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {isSubmitting ? "Importing..." : "Confirm"}
                </button>
              </div>
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

      {/* BULK ACTIONS MODAL */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#171717]/40 backdrop-blur-sm" onClick={() => setIsBulkModalOpen(false)} />
          <div className="relative w-full max-w-[700px] bg-white rounded-[12px] shadow-lg flex flex-col overflow-hidden animate-slide-up">
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#EBEBEB]">
              <h2 className="text-[18px] font-semibold text-[#171717]">Bulk Actions - {selectedIds.size} raw material{selectedIds.size > 1 ? "s" : ""} selected</h2>
              <button onClick={() => setIsBulkModalOpen(false)} className="p-2 hover:bg-[#F5F7FA] rounded-[8px] transition-colors">
                <X className="w-5 h-5 text-[#5C5C5C]" />
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#F9FAFB]">
              {/* Left Panel: Bulk Update */}
              <div className="flex flex-col gap-4 bg-white p-5 rounded-[10px] border border-[#EBEBEB] shadow-sm">
                <div className="flex items-center gap-2 text-[#00B6E2] font-medium text-[15px] mb-1">
                  <Check className="w-4 h-4" />
                  Bulk Update
                </div>
                
                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-medium text-[#171717]">Field to Update</label>
                  <select 
                    value={bulkUpdateField} 
                    onChange={(e) => {
                      const val = e.target.value as "Micron" | "Supplier" | "";
                      setBulkUpdateField(val);
                      if (val === "Micron") setBulkUpdateValue(micronOptions[0]);
                      else if (val === "Supplier") setBulkUpdateValue(supplierOptions[0]);
                      else setBulkUpdateValue("");
                    }} 
                    className="h-[40px] px-3 bg-white border border-[#DDE1E8] rounded-[8px] text-[14px] text-[#171717] focus:outline-none focus:border-[#00B6E2] focus:ring-1 focus:ring-[#00B6E2]"
                  >
                    <option value="">Select Field</option>
                    <option value="Micron">Micron</option>
                    <option value="Supplier">Supplier</option>
                  </select>
                </div>

                {bulkUpdateField && (
                  <div className="flex flex-col gap-2 animate-fade-in">
                    <label className="text-[13px] font-medium text-[#171717]">New Value</label>
                    <select 
                      value={bulkUpdateValue} 
                      onChange={(e) => setBulkUpdateValue(e.target.value)} 
                      className="h-[40px] px-3 bg-white border border-[#DDE1E8] rounded-[8px] text-[14px] text-[#171717] focus:outline-none focus:border-[#00B6E2] focus:ring-1 focus:ring-[#00B6E2]"
                    >
                      {bulkUpdateField === "Micron" ? (
                        micronOptions.map(o => <option key={o} value={o}>{o}</option>)
                      ) : (
                        supplierOptions.map(o => <option key={o} value={o}>{o}</option>)
                      )}
                    </select>
                  </div>
                )}

                <button 
                  onClick={handleBulkUpdate} 
                  disabled={!bulkUpdateField || !bulkUpdateValue} 
                  className="mt-2 h-[40px] w-full bg-[#00B6E2] text-white rounded-[6px] text-[14px] font-medium flex items-center justify-center gap-2 hover:bg-[#0092b5] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Check className="w-4 h-4" />
                  Update {selectedIds.size} Item{selectedIds.size > 1 ? "s" : ""}
                </button>
              </div>

              {/* Right Panel: Bulk Delete */}
              <div className="flex flex-col gap-4 bg-[#FEF2F2] p-5 rounded-[10px] border border-[#FCA5A5] shadow-sm">
                <div className="flex items-center gap-2 text-[#DC2626] font-medium text-[15px] mb-1">
                  <Trash2 className="w-4 h-4" />
                  Bulk Delete
                </div>
                
                <p className="text-[13px] text-[#991B1B] leading-relaxed">
                  Permanently delete all selected raw materials. This action cannot be undone.
                </p>

                <div className="mt-auto pt-4">
                  <button 
                    onClick={() => {
                      if (confirm(`Are you sure you want to permanently delete ${selectedIds.size} raw material(s)?`)) {
                        handleBulkDelete();
                      }
                    }} 
                    className="h-[40px] w-full bg-white border border-[#F87171] text-[#DC2626] rounded-[6px] text-[14px] font-medium flex items-center justify-center gap-2 hover:bg-[#FEE2E2] transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete {selectedIds.size} Item{selectedIds.size > 1 ? "s" : ""}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center p-4 border-t border-[#EBEBEB] bg-white">
              <button onClick={() => setIsBulkModalOpen(false)} className="h-[40px] w-full bg-[#F3F4F6] text-[#374151] font-medium rounded-[8px] text-[14px] hover:bg-[#E5E7EB] transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {qrData && <QRCodeModal id={qrData.id} type={qrData.type} data={qrData.data} onClose={() => setQrData(null)} />}
    </div>
  );
}