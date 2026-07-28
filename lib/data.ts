export type WorkflowStatus = "Yet to Start" | "In-progress" | "Completed";

export type ProductOrderSummary = {
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
};

export type WorkOrderSummary = {
  id: string;
  micron: string;
  width: string;
  qty: string;
  date: string;
};

export type WorkOrderOverview = {
  wordCount: string;
  micron: string;
  width: string;
  quantity: string;
  stage: string;
  date: string;
  status: WorkflowStatus;
};

export type RawMaterialRow = {
  rollNo: string;
  weight: string;
  thickness: string;
  supplier: string;
  stage: string;
  status: WorkflowStatus;
  actualWeight?: string;
  damagedWeight?: string;
  usedWeight?: string;
  wastageWeight?: string;
  netWeight?: string;
  grossWeight?: string;
  width?: string;
  temperature?: string;
};

export type MetallisationRow = {
  coilNo: string;
  rmId: string;
  machineNo: string;
  weight: string;
  opticalDensity: string;
  resistance: string;
  timestamp: string;
  nextStage: string;
  status: WorkflowStatus;
};

export type SlittingRow = {
  productNo: string;
  rmId: string;
  weight: string;
  thickness: string;
  grade: string;
  remarks?: string;
  timestampAdded: string;
  stage: string;
  status: WorkflowStatus;
};

export type WindingRow = {
  wdId: string;
  linkedPmId: string;
  filmWidth: string;
  windingTension: string;
  turnsCount: string;
  quantityWound: string;
  stage: string;
  timestamp: string;
  status: WorkflowStatus;
};

export type SprayRow = {
  spId: string;
  linkedWdId: string;
  sprayType: string;
  feedRate: string;
  pressureSitting: string;
  stage: string;
  timestamp: string;
  status: WorkflowStatus;
};

export type WorkOrderFlowData = {
  overview: WorkOrderOverview;
  rawMaterialRows: RawMaterialRow[];
  metallisationRows: MetallisationRow[];
  slittingRows: SlittingRow[];
  windingRows: WindingRow[];
  sprayRows: SprayRow[];
};

export type WorkOrderProgress = {
  stage: string;
  status: WorkflowStatus;
};

export type InventoryItem = {
  rawMaterialId: string;
  rollId: string;
  micron: string;
  width: string;
  weight: string;
  supplier: string;
  date: string;
  status: "In Inventory" | "Being Used" | "Used Completely";
  netWeight?: string;
  grossWeight?: string;
  temperature?: string;
};

export type MaterialRequestItem = {
  productNo: string;
  weight: string;
  requestedQty: string;
  issuedQty: string;
  grade: string;
};

export type MaterialRequest = {
  id: string;
  items: MaterialRequestItem[];
  status: "Pending" | "Partially Issued" | "Issued" | "Cancelled";
  createdAt: string;
  issuedAt?: string;
  notes?: string;
};

export type MaterialReturn = {
  id: string;
  materialId: string;
  weight: string;
  usedWeight: string;
  reason: string;
  status: "Pending" | "Returned" | "Accepted" | "Rejected";
  createdAt: string;
};

export type AssignedStock = {
  stockId: string;
  linkedWoId: string;
  weight: string;
  width: string;
  micron: string;
  grade: string;
  stage: string;
  assignedAt: string;
};

export type VendorPurchaseItem = {
  id: string;
  type: string;
  rate: string;
  quantity: string;
  total: string;
};

export type PaymentHistoryEntry = {
  id: string;
  date: string;
  amountPaid: string;
  paymentType: string;
  notes?: string;
};

export type VendorPurchase = {
  id: string;
  vendorName: string;
  purchaseDate: string;
  direction: "Credit" | "Debit";
  items: VendorPurchaseItem[];
  grandTotal: string;
  status: "Paid" | "Partial Payment" | "Due";
  amountPaid: string;
  paymentType: string;
  notes?: string;
  paymentHistory: PaymentHistoryEntry[];
};

const godownPrimaryRange = Array.from({ length: 101 }, (_, idx) => `RM-${8300 + idx}`);
const godownSecondaryRange = Array.from({ length: 201 }, (_, idx) => `RM-${3400 + idx}`);

export const godownRawMaterialIds = Array.from(
  new Set([
    ...godownSecondaryRange,
    ...godownPrimaryRange,
    "RM-456",
    "RM-457",
    "RM-458",
    "RM-461",
    "RM-462",
    "RM-470",
    "RM-480",
    "RM-481",
    "RM-482",
    "RM-490",
  ]),
);

export function createSeedInventory(): InventoryItem[] {
  return [
    { rawMaterialId: "RM-8301", rollId: "RL-2401-001", micron: "4.5", width: "1.0", weight: "58.5kgs", netWeight: "58.5kgs", grossWeight: "60.0kgs", temperature: "25°C", supplier: "VedaCap Industries", date: "10/01/2025", status: "In Inventory" },
    { rawMaterialId: "RM-8302", rollId: "RL-2401-002", micron: "6.5", width: "1.2", weight: "45.2kgs", netWeight: "45.2kgs", grossWeight: "47.0kgs", temperature: "26°C", supplier: "ElectroForge Capacitors", date: "10/01/2025", status: "In Inventory" },
    { rawMaterialId: "RM-8303", rollId: "RL-2401-003", micron: "5.0", width: "0.8", weight: "62.8kgs", netWeight: "62.8kgs", grossWeight: "64.5kgs", temperature: "24°C", supplier: "NextGen Metallic Pvt Ltd", date: "11/01/2025", status: "In Inventory" },
    { rawMaterialId: "RM-8304", rollId: "RL-2401-004", micron: "4.5", width: "1.0", weight: "55.0kgs", netWeight: "55.0kgs", grossWeight: "56.8kgs", temperature: "25°C", supplier: "VedaCap Industries", date: "11/01/2025", status: "In Inventory" },
    { rawMaterialId: "RM-8305", rollId: "RL-2401-005", micron: "7.5", width: "1.5", weight: "48.3kgs", netWeight: "48.3kgs", grossWeight: "50.1kgs", temperature: "27°C", supplier: "ElectroForge Capacitors", date: "12/01/2025", status: "In Inventory" },
    { rawMaterialId: "RM-8306", rollId: "RL-2402-001", micron: "3.5", width: "0.9", weight: "52.1kgs", netWeight: "52.1kgs", grossWeight: "53.8kgs", temperature: "24°C", supplier: "NextGen Metallic Pvt Ltd", date: "12/01/2025", status: "In Inventory" },
    { rawMaterialId: "RM-8307", rollId: "RL-2402-002", micron: "6.0", width: "1.1", weight: "60.0kgs", netWeight: "60.0kgs", grossWeight: "62.0kgs", temperature: "25°C", supplier: "VedaCap Industries", date: "13/01/2025", status: "In Inventory" },
    { rawMaterialId: "RM-8308", rollId: "RL-2402-003", micron: "5.5", width: "1.0", weight: "47.5kgs", netWeight: "47.5kgs", grossWeight: "49.2kgs", temperature: "26°C", supplier: "ElectroForge Capacitors", date: "13/01/2025", status: "In Inventory" },
    { rawMaterialId: "RM-8309", rollId: "RL-2402-004", micron: "4.0", width: "0.8", weight: "53.8kgs", netWeight: "53.8kgs", grossWeight: "55.5kgs", temperature: "24°C", supplier: "NextGen Metallic Pvt Ltd", date: "14/01/2025", status: "In Inventory" },
    { rawMaterialId: "RM-8310", rollId: "RL-2402-005", micron: "6.5", width: "1.2", weight: "49.2kgs", netWeight: "49.2kgs", grossWeight: "51.0kgs", temperature: "25°C", supplier: "VedaCap Industries", date: "14/01/2025", status: "In Inventory" },
    { rawMaterialId: "RM-3401", rollId: "RL-2403-001", micron: "4.0", width: "0.8", weight: "50.0kgs", netWeight: "50.0kgs", grossWeight: "51.5kgs", temperature: "26°C", supplier: "ElectroForge Capacitors", date: "15/01/2025", status: "In Inventory" },
    { rawMaterialId: "RM-3402", rollId: "RL-2403-002", micron: "5.5", width: "1.0", weight: "55.5kgs", netWeight: "55.5kgs", grossWeight: "57.0kgs", temperature: "25°C", supplier: "NextGen Metallic Pvt Ltd", date: "15/01/2025", status: "In Inventory" },
  ];
}

export function createSeedStore() {
  const inventory: InventoryItem[] = [
    { rawMaterialId: "RM-8301", rollId: "RL-2401-001", micron: "4.5", width: "1.0", weight: "58.5kgs", supplier: "VedaCap Industries", date: "10/01/2025", status: "Being Used", netWeight: "58.5kgs", grossWeight: "60.0kgs", temperature: "25°C" },
    { rawMaterialId: "RM-8302", rollId: "RL-2401-002", micron: "6.5", width: "1.2", weight: "45.2kgs", supplier: "ElectroForge Capacitors", date: "10/01/2025", status: "Used Completely", netWeight: "45.2kgs", grossWeight: "47.0kgs", temperature: "26°C" },
    { rawMaterialId: "RM-8303", rollId: "RL-2401-003", micron: "5.0", width: "0.8", weight: "62.8kgs", supplier: "NextGen Metallic Pvt Ltd", date: "11/01/2025", status: "Being Used", netWeight: "62.8kgs", grossWeight: "64.5kgs", temperature: "24°C" },
    { rawMaterialId: "RM-8304", rollId: "RL-2401-004", micron: "4.5", width: "1.0", weight: "55.0kgs", supplier: "VedaCap Industries", date: "11/01/2025", status: "Being Used", netWeight: "55.0kgs", grossWeight: "56.8kgs", temperature: "25°C" },
    { rawMaterialId: "RM-8305", rollId: "RL-2401-005", micron: "7.5", width: "1.5", weight: "48.3kgs", supplier: "ElectroForge Capacitors", date: "12/01/2025", status: "Being Used", netWeight: "48.3kgs", grossWeight: "50.1kgs", temperature: "27°C" },
    { rawMaterialId: "RM-8306", rollId: "RL-2402-001", micron: "3.5", width: "0.9", weight: "52.1kgs", supplier: "NextGen Metallic Pvt Ltd", date: "12/01/2025", status: "In Inventory", netWeight: "52.1kgs", grossWeight: "53.8kgs", temperature: "24°C" },
    { rawMaterialId: "RM-8307", rollId: "RL-2402-002", micron: "6.0", width: "1.1", weight: "60.0kgs", supplier: "VedaCap Industries", date: "13/01/2025", status: "In Inventory", netWeight: "60.0kgs", grossWeight: "62.0kgs", temperature: "25°C" },
    { rawMaterialId: "RM-8308", rollId: "RL-2402-003", micron: "5.5", width: "1.0", weight: "47.5kgs", supplier: "ElectroForge Capacitors", date: "13/01/2025", status: "In Inventory", netWeight: "47.5kgs", grossWeight: "49.2kgs", temperature: "26°C" },
    { rawMaterialId: "RM-8309", rollId: "RL-2402-004", micron: "4.0", width: "0.8", weight: "53.8kgs", supplier: "NextGen Metallic Pvt Ltd", date: "14/01/2025", status: "In Inventory", netWeight: "53.8kgs", grossWeight: "55.5kgs", temperature: "24°C" },
    { rawMaterialId: "RM-8310", rollId: "RL-2402-005", micron: "6.5", width: "1.2", weight: "49.2kgs", supplier: "VedaCap Industries", date: "14/01/2025", status: "In Inventory", netWeight: "49.2kgs", grossWeight: "51.0kgs", temperature: "25°C" },
    { rawMaterialId: "RM-3401", rollId: "RL-2403-001", micron: "4.0", width: "0.8", weight: "50.0kgs", supplier: "ElectroForge Capacitors", date: "15/01/2025", status: "In Inventory", netWeight: "50.0kgs", grossWeight: "51.5kgs", temperature: "26°C" },
    { rawMaterialId: "RM-3402", rollId: "RL-2403-002", micron: "5.5", width: "1.0", weight: "55.5kgs", supplier: "NextGen Metallic Pvt Ltd", date: "15/01/2025", status: "In Inventory", netWeight: "55.5kgs", grossWeight: "57.0kgs", temperature: "25°C" },
  ];

  const now = new Date();
  const d = (offset: number) => {
    const dt = new Date(now);
    dt.setDate(dt.getDate() + offset);
    return `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}/${dt.getFullYear()}`;
  };

  const workOrders: WorkOrderSummary[] = [
    { id: "WO-2026-001", micron: "4.5", width: "1.0", qty: "5000", date: d(-5) },
    { id: "WO-2026-002", micron: "6.5", width: "1.2", qty: "3000", date: d(-4) },
    { id: "WO-2026-003", micron: "5.0", width: "0.8", qty: "4500", date: d(-3) },
    { id: "WO-2026-004", micron: "7.5", width: "1.5", qty: "2500", date: d(-2) },
    { id: "WO-2026-005", micron: "3.5", width: "0.9", qty: "6000", date: d(-1) },
  ];

  const flowDataMap: Record<string, WorkOrderFlowData> = {
    "WO-2026-001": {
      overview: { wordCount: "4.5µ x 1.0mm", micron: "4.5", width: "1.0", quantity: "5000", stage: "Completed", date: d(-5), status: "Completed" },
      rawMaterialRows: [
        { rollNo: "RM-8301", weight: "58.5kgs", thickness: "4.5", supplier: "VedaCap Industries", stage: "METALLISATION", status: "Completed", netWeight: "58.5kgs", grossWeight: "60.0kgs", width: "1.0", temperature: "25°C" },
        { rollNo: "RM-8302", weight: "45.2kgs", thickness: "6.5", supplier: "ElectroForge Capacitors", stage: "METALLISATION", status: "Completed", netWeight: "45.2kgs", grossWeight: "47.0kgs", width: "1.2", temperature: "26°C" },
      ],
      metallisationRows: [
        { coilNo: "MC-1001", rmId: "RM-8301", machineNo: "M-01", weight: "58.5kgs", opticalDensity: "2.4", resistance: "1.5 Ohms", timestamp: `${d(-4)} 10:30`, nextStage: "SLITTING", status: "Completed" },
        { coilNo: "MC-1002", rmId: "RM-8302", machineNo: "M-01", weight: "45.2kgs", opticalDensity: "2.3", resistance: "1.6 Ohms", timestamp: `${d(-4)} 14:15`, nextStage: "SLITTING", status: "Completed" },
      ],
      slittingRows: [
        { productNo: "PM-1001", rmId: "RM-8301", weight: "28.5kgs", thickness: "4.5", grade: "AA", remarks: "Good quality", timestampAdded: d(-3), stage: "Completed", status: "Completed" },
        { productNo: "PM-1002", rmId: "RM-8301", weight: "30.0kgs", thickness: "4.5", grade: "A", remarks: "Standard", timestampAdded: d(-3), stage: "Completed", status: "Completed" },
        { productNo: "PM-1003", rmId: "RM-8302", weight: "45.2kgs", thickness: "6.5", grade: "AA", remarks: "Premium", timestampAdded: d(-3), stage: "Completed", status: "Completed" },
      ],
      windingRows: [
        { wdId: "WD-1001", linkedPmId: "PM-1001", filmWidth: "7mm", windingTension: "0.5 N", turnsCount: "120", quantityWound: "250", stage: "Completed", timestamp: `${d(-2)} 09:15`, status: "Completed" },
        { wdId: "WD-1002", linkedPmId: "PM-1002", filmWidth: "7mm", windingTension: "0.5 N", turnsCount: "110", quantityWound: "240", stage: "Completed", timestamp: `${d(-2)} 11:30`, status: "Completed" },
      ],
      sprayRows: [
        { spId: "SP-1001", linkedWdId: "WD-1001", sprayType: "Zinc-spray", feedRate: "0.5", pressureSitting: "120", stage: "Moved to Person C", timestamp: `${d(-1)} 14:00`, status: "Completed" },
      ],
    },
    "WO-2026-002": {
      overview: { wordCount: "6.5µ x 1.2mm", micron: "6.5", width: "1.2", quantity: "3000", stage: "Metallisation", date: d(-4), status: "In-progress" },
      rawMaterialRows: [
        { rollNo: "RM-8303", weight: "62.8kgs", thickness: "5.0", supplier: "NextGen Metallic Pvt Ltd", stage: "METALLISATION", status: "Completed", netWeight: "62.8kgs", grossWeight: "64.5kgs", width: "0.8", temperature: "24°C" },
        { rollNo: "RM-8304", weight: "55.0kgs", thickness: "4.5", supplier: "VedaCap Industries", stage: "METALLISATION", status: "Completed", netWeight: "55.0kgs", grossWeight: "56.8kgs", width: "1.0", temperature: "25°C" },
      ],
      metallisationRows: [
        { coilNo: "MC-2001", rmId: "RM-8303", machineNo: "M-02", weight: "62.8kgs", opticalDensity: "2.5", resistance: "1.4 Ohms", timestamp: `${d(-2)} 09:00`, nextStage: "SLITTING", status: "Completed" },
        { coilNo: "MC-2002", rmId: "RM-8304", machineNo: "M-02", weight: "55.0kgs", opticalDensity: "2.2", resistance: "1.7 Ohms", timestamp: `${d(-1)} 11:30`, nextStage: "SLITTING", status: "In-progress" },
      ],
      slittingRows: [],
      windingRows: [],
      sprayRows: [],
    },
    "WO-2026-003": {
      overview: { wordCount: "5.0µ x 0.8mm", micron: "5.0", width: "0.8", quantity: "4500", stage: "Raw Material", date: d(-3), status: "Yet to Start" },
      rawMaterialRows: [
        { rollNo: "RM-8305", weight: "48.3kgs", thickness: "7.5", supplier: "ElectroForge Capacitors", stage: "METALLISATION", status: "Yet to Start", netWeight: "48.3kgs", grossWeight: "50.1kgs", width: "1.5", temperature: "27°C" },
      ],
      metallisationRows: [],
      slittingRows: [],
      windingRows: [],
      sprayRows: [],
    },
    "WO-2026-004": {
      overview: { wordCount: "7.5µ x 1.5mm", micron: "7.5", width: "1.5", quantity: "2500", stage: "Raw Material", date: d(-2), status: "Yet to Start" },
      rawMaterialRows: [
        { rollNo: "RM-3401", weight: "50.0kgs", thickness: "4.0", supplier: "ElectroForge Capacitors", stage: "METALLISATION", status: "Yet to Start", netWeight: "50.0kgs", grossWeight: "51.5kgs", width: "0.8", temperature: "24°C" },
      ],
      metallisationRows: [],
      slittingRows: [],
      windingRows: [],
      sprayRows: [],
    },
    "WO-2026-005": {
      overview: { wordCount: "3.5µ x 0.9mm", micron: "3.5", width: "0.9", quantity: "6000", stage: "Raw Material", date: d(-1), status: "Yet to Start" },
      rawMaterialRows: [
        { rollNo: "RM-8306", weight: "52.1kgs", thickness: "3.5", supplier: "NextGen Metallic Pvt Ltd", stage: "METALLISATION", status: "Yet to Start", netWeight: "52.1kgs", grossWeight: "53.8kgs", width: "0.9", temperature: "24°C" },
      ],
      metallisationRows: [],
      slittingRows: [],
      windingRows: [],
      sprayRows: [],
    },
  };

  const productOrders: ProductOrderSummary[] = [
    {
      id: "PO-CC-21045",
      micron: "3.5",
      width: "30",
      product: "MFD",
      grade: "AAA",
      specifications: "Standard",
      quantity: "1500",
      customer: "OEM",
      instructions: "Handle with care",
      status: "Completed",
      stage: "Winding",
      timestamp: "2024-03-24T10:00:00Z",
    },
    {
      id: "PO-CC-21046",
      micron: "4 HT",
      width: "37.5",
      product: "PP",
      grade: "A",
      specifications: "High temp rating",
      quantity: "2000",
      customer: "NON OEM",
      instructions: "",
      status: "In-progress",
      stage: "Slitting",
      timestamp: "2024-03-24T11:30:00Z",
    },
    {
      id: "PO-CC-21047",
      micron: "4.5 HT",
      width: "45",
      product: "AL",
      grade: "B",
      specifications: "Aluminum coating",
      quantity: "1000",
      customer: "OEM",
      instructions: "Expedite delivery",
      status: "Yet to Start",
      stage: "Raw Material",
      timestamp: "2024-03-24T14:15:00Z",
    },
  ];

  const assignments: Record<string, AssignedStock[]> = {
    "#PO-CC-0001": [
      { stockId: "PM-1001", linkedWoId: "WO-2026-001", weight: "28.5kgs", width: "1.0", micron: "4.5", grade: "AA", stage: "Completed", assignedAt: `${d(-2)} 08:00` },
      { stockId: "PM-1003", linkedWoId: "WO-2026-001", weight: "45.2kgs", width: "1.0", micron: "6.5", grade: "AA", stage: "Completed", assignedAt: `${d(-2)} 08:05` },
    ],
  };

  return { workOrders, flowDataMap, inventoryItems: inventory, productOrders, materialRequests: [], materialReturns: [], assignments, vendorPurchases: [] };
}

export function createEmptyFlowData(seed?: Partial<WorkOrderOverview>): WorkOrderFlowData {
  return {
    overview: {
      wordCount: seed?.wordCount ?? "0 words",
      micron: seed?.micron ?? "-",
      width: seed?.width ?? "-",
      quantity: seed?.quantity ?? "-",
      stage: seed?.stage ?? "Raw Material",
      date: seed?.date ?? "-",
      status: seed?.status ?? "Yet to Start",
    },
    rawMaterialRows: [],
    metallisationRows: [],
    slittingRows: [],
    windingRows: [],
    sprayRows: [],
  };
}

export function computeWorkflowProgress(flow?: WorkOrderFlowData): WorkOrderProgress {
  if (!flow) {
    return { stage: "Raw Material", status: "Yet to Start" };
  }

  const stage =
    flow.sprayRows.length > 0
      ? "Spray"
      : flow.windingRows.length > 0
        ? "Winding"
        : flow.slittingRows.length > 0
          ? "Slitting"
          : flow.metallisationRows.length > 0
            ? "Metallisation"
            : flow.rawMaterialRows.length > 0
              ? "Raw Material"
              : "Raw Material";

  const allStatuses = [
    ...flow.rawMaterialRows.map((row) => row.status),
    ...flow.metallisationRows.map((row) => row.status),
    ...flow.slittingRows.map((row) => row.status),
    ...flow.windingRows.map((row) => row.status),
    ...flow.sprayRows.map((row) => row.status),
  ];

  const rawMaterialCompleted = flow.rawMaterialRows.length > 0 && flow.rawMaterialRows.every((row) => row.status === "Completed");
  const metallisationCompleted = flow.metallisationRows.length > 0 && flow.metallisationRows.every((row) => row.status === "Completed");
  const slittingCompleted = flow.slittingRows.length > 0 && flow.slittingRows.every((row) => row.status === "Completed");
  const windingCompleted = flow.windingRows.length > 0 && flow.windingRows.every((row) => row.status === "Completed");
  const sprayCompleted = flow.sprayRows.length > 0 && flow.sprayRows.every((row) => row.status === "Completed");

  if (sprayCompleted) {
    return { stage, status: "Completed" };
  }
  if (windingCompleted && flow.sprayRows.length === 0) {
    return { stage, status: "Completed" };
  }
  if (slittingCompleted && flow.windingRows.length === 0) {
    return { stage, status: "Completed" };
  }
  if (metallisationCompleted && flow.slittingRows.length === 0) {
    return { stage, status: "Completed" };
  }
  if (rawMaterialCompleted && flow.metallisationRows.length === 0) {
    return { stage, status: "Completed" };
  }

  const anyActive = allStatuses.some((status) => status === "In-progress" || status === "Completed");

  if (anyActive) {
    return { stage, status: "In-progress" };
  }

  return { stage, status: "Yet to Start" };
}
