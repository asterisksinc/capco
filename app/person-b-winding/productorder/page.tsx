"use client";

import Link from "next/link";
import { Plus, X, ChevronDown, Search, Info, ChevronLeft, ChevronRight, QrCode } from "lucide-react";
import { useState, useEffect } from "react";
import { useStore } from "@/hooks/useStore";
import { Loader2 } from "lucide-react";
import type { TableConfig } from "@/hooks/useTableControls";
import { TablePagination } from "@/components/table/TablePagination";
import { useTableControls } from "@/hooks/useTableControls";
import { SortableHeader } from "@/components/table/SortableHeader";
import { TableToolbar } from "@/components/table/TableToolbar";
import { OptionsDropdown } from "@/components/table/OptionsDropdown";
import { FilterPopover, FilterChips, type FilterConfig, type FilterState, type EnumFilter, type TextFilter, type NumberRangeFilter } from "@/components/table/FilterPopover";
import { exportToExcel, convertDataToExportFormat } from "@/lib/exportExcel";
import { MobileHeader, MobileSpacer } from "@/components/MobileHeader";
import { QRCodeModal, type QRModalData } from "@/components/QRCodeModal";

const STATUS_OPTIONS = ["Yet to Start", "In-progress", "Completed"];
const STAGE_OPTIONS = ["Yet to Start", "Raw Material", "Metallisation", "Slitting", "Completed"];

const statusFilter: EnumFilter = { label: "Status", key: "status", options: STATUS_OPTIONS };
const stageFilter: EnumFilter = { label: "Stage", key: "stage", options: STAGE_OPTIONS };
const textFilters: TextFilter[] = [
  { label: "Product Order ID", key: "poId", placeholder: "Search..." },
  { label: "Customer", key: "customer" },
  { label: "Grade", key: "grade" },
];
const numberFilters: NumberRangeFilter[] = [
  { label: "Quantity", minKey: "quantityMin", maxKey: "quantityMax" },
];

const filterConfig: FilterConfig = {
  enums: [statusFilter, stageFilter],
  texts: textFilters,
  numberRanges: numberFilters,
};

export type ProductOrderRow = {
  id: string;
  micron: string;
  width: string;
  product: string;
  grade: string;
  specifications: string;
  quantity: string;
  customer: string;
  instructions: string;
  status: string;
  stage: string;
  timestamp: string;
  [key: string]: string; // for type safety in useTableControls
};

const productOrderConfig: TableConfig<ProductOrderRow> = {
  columns: [
    { key: "id", label: "Order ID", type: "text", sortable: true },
    { key: "micron", label: "Micron", type: "text", sortable: true },
    { key: "width", label: "Width", type: "text", sortable: true },
    { key: "product", label: "Product", type: "text", sortable: true },
    { key: "grade", label: "Grade", type: "text", sortable: true },
    { key: "quantity", label: "Quantity", type: "number", sortable: true },
    { key: "customer", label: "Customer", type: "text", sortable: true },
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
      options: ["Yet to Start", "Raw Material", "Metallisation", "Slitting", "Winding", "Completed"] 
    },
    { key: "timestamp", label: "Timestamp", type: "date", sortable: true },
    { key: "qr", label: "QR", type: "text", sortable: false },
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
  const { store, addProductOrder, updateProductOrder, deleteProductOrder } = useStore();
  const productOrders = store.productOrders;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);

  const generateProductOrderId = () => {
    return `#PO-CC-${Math.floor(1000 + Math.random() * 9000)}`;
  };

  const loadData = async () => {
    // using mock data via useStore hook
  };

  useEffect(() => {
    loadData();
  }, []);

  // All hooks MUST be called before any conditional returns (Rules of Hooks)
  const [qrData, setQrData] = useState<QRModalData | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState({
    poId: generateProductOrderId(),
    micron: "",
    width: "",
    product: "",
    grade: "",
    specifications: "",
    quantity: "",
    customer: "",
    instructions: "",
  });

  const openCreateModal = () => {
    setIsEditMode(false);
    setFormData({
      poId: generateProductOrderId(),
      micron: "",
      width: "",
      product: "",
      grade: "",
      specifications: "",
      quantity: "",
      customer: "",
      instructions: "",
    });
    setIsModalOpen(true);
  };

  const openEditModal = (row: ProductOrderRow) => {
    setIsEditMode(true);
    setFormData({
      poId: row.id,
      micron: row.micron,
      width: row.width,
      product: row.product,
      grade: row.grade,
      specifications: row.specifications || "",
      quantity: row.quantity,
      customer: row.customer || "",
      instructions: row.instructions || "",
    });
    setIsModalOpen(true);
  };

  const {
    processedData,
    sortConfig,
    handleSort,
    filters,
    handleFilterChange,
    dateRange,
    setDateRange,
    getPaginatedData,
    setCurrentPage,
  } = useTableControls({ data: productOrders, config: productOrderConfig });

  const [tableFilters, setTableFilters] = useState<FilterState>(() => {
    const state: FilterState = {};
    state.status = [...STATUS_OPTIONS];
    state.stage = [...STAGE_OPTIONS];
    state.poId = "";
    state.customer = "";
    state.grade = "";
    state.quantityMin = "";
    state.quantityMax = "";
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
    } else if (key === "poId") {
      setTableFilters({ ...tableFilters, poId: "" });
    } else if (key === "customer") {
      setTableFilters({ ...tableFilters, customer: "" });
    } else if (key === "grade") {
      setTableFilters({ ...tableFilters, grade: "" });
    } else if (key === "quantityMin") {
      setTableFilters({ ...tableFilters, quantityMin: "", quantityMax: "" });
    }
  };

  const handleSubmit = async () => {
    if (
      !formData.micron ||
      !formData.width ||
      !formData.product ||
      !formData.quantity
    ) {
      return;
    }

    if (isEditMode) {
      updateProductOrder(formData.poId, {
        micron: formData.micron,
        width: formData.width,
        product: formData.product,
        grade: formData.grade,
        specifications: formData.specifications,
        quantity: formData.quantity,
        customer: formData.customer,
        instructions: formData.instructions,
      });
    } else {
      addProductOrder({
        id: formData.poId,
        micron: formData.micron,
        width: formData.width,
        product: formData.product,
        grade: formData.grade,
        specifications: formData.specifications,
        quantity: formData.quantity,
        customer: formData.customer,
        instructions: formData.instructions,
        status: "Yet to Start",
        stage: "Raw Material",
        timestamp: new Date().toISOString(),
      });
    }

    setIsModalOpen(false);
  };

  const filteredData = processedData.filter((row) => {
    const f = tableFilters;
    if (f.status && !(f.status as string[])?.includes(row.status)) return false;
    if (f.stage && !(f.stage as string[])?.includes(row.stage)) return false;
    if (f.poId && !row.id.toLowerCase().includes((f.poId as string).toLowerCase())) return false;
    if (f.customer && row.customer !== (f.customer as string)) return false;
    if (f.grade && row.grade !== (f.grade as string)) return false;
    if (f.quantityMin && parseInt(row.quantity) < parseInt(f.quantityMin as string)) return false;
    if (f.quantityMax && parseInt(row.quantity) > parseInt(f.quantityMax as string)) return false;
    return true;
  });

  const searchedData = filteredData.filter((row) =>
    row.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const { paginatedData, totalPages, validPage: currentPage } = getPaginatedData(filteredData);

  return (
    <div className="font-dm-sans min-h-[calc(100vh-72px)] bg-white flex flex-col relative w-full max-w-full">
      <MobileHeader title="Product Orders" />

      {/* Header section */}
      <section className="bg-white w-full flex justify-start border-b border-[#EBEBEB]">
        <div className="w-full px-4 md:px-6 pt-[72px] pb-4 md:pt-6 md:pb-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 h-auto">
          <div className="flex flex-col gap-1">
            <h1 className="text-[18px] font-semibold text-[#171717] leading-tight">Product Orders</h1>
            <p className="text-[14px] font-normal text-[#5C5C5C] leading-tight hidden md:block">
              Manage orders
            </p>
          </div>
          {/* <button 
            onClick={openNewOrderModal}
            className="flex items-center justify-center gap-2 bg-[#00B6E2] text-white text-[14px] font-medium rounded-[6px] h-[40px] px-[18px] hover:bg-[#0092b5] transition-colors shrink-0 w-full sm:w-auto"
          >
            <Plus className="w-5 h-5 shrink-0" strokeWidth={2.5} />
            <span className="leading-tight">Add Product Order</span>
          </button> */}
        </div>
      </section>

      {/* Main Content */}
      <div className="w-full px-4 md:px-6 flex flex-col mt-6 gap-4 md:gap-6 mb-6">
        
        {/* Stats Section - Mobile 2x2 grid */}
        <section className="grid grid-cols-2 gap-0 md:hidden bg-white border border-[#EBEBEB] rounded-[12px]">
          {[
            { title: "Total Orders", value: String(productOrders.length), valClass: "text-[#171717]", subtextClass: "text-[#5C5C5C]", subtext: "" },
            { title: "Units Planned", value: String(productOrders.reduce((sum, po) => sum + (Number(po.quantity) || 0), 0)), valClass: "text-[#171717]", subtextClass: "text-[#5C5C5C]", subtext: "" },
            { title: "In Progress", value: String(productOrders.filter(po => po.status === "In-progress").length), valClass: "text-[#E19242]", subtextClass: "text-[#5C5C5C]", subtext: "" },
            { title: "Yet to Start", value: String(productOrders.filter(po => po.status === "Yet to Start").length), valClass: "text-[#FB3748]", subtextClass: "text-[#5C5C5C]", subtext: "" }
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
                <span className="text-[20px] font-semibold leading-tight text-[#171717]">{productOrders.length}</span>
                <span className="text-[12px] leading-tight text-[#5C5C5C]">
                  Total
                </span>
              </div>
            </div>
            <div className="hidden lg:block w-[1px] h-[37px] bg-[#EAECF0]"></div>
          </div>
          
          <div className="flex items-center justify-between px-6 py-2 sm:py-0">
            <div className="flex flex-col gap-[8px]">
              <p className="text-[12px] font-medium text-[#5C5C5C] leading-tight">Units Planned</p>
              <div className="flex items-baseline gap-3">
                <span className="text-[20px] font-semibold leading-tight text-[#171717]">{productOrders.reduce((sum, po) => sum + (Number(po.quantity) || 0), 0)}</span>
                <span className="text-[12px] leading-tight text-[#5C5C5C]">
                  Total Units
                </span>
              </div>
            </div>
            <div className="hidden lg:block w-[1px] h-[37px] bg-[#EAECF0]"></div>
          </div>

          <div className="flex items-center justify-between px-6 py-2 sm:py-0">
            <div className="flex flex-col gap-[8px]">
              <p className="text-[12px] font-medium text-[#5C5C5C] leading-tight">In-Progress Orders</p>
              <div className="flex items-baseline gap-3">
                <span className="text-[20px] font-semibold leading-tight text-[#171717]">{productOrders.filter(po => po.status === 'In-progress').length}</span>
                <span className="text-[12px] leading-tight text-[#5C5C5C]">
                  Active
                </span>
              </div>
            </div>
            <div className="hidden lg:block w-[1px] h-[37px] bg-[#EAECF0]"></div>
          </div>

          <div className="flex items-center justify-between px-6 py-2 sm:py-0">
            <div className="flex flex-col gap-[8px]">
              <p className="text-[12px] font-medium text-[#5C5C5C] leading-tight">Pending Orders</p>
              <div className="flex items-baseline gap-3">
                <span className="text-[20px] font-semibold leading-tight text-[#171717]">{productOrders.filter(po => po.status === 'Yet to Start').length}</span>
                <span className="text-[12px] leading-tight text-[#FB3748] font-medium">To Start</span>
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
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
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
                "Micron": row.micron,
                "Width": row.width,
                "Product": row.product,
                "Quantity": row.quantity,
                "Status": row.status,
                "Stage": row.stage,
                "Timestamp": row.timestamp,
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
        <section className="hidden md:block bg-white rounded-[12px] flex flex-col gap-4 overflow-hidden">
          <div className="border border-[#EAECF0] rounded-[8px] overflow-x-auto min-h-[400px]">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-[#F5F7FA] border-b border-[#EBEBEB]">
                  {productOrderConfig.columns.map((col) => (
                    <th key={String(col.key)} className="px-4 py-[11px]">
                      <SortableHeader
                        column={col as any}
                        sortConfig={sortConfig as any}
                        onSort={handleSort as any}
                        filters={filters as any}
                        onFilterChange={handleFilterChange as any}
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAECF0]">
                {searchedData.map((row) => {
                  const cleanId = row.id.replace('#', '');
                  return (
                  <tr key={row.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-4 py-4 text-[14px] text-[#5C5C5C] font-medium whitespace-nowrap">
                      <Link href={`/person-b-winding/productorder/${cleanId}`} className="hover:text-[#00B6E2] hover:underline cursor-pointer">
                        {row.id}
                      </Link>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-[14px] text-[#5C5C5C]">{row.micron}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-[14px] text-[#5C5C5C]">{row.width}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-[14px] text-[#5C5C5C]">{row.product}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-[14px] text-[#5C5C5C]">{row.grade}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-[14px] text-[#5C5C5C]">{row.quantity}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-[14px] text-[#5C5C5C]">{row.customer}</td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <StatusBadge status={row.stage} />
                    </td>
                    <td className="px-4 py-4 text-[14px] text-[#5C5C5C] whitespace-nowrap">{row.timestamp}</td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <button onClick={() => setQrData({ id: cleanId, type: "PO", data: { micron: row.micron, width: row.width, product: row.product, quantity: row.quantity, status: row.status } })} className="text-[#5C5C5C] hover:text-[#00B6E2] transition-colors p-1">
                        <QrCode className="w-4 h-4" />
                      </button>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <OptionsDropdown 
                        viewHref={`/person-b-winding/productorder/${cleanId}`}
                        status={row.status}
                        // onEdit={() => openEditModal(row)}
                        onDelete={async () => {
                          if (confirm(`Are you sure you want to delete ${row.id}?`)) {
                            if ((row as any).uuid) {
                              try {
                                deleteProductOrder(row.id);
                                await loadData();
                              } catch (e) {
                                console.error(e);
                                alert("Failed to delete product order");
                              }
                            }
                          }
                        }}
                      />
                    </td>
                  </tr>
                )})}
                {searchedData.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-1 py-8 text-center text-[14px] text-[#5C5C5C]">
                      No product orders found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <TablePagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          
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

      {qrData && <QRCodeModal id={qrData.id} type={qrData.type} data={qrData.data} onClose={() => setQrData(null)} />}
    </div>
  );
}

