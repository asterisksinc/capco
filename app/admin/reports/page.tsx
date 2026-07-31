"use client";

import { useState, useEffect } from "react";
import { TablePagination } from "@/components/table/TablePagination";
import { SortableHeader } from "@/components/table/SortableHeader";
import { useTableControls, type TableConfig } from "@/hooks/useTableControls";
import { MobileHeader } from "@/components/MobileHeader";
import { Search, Plus, Calendar, FileText, Download, Eye, Loader2, X } from "lucide-react";
import { exportToExcel } from "@/lib/exportExcel";
import { inventoryService } from "@/src/services/inventoryService";
import { workOrderService } from "@/src/services/workOrderService";
import { productOrderService } from "@/src/services/productOrderService";
import { productionStageService } from "@/src/services/productionStageService";

// Options
const STAGE_OPTIONS = [
    "Raw Material",
    "Work Order",
    "Metallisation",
    "Slitting",
    "Product Order",
    "Winding",
    "Spray",
] as const;

type StageType = typeof STAGE_OPTIONS[number];

// Types
type ReportHistoryRow = {
    id: string; // e.g. RPT-0001
    stage: string;
    fromDate: string;
    toDate: string;
    timestamp: string; // ISO string
    dataSnapshot: any[];
    dateRange?: string;
    actions?: string;
};

// Configs for preview tables
const rawMaterialConfig: TableConfig<any> = {
    columns: [
        { key: "rollNo", label: "Roll No", type: "text", sortable: true },
        { key: "micron", label: "Micron", type: "text", sortable: true },
        { key: "width", label: "Width (m)", type: "text", sortable: true },
        { key: "netWeight", label: "Net Weight", type: "text", sortable: true },
        { key: "grossWeight", label: "Gross Weight", type: "text", sortable: true },
        { key: "usedWeight", label: "Used Weight", type: "text", sortable: true },
        { key: "wastageWeight", label: "Wastage/Left Weight", type: "text", sortable: true },
        { key: "damagedWeight", label: "Damaged Weight", type: "text", sortable: true },
        { key: "temperature", label: "Temperature", type: "text", sortable: true },
        { key: "supplier", label: "Company/Supplier", type: "text", sortable: true },
        { key: "status", label: "Status", type: "text", sortable: true },
        { key: "createdAt", label: "Created At", type: "text", sortable: true }
    ],
};

const workOrderConfig: TableConfig<any> = {
    columns: [
        { key: "workOrderNo", label: "WO Number", type: "text", sortable: true },
        { key: "micron", label: "Micron", type: "text", sortable: true },
        { key: "width", label: "Width", type: "text", sortable: true },
        { key: "quantity", label: "Quantity", type: "text", sortable: true },
        { key: "stage", label: "Stage", type: "text", sortable: true },
        { key: "status", label: "Status", type: "text", sortable: true },
        { key: "createdAt", label: "Created At", type: "text", sortable: true }
    ],
};

const productOrderConfig: TableConfig<any> = {
    columns: [
        { key: "orderId", label: "Order ID", type: "text", sortable: true },
        { key: "micron", label: "Micron", type: "text", sortable: true },
        { key: "width", label: "Width", type: "text", sortable: true },
        { key: "product", label: "Product", type: "text", sortable: true },
        { key: "grade", label: "Grade", type: "text", sortable: true },
        { key: "quantity", label: "Quantity", type: "text", sortable: true },
        { key: "customer", label: "Customer", type: "text", sortable: true },
        { key: "stage", label: "Stage", type: "text", sortable: true },
        { key: "status", label: "Status", type: "text", sortable: true },
        { key: "createdAt", label: "Created At", type: "text", sortable: true }
    ],
};

const metallisationConfig: TableConfig<any> = {
    columns: [
        { key: "coilNo", label: "Coil No.", type: "text", sortable: true },
        { key: "rmId", label: "RM ID", type: "text", sortable: true },
        { key: "rmWeight", label: "RM Weight", type: "text", sortable: true },
        { key: "factoryWastageWeight", label: "Factory Wastage Weight", type: "text", sortable: true },
        { key: "weight", label: "Metallisation Weight", type: "text", sortable: true },
        { key: "status", label: "Status", type: "text", sortable: true },
        { key: "createdAt", label: "Created At", type: "text", sortable: true }
    ],
};

const slittingConfig: TableConfig<any> = {
    columns: [
        { key: "productNo", label: "Product No", type: "text", sortable: true },
        { key: "coilId", label: "Coil ID", type: "text", sortable: true },
        { key: "weight", label: "Weight", type: "text", sortable: true },
        { key: "thickness", label: "Thickness", type: "text", sortable: true },
        { key: "grade", label: "Grade", type: "text", sortable: true },
        { key: "status", label: "Status", type: "text", sortable: true },
        { key: "createdAt", label: "Created At", type: "text", sortable: true }
    ],
};

const emptyStateConfig: TableConfig<any> = {
    columns: [
        { key: "id", label: "ID", type: "text", sortable: false },
        { key: "status", label: "Status", type: "text", sortable: false },
    ],
};

function getTableConfigForStage(stage: StageType): TableConfig<any> {
    switch (stage) {
        case "Raw Material": return rawMaterialConfig;
        case "Work Order": return workOrderConfig;
        case "Product Order": return productOrderConfig;
        case "Metallisation": return metallisationConfig;
        case "Slitting": return slittingConfig;
        default: return emptyStateConfig;
    }
}

// Reports Main Page Config
const reportHistoryConfig: TableConfig<ReportHistoryRow> = {
    columns: [
        { key: "id", label: "R ID", type: "text", sortable: true },
        { key: "stage", label: "Stage", type: "text", sortable: true },
        { key: "dateRange", label: "Date Range", type: "text", sortable: false },
        { key: "timestamp", label: "Generated At", type: "date", sortable: true },
        { key: "actions", label: "Action", type: "text", sortable: false },
    ],
};

export default function AdminReportsPage() {
    const [reportsHistory, setReportsHistory] = useState<ReportHistoryRow[]>([]);
    const [selectedStage, setSelectedStage] = useState<StageType>("Work Order");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");

    // Modals
    const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);

    // Generate / View State
    const [previewData, setPreviewData] = useState<any[]>([]);
    const [loadingPreview, setLoadingPreview] = useState(false);
    const [activeReportToView, setActiveReportToView] = useState<ReportHistoryRow | null>(null);

    // Initialize history from localStorage
    useEffect(() => {
        try {
            const stored = localStorage.getItem("capco_reports_history");
            if (stored) {
                setReportsHistory(JSON.parse(stored));
            }
        } catch (err) {
            console.error("Failed to load reports history", err);
        }
    }, []);

    // Save history to localStorage on change
    useEffect(() => {
        if (reportsHistory.length > 0) {
            localStorage.setItem("capco_reports_history", JSON.stringify(reportsHistory));
        }
    }, [reportsHistory]);

    const handleGenerateClick = async () => {
        if (!fromDate || !toDate) {
            alert("Please select both From and To dates.");
            return;
        }

        setIsGenerateModalOpen(true);
        setLoadingPreview(true);
        setPreviewData([]);

        try {
            let data: any[] = [];
            if (selectedStage === "Raw Material") {
                data = await inventoryService.list();
            } else if (selectedStage === "Work Order") {
                data = await workOrderService.list();
            } else if (selectedStage === "Product Order") {
                data = await productOrderService.list();
            } else if (selectedStage === "Metallisation") {
                data = (await productionStageService.listMetallisation()) as any[];
            } else if (selectedStage === "Slitting") {
                data = (await productionStageService.listSlitting()) as any[];
            } else {
                // Winding / Spray currently empty
                data = [];
            }

            // Filter by date
            const start = new Date(fromDate).getTime();
            const end = new Date(toDate).getTime() + 86400000; // Add 1 day to include end date fully

            const filtered = data.filter((item) => {
                const dateValue = item.created_at || item.timestamp;

                if (!dateValue) return false;

                const itemDate = new Date(dateValue).getTime();
                return itemDate >= start && itemDate <= end;
            });

            const formatted = filtered.map((item) => {
                const formatDate = (dateStr?: string) => dateStr ? new Date(dateStr).toLocaleDateString() : "-";
                
                if (selectedStage === "Raw Material") {
                    return {
                        rollNo: item.raw_material_code || "-",
                        micron: item.micron ? `${item.micron}μ` : "-",
                        width: item.width_m ? `${item.width_m}m` : "-",
                        netWeight: item.net_weight_kg ? `${item.net_weight_kg}kgs` : "-",
                        grossWeight: item.gross_weight_kg ? `${item.gross_weight_kg}kgs` : "-",
                        usedWeight: item.used_weight_kg ? `${item.used_weight_kg}kgs` : "-",
                        wastageWeight: item.wastage_weight_kg ? `${item.wastage_weight_kg}kgs` : "-",
                        damagedWeight: item.damagedWeight ? `${item.damagedWeight}kgs` : "-",
                        temperature: item.temperature_c ? `${item.temperature_c}°C` : "-",
                        supplier: item.supplier || "-",
                        status: item.status || "-",
                        createdAt: formatDate(item.created_at)
                    };
                } else if (selectedStage === "Work Order") {
                    return {
                        workOrderNo: item.work_order_no || "-",
                        micron: item.micron ? `${item.micron}μ` : "-",
                        width: item.width_m ? `${item.width_m}m` : (item.width ? `${item.width}mm` : "-"),
                        quantity: item.quantity ? `${item.quantity}kg` : "-",
                        stage: item.stage || "-",
                        status: item.status || "-",
                        createdAt: formatDate(item.created_at)
                    };
                } else if (selectedStage === "Product Order") {
                    return {
                        orderId: item.id || "-",
                        micron: item.micron ? `${item.micron}μ` : "-",
                        width: item.width ? `${item.width}mm` : "-",
                        product: item.product || "-",
                        grade: item.grade || "-",
                        quantity: item.quantity ? `${item.quantity}kg` : "-",
                        customer: item.customer || "-",
                        stage: item.stage || "-",
                        status: item.status || "-",
                        createdAt: formatDate(item.created_at)
                    };
                } else if (selectedStage === "Metallisation") {
                    // const inv = await inventoryService.getById(item.raw_material_id);
                    return {
                        coilNo: item.coil_no || item.metallisation_no || "-",
                        rmId: item.rmId || item.inventory?.raw_material_code || item.inventory?.roll_no || "-",
                        rmWeight: item.rmWeight || (item.inventory?.net_weight_kg ? `${item.inventory.net_weight_kg}kgs` : "-"),
                        factoryWastageWeight: item.factory_wastage_kg ? `${item.factory_wastage_kg}kgs` : "-",
                        weight: item.weight_kg ? `${item.weight_kg}kgs` : "-",
                        status: item.status || "-",
                        createdAt: formatDate(item.created_at)
                    };
                } else if (selectedStage === "Slitting") {
                    return {
                        productNo: item.slitting_no || item.product_no || "-",
                        coilId: item.coilId || item.metallisation?.coil_no || item.metallisation?.metallisation_no || "-",
                        weight: item.weight_kg ? `${item.weight_kg}kgs` : "-",
                        thickness: item.thickness_micron ? `${item.thickness_micron}μ` : "-",
                        grade: item.grade || "-",
                        status: item.status || "-",
                        createdAt: formatDate(item.created_at)
                    };
                }
                return item;
            });

            setPreviewData(formatted);
        } catch (err) {
            console.error(err);
            alert("Failed to fetch data for report.");
        } finally {
            setLoadingPreview(false);
        }
    };

    const handleConfirmGenerate = () => {
        const nextReportNumber =
            reportsHistory.length === 0
                ? 1
                : Math.max(
                    ...reportsHistory.map((r) =>
                        Number(r.id.replace("RPT-", ""))
                    )
                ) + 1;

        const rId = `RPT-${String(nextReportNumber).padStart(4, "0")}`;

        const newReport: ReportHistoryRow = {
            id: rId,
            stage: selectedStage,
            fromDate,
            toDate,
            timestamp: new Date().toISOString(),
            dataSnapshot: previewData,
        };

        setReportsHistory(prev => [newReport, ...prev]);
        setIsGenerateModalOpen(false);
    };

    const handleDownloadPreview = () => {
        if (previewData.length === 0) {
            alert("No data to download.");
            return;
        }
        exportToExcel(previewData, `report_${selectedStage.toLowerCase().replace(" ", "_")}`, `${selectedStage} Report`);
    };

    const handleDownloadHistory = (row: ReportHistoryRow) => {
        if (row.dataSnapshot.length === 0) {
            alert("No data in this report.");
            return;
        }
        exportToExcel(row.dataSnapshot, `report_${row.id}`, `${row.stage} Report ${row.id}`);
    };

    const handleViewHistory = (row: ReportHistoryRow) => {
        setActiveReportToView(row);
        setIsViewModalOpen(true);
    };

    // Main table controls
    const {
        processedData: historyData,
        sortConfig,
        handleSort,
        getPaginatedData,
        setCurrentPage,
    } = useTableControls({ data: reportsHistory, config: reportHistoryConfig });
    const { paginatedData, totalPages, validPage: currentPage } = getPaginatedData(historyData);

    return (
        <div className="font-dm-sans min-h-[calc(100vh-72px)] bg-white flex flex-col w-full max-w-full">
            <MobileHeader title="Reports" />

            {/* MOBILE HEADER SPACER */}
            <div className="h-14 md:hidden"></div>

            {/* DESKTOP HEADER */}
            <section className="bg-white border-b border-[#EBEBEB] hidden md:block">
                <div className="px-6 py-6 flex flex-col">
                    <h1 className="text-[20px] font-semibold text-[#171717]">Reports</h1>
                    <p className="text-[14px] text-[#5C5C5C] mt-1">
                        Generate and view production reports
                    </p>
                </div>
            </section>

            {/* MOBILE PAGE TITLE */}
            <section className="px-4 pt-4 sm:hidden">
                <h1 className="text-[16px] font-medium text-[#171717]">Reports</h1>
                <p className="text-[12px] text-[#5C5C5C] mt-1">
                    Generate and view production reports
                </p>
            </section>

            {/* Main Content */}
            <div className="w-full bg-white px-4 md:px-6 flex flex-col gap-6 py-6">

                {/* Controls Card */}
                <div className="rounded-[12px] border border-[#EBEBEB] p-5 flex flex-col md:flex-row items-end gap-4 w-full">
                    <div className="flex flex-col gap-1.5 w-full md:w-auto">
                        <label className="text-[13px] font-medium text-[#171717]">Select Stage</label>
                        <select
                            value={selectedStage}
                            onChange={(e) => setSelectedStage(e.target.value as StageType)}
                            className="h-[40px] px-3 bg-white border border-[#EBEBEB] rounded-[8px] text-[14px] text-[#171717] outline-none focus:border-[#00B6E2] w-full md:w-[200px]"
                        >
                            {STAGE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                    </div>

                    <div className="flex flex-col gap-1.5 w-full md:w-auto">
                        <label className="text-[13px] font-medium text-[#171717]">Date Range (From)</label>
                        <input
                            type="date"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                            className="h-[40px] px-3 bg-white border border-[#EBEBEB] rounded-[8px] text-[14px] text-[#171717] outline-none focus:border-[#00B6E2] w-full md:w-[150px]"
                        />
                    </div>

                    <div className="flex flex-col gap-1.5 w-full md:w-auto">
                        <label className="text-[13px] font-medium text-[#171717]">Date Range (To)</label>
                        <input
                            type="date"
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                            className="h-[40px] px-3 bg-white border border-[#EBEBEB] rounded-[8px] text-[14px] text-[#171717] outline-none focus:border-[#00B6E2] w-full md:w-[150px]"
                        />
                    </div>

                    <button
                        onClick={handleGenerateClick}
                        className="h-[40px] px-6 bg-[#00B6E2] hover:bg-[#0092b5] text-white text-[14px] font-medium rounded-[8px] transition-colors flex items-center justify-center gap-2 w-full md:w-auto"
                    >
                        <FileText className="w-4 h-4" />
                        Generate Report
                    </button>
                </div>

                {/* Reports Table */}
                <section className="bg-white rounded-[12px] border border-[#EBEBEB] flex flex-col gap-4 overflow-hidden">
                    <div className="border-b border-[#EAECF0] rounded-t-[8px] overflow-x-auto min-h-[300px]">
                        <table className="w-full text-left border-collapse min-w-[800px]">
                            <thead>
                                <tr className="bg-[#F5F7FA] border-b border-[#EBEBEB]">
                                    {reportHistoryConfig.columns.map((col) => (
                                        <th key={String(col.key)} className="px-4 py-[11px]">
                                            <SortableHeader
                                                column={col}
                                                sortConfig={sortConfig}
                                                onSort={handleSort as any}
                                                filters={{}}
                                                onFilterChange={() => { }}
                                            />
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#EAECF0]">
                                {paginatedData.length > 0 ? (
                                    paginatedData.map((row: ReportHistoryRow, idx: number) => (
                                        <tr key={row.id} className="hover:bg-gray-50/50 transition-colors group">
                                            <td className="px-4 py-4 text-[14px] font-medium text-[#171717] whitespace-nowrap">{row.id}</td>
                                            <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.stage}</td>
                                            <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">
                                                {new Date(row.fromDate).toLocaleDateString()} - {new Date(row.toDate).toLocaleDateString()}
                                            </td>
                                            <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">
                                                {new Date(row.timestamp).toLocaleString()}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={() => handleViewHistory(row)}
                                                        className="text-[#5C5C5C] hover:text-[#00B6E2] transition-colors"
                                                        title="View"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDownloadHistory(row)}
                                                        className="text-[#5C5C5C] hover:text-[#00B6E2] transition-colors"
                                                        title="Download Excel"
                                                    >
                                                        <Download className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-12 text-center text-[#5C5C5C] text-[14px]">
                                            <div className="flex flex-col items-center gap-2">
                                                <FileText className="w-8 h-8 text-[#D0D5DD]" />
                                                <p>No reports generated yet.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="p-4 pt-0">
                        <TablePagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                    </div>
                </section>

            </div>

            {/* Generate Preview Modal */}
            {isGenerateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                    <div className="bg-white rounded-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
                        <div className="p-6 border-b border-[#EBEBEB] flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-[#171717]">Report Preview</h2>
                                <p className="text-[14px] text-[#5C5C5C] mt-1">{selectedStage} ({fromDate} to {toDate})</p>
                            </div>
                            <button onClick={() => setIsGenerateModalOpen(false)} className="text-[#A1A1AA] hover:text-[#171717]">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-6 overflow-auto flex-1">
                            {loadingPreview ? (
                                <div className="flex flex-col items-center justify-center h-48 gap-3">
                                    <Loader2 className="w-8 h-8 text-[#00B6E2] animate-spin" />
                                    <p className="text-[14px] text-[#5C5C5C]">Fetching data...</p>
                                </div>
                            ) : previewData.length > 0 ? (
                                <div className="border border-[#EAECF0] rounded-[8px] overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-[#F5F7FA] border-b border-[#EBEBEB]">
                                            <tr>
                                                {getTableConfigForStage(selectedStage).columns.map(col => (
                                                    <th key={String(col.key)} className="px-4 py-3 text-[12px] font-medium text-[#5C5C5C] uppercase tracking-wider">
                                                        {col.label}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#EAECF0]">
                                            {previewData.slice(0, 50).map((row, i) => (
                                                <tr key={i} className="hover:bg-gray-50/50">
                                                    {getTableConfigForStage(selectedStage).columns.map(col => (
                                                        <td key={String(col.key)} className="px-4 py-3 text-[14px] text-[#171717] whitespace-nowrap">
                                                            {row[col.key] ?? "-"}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {previewData.length > 50 && (
                                        <div className="px-4 py-3 text-[13px] text-[#5C5C5C] bg-[#F5F7FA] border-t border-[#EBEBEB] text-center">
                                            Showing 50 of {previewData.length} records.
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-48 gap-2">
                                    <p className="text-[14px] text-[#5C5C5C]">No data found for this period.</p>
                                    {(selectedStage === "Winding" || selectedStage === "Spray") && (
                                        <p className="text-[12px] text-[#A1A1AA]">({selectedStage} tracking not yet active)</p>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-[#EBEBEB] flex items-center justify-end gap-3 bg-[#F5F7FA]/50 rounded-b-xl">
                            <button
                                onClick={() => setIsGenerateModalOpen(false)}
                                className="px-4 py-2 text-[14px] font-medium text-[#171717] bg-white border border-[#EBEBEB] rounded-[8px] hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDownloadPreview}
                                disabled={loadingPreview || previewData.length === 0}
                                className="px-4 py-2 text-[14px] font-medium text-[#171717] bg-white border border-[#EBEBEB] rounded-[8px] hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Download Excel
                            </button>
                            <button
                                onClick={handleConfirmGenerate}
                                disabled={loadingPreview || previewData.length === 0}
                                className="px-4 py-2 text-[14px] font-medium text-white bg-[#00B6E2] rounded-[8px] hover:bg-[#0092b5] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Generate Report
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* View Historical Report Modal */}
            {isViewModalOpen && activeReportToView && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                    <div className="bg-white rounded-xl shadow-lg w-full max-w-5xl max-h-[90vh] flex flex-col">
                        <div className="p-6 border-b border-[#EBEBEB] flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-[#171717]">{activeReportToView.id} - {activeReportToView.stage}</h2>
                                <p className="text-[14px] text-[#5C5C5C] mt-1">Generated: {new Date(activeReportToView.timestamp).toLocaleString()}</p>
                            </div>
                            <button onClick={() => setIsViewModalOpen(false)} className="text-[#A1A1AA] hover:text-[#171717]">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-6 overflow-auto flex-1">
                            <div className="border border-[#EAECF0] rounded-[8px] overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-[#F5F7FA] border-b border-[#EBEBEB]">
                                        <tr>
                                            {getTableConfigForStage(activeReportToView.stage as StageType).columns.map(col => (
                                                <th key={String(col.key)} className="px-4 py-3 text-[12px] font-medium text-[#5C5C5C] uppercase tracking-wider">
                                                    {col.label}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#EAECF0]">
                                        {activeReportToView.dataSnapshot.map((row, i) => (
                                            <tr key={i} className="hover:bg-gray-50/50">
                                                {getTableConfigForStage(activeReportToView.stage as StageType).columns.map(col => (
                                                    <td key={String(col.key)} className="px-4 py-3 text-[14px] text-[#171717] whitespace-nowrap">
                                                        {row[col.key] ?? "-"}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="p-6 border-t border-[#EBEBEB] flex items-center justify-end gap-3 bg-[#F5F7FA]/50 rounded-b-xl">
                            <button
                                onClick={() => setIsViewModalOpen(false)}
                                className="px-4 py-2 text-[14px] font-medium text-[#171717] bg-white border border-[#EBEBEB] rounded-[8px] hover:bg-gray-50 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}