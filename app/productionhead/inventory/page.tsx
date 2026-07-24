"use client";

import { TablePagination } from "@/components/table/TablePagination";
import { Plus, Search, X, Check, Package, Warehouse, Activity, Archive, QrCode, Scan, Download } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { MobileHeader } from "@/components/MobileHeader";
import { QRCodeModal, type QRModalData } from "@/components/QRCodeModal";
import { exportToExcel } from "@/lib/exportExcel";
import { inventoryService } from "@/src/services/inventoryService";
import { productionStageService } from "@/src/services/productionStageService";

type ModalStep = 1 | 2 | 3;

type InventoryForm = {
  rawMaterialId: string;
  rollId: string;
  micron: string;
  width: string;
  weight: string;
  netWeight: string;
  grossWeight: string;
  usedWeight: string;
  wastageWeight: string;
  damagedWeight: string;
  temperature: string;
  supplier: string;
};

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

function hasPositiveNumber(value: string) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0;
}

const defaultForm: InventoryForm = {
  rawMaterialId: "",
  rollId: "",
  micron: "4.5",
  width: "1.0",
  weight: "",
  netWeight: "",
  grossWeight: "",
  usedWeight: "",
  wastageWeight: "",
  damagedWeight: "",
  temperature: "25°C",
  supplier: supplierOptions[0],
};

export default function ProductionHeadInventoryPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [qrData, setQrData] = useState<QRModalData | null>(null);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {

        const data = await inventoryService.list();

        const formatted = (data as any[]).map((item) => ({
          ...item,
          raw_material_code: item.raw_material_code,
          roll_no: item.roll_no,
          micron: item.micron,
          width_m: item.width_m,
          net_weight_kg: item.net_weight_kg,
          gross_weight_kg: item.gross_weight_kg,
          used_weight_kg: item.used_weight_kg,
          wastage_weight_kg: item.wastage_weight_kg ?? null,
          damaged_weight_kg: null,
          temperature_c: item.temperature_c,
          supplier: item.supplier,
          date_received: item.date_received,
          status: item.status
        }));

        setInventoryItems(formatted);
      } catch (err) {
        console.error("Failed to load inventory", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filteredData = inventoryItems.filter((row) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      row.raw_material_code?.toLowerCase().includes(q) ||
      row.roll_no?.toLowerCase().includes(q) ||
      row.supplier?.toLowerCase().includes(q)
    );
  });


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

  if (loading) return <div className="p-6 text-center text-[#5C5C5C]">Loading inventory...</div>;

  return (
    <div className="font-dm-sans min-h-[calc(100vh-72px)] bg-white flex flex-col overflow-x-hidden">
      <MobileHeader title="Inventory" />

      <section className="bg-white w-full flex justify-start border-b border-[#EBEBEB]">
        <div className="w-full px-4 md:px-6 pt-[72px] md:pt-6 pb-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 h-auto">
          <div className="flex flex-col gap-1">
            <h1 className="text-[16px] font-medium text-[#171717] leading-tight">Inventory</h1>
            <p className="text-[14px] font-normal text-[#5C5C5C] leading-tight hidden md:block">Raw material stock received from suppliers</p>
          </div>
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
                    <span className={`text-[16px] font-semibold ${stat.valClass}`}>{stat.value}</span>
                    <span className="text-[10px] text-[#5C5C5C]">{stat.subtext}</span>
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

        <section className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:max-w-[400px]">
            <Search className="w-4 h-4 text-[#A1A1AA] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input type="text" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} placeholder="Search by RM ID, Roll ID, or Supplier..." className="h-[40px] w-full pl-9 pr-3 bg-white border border-[#EBEBEB] rounded-[8px] text-[14px] text-[#171717] placeholder:text-[#A1A1AA] focus:outline-none focus:border-[#00B6E2]" />
          </div>
          <button
            onClick={() => {
              const exportData = filteredData.map((row: any) => ({
                "Raw Material ID": row.raw_material_code ?? "",
                "Roll ID": row.roll_no ?? "",
                "Micron": row.micron ?? "",
                "Width (m)": row.width_m ?? "",
                "Net Weight": row.net_weight_kg ?? "",
                "Gross Weight": row.gross_weight_kg ?? "",
                "Used Weight": row.used_weight_kg ?? "",
                "Temperature": row.temperature_c ?? "",
                "Supplier": row.supplier ?? "",
                "Date": row.date_received ?? "",
                "Status": row.status ?? "",
              }));
              exportToExcel(exportData, "inventory", "Inventory");
            }}
            className="h-[40px] px-3 flex items-center gap-2 bg-white border border-[#EBEBEB] rounded-[8px] text-[13px] font-medium text-[#171717] hover:bg-gray-50 transition-colors shrink-0 w-full sm:w-auto"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </section>

        <section className="bg-white rounded-[12px] flex flex-col gap-4 overflow-hidden">
          <div className="border border-[#EAECF0] rounded-[8px] overflow-x-auto min-h-[300px]">
            <table className="w-full text-left border-collapse min-w-[1200px]">
              <thead>
                <tr className="bg-[#F5F7FA] border-b border-[#EBEBEB]">
                  <th className="px-4 py-[11px] text-[13px] font-semibold text-[#667085]">Raw Material ID</th>
                  <th className="px-4 py-[11px] text-[13px] font-semibold text-[#667085]">Roll ID</th>
                  <th className="px-4 py-[11px] text-[13px] font-semibold text-[#667085]">Micron</th>
                  <th className="px-4 py-[11px] text-[13px] font-semibold text-[#667085]">Width (m)</th>
                  <th className="px-4 py-[11px] text-[13px] font-semibold text-[#667085]">Net Weight</th>
                  <th className="px-4 py-[11px] text-[13px] font-semibold text-[#667085]">Gross Weight</th>
                  <th className="px-4 py-[11px] text-[13px] font-semibold text-[#667085]">Used Weight</th>
                  <th className="px-4 py-[11px] text-[13px] font-semibold text-[#667085]">Wastage/Left Weight</th>
                  <th className="px-4 py-[11px] text-[13px] font-semibold text-[#667085]">Damaged Weight</th>
                  <th className="px-4 py-[11px] text-[13px] font-semibold text-[#667085]">Temperature</th>
                  <th className="px-4 py-[11px] text-[13px] font-semibold text-[#667085]">Supplier</th>
                  <th className="px-4 py-[11px] text-[13px] font-semibold text-[#667085]">Date</th>
                  <th className="px-4 py-[11px] text-[13px] font-semibold text-[#667085]">QR</th>
                  <th className="px-4 py-[11px] text-[13px] font-semibold text-[#667085]">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAECF0]">
                {paginatedData.length > 0 ? paginatedData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-4 text-[14px] text-[#00B6E2] font-semibold whitespace-nowrap">{row.raw_material_code}</td>
                    <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.roll_no}</td>
                    <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.micron}</td>
                    <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.width_m}</td>
                    <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.net_weight_kg != null ? `${row.net_weight_kg}kgs` : "-"}</td>
                    <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.gross_weight_kg != null ? `${row.gross_weight_kg}kgs` : "-"}</td>
                    <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.used_weight_kg != null ? `${row.used_weight_kg}kgs` : "-"}</td>
                    <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.wastage_weight_kg != null ? `${row.wastage_weight_kg}kgs` : "-"}</td>
                    <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.damaged_weight_kg != null ? `${row.damaged_weight_kg}kgs` : "-"}</td>
                    <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.temperature_c ?? "-"}</td>
                    <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.supplier}</td>
                    <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.date_received ?? "-"}</td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <button onClick={() => setQrData({ id: row.raw_material_code, type: "RM", data: { rollNo: row.roll_no, micron: row.micron, width: row.width_m, netWeight: row.net_weight_kg, grossWeight: row.gross_weight_kg ?? "-", temperature: row.temperature_c ?? "-", supplier: row.supplier, status: row.status } })} className="text-[#5C5C5C] hover:text-[#00B6E2] transition-colors">
                        <QrCode className="w-4 h-4" />
                      </button>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap"><StatusBadge status={row.status} /></td>
                  </tr>
                )) : (
                  <tr><td colSpan={11} className="px-4 py-8 text-center text-[#5C5C5C] text-[14px]">No inventory items found.</td></tr>
                )}
              </tbody>
            </table>
            <TablePagination currentPage={validPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </div>
        </section>
      </div>
      {qrData && <QRCodeModal id={qrData.id} type={qrData.type} data={qrData.data} onClose={() => setQrData(null)} />}
    </div>
  );
}
