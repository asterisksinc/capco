export type WorkflowStatus = "Yet to Start" | "In-progress" | "Completed";

export type WorkOrderSummary = {
  id: string;
  micron: string;
  width: string;
  qty: string;
  stage: string;
  date: string;
  status: WorkflowStatus;
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
  timestampAdded: string;
  stage: string;
  status: WorkflowStatus;
};

export type WorkOrderFlowData = {
  overview: WorkOrderOverview;
  rawMaterialRows: RawMaterialRow[];
  metallisationRows: MetallisationRow[];
  slittingRows: SlittingRow[];
};

export const initialWorkOrders: WorkOrderSummary[] = [
  { id: "WO-0001", micron: "4.5", width: "1.0", qty: "1", stage: "Metallisation", date: "10/01/2025", status: "In-progress" },
  { id: "WO-0002", micron: "3.8", width: "0.8", qty: "2", stage: "Raw Material", date: "11/01/2025", status: "Yet to Start" },
  { id: "WO-0003", micron: "5.0", width: "1.2", qty: "1", stage: "Slitting", date: "11/01/2025", status: "In-progress" },
  { id: "WO-0004", micron: "4.2", width: "1.0", qty: "3", stage: "Slitting", date: "12/01/2025", status: "Completed" },
  { id: "WO-0005", micron: "6.0", width: "1.4", qty: "1", stage: "Metallisation", date: "13/01/2025", status: "Yet to Start" },
];

export const flowByWorkOrderId: Record<string, WorkOrderFlowData> = {
  "WO-0001": {
    overview: {
      wordCount: "4,200 words",
      micron: "4.5",
      width: "1.0",
      quantity: "1",
      stage: "Metallisation",
      date: "10/01/2025",
      status: "In-progress",
    },
    rawMaterialRows: [
      { rollNo: "RM-456", weight: "60kgs", thickness: "4.5", supplier: "Asterisks.Inc", stage: "METALLISATION, SLITTING", status: "Completed" },
      { rollNo: "RM-457", weight: "58kgs", thickness: "4.5", supplier: "Asterisks.Inc", stage: "METALLISATION", status: "Completed" },
      { rollNo: "RM-458", weight: "62kgs", thickness: "4.5", supplier: "Global Metals", stage: "METALLISATION", status: "Completed" },
    ],
    metallisationRows: [
      { coilNo: "MC-0001", rmId: "RM-456", machineNo: "M-01", weight: "59.2kgs", opticalDensity: "2.4", resistance: "1.5 Ohms", timestamp: "11/01/2025 08:30", nextStage: "SLITTING", status: "Completed" },
      { coilNo: "MC-0002", rmId: "RM-457", machineNo: "M-02", weight: "59.5kgs", opticalDensity: "2.5", resistance: "1.4 Ohms", timestamp: "11/01/2025 10:15", nextStage: "SLITTING", status: "In-progress" },
    ],
    slittingRows: [
      { productNo: "PM-00001", rmId: "RM-456", weight: "58.5kgs", thickness: "4.5", grade: "A", timestampAdded: "13/01/2025 14:30", stage: "Ready for Dispatch", status: "Completed" },
      { productNo: "PM-00002", rmId: "RM-457", weight: "42.0kgs", thickness: "3.8", grade: "B", timestampAdded: "13/01/2025 15:45", stage: "Quality Check", status: "In-progress" },
    ],
  },
  "WO-0002": {
    overview: {
      wordCount: "3,600 words",
      micron: "3.8",
      width: "0.8",
      quantity: "2",
      stage: "Raw Material",
      date: "11/01/2025",
      status: "Yet to Start",
    },
    rawMaterialRows: [
      { rollNo: "RM-461", weight: "48kgs", thickness: "3.8", supplier: "Nova Foils", stage: "METALLISATION", status: "Yet to Start" },
      { rollNo: "RM-462", weight: "49kgs", thickness: "3.8", supplier: "Nova Foils", stage: "METALLISATION", status: "Yet to Start" },
    ],
    metallisationRows: [
      { coilNo: "MC-0010", rmId: "RM-461", machineNo: "M-03", weight: "TBD", opticalDensity: "TBD", resistance: "TBD", timestamp: "TBD", nextStage: "SLITTING", status: "Yet to Start" },
    ],
    slittingRows: [
      { productNo: "PM-00010", rmId: "RM-461", weight: "TBD", thickness: "3.8", grade: "TBD", timestampAdded: "TBD", stage: "Pending", status: "Yet to Start" },
    ],
  },
  "WO-0003": {
    overview: {
      wordCount: "5,100 words",
      micron: "5.0",
      width: "1.2",
      quantity: "1",
      stage: "Slitting",
      date: "11/01/2025",
      status: "In-progress",
    },
    rawMaterialRows: [
      { rollNo: "RM-470", weight: "72kgs", thickness: "5.0", supplier: "Asterisks.Inc", stage: "METALLISATION", status: "Completed" },
    ],
    metallisationRows: [
      { coilNo: "MC-0021", rmId: "RM-470", machineNo: "M-01", weight: "70.8kgs", opticalDensity: "2.7", resistance: "1.3 Ohms", timestamp: "12/01/2025 09:20", nextStage: "SLITTING", status: "Completed" },
    ],
    slittingRows: [
      { productNo: "PM-00021", rmId: "RM-470", weight: "35.1kgs", thickness: "5.0", grade: "A", timestampAdded: "13/01/2025 12:05", stage: "Quality Check", status: "In-progress" },
      { productNo: "PM-00022", rmId: "RM-470", weight: "34.9kgs", thickness: "5.0", grade: "A", timestampAdded: "13/01/2025 12:40", stage: "Ready for Dispatch", status: "Completed" },
    ],
  },
  "WO-0004": {
    overview: {
      wordCount: "4,000 words",
      micron: "4.2",
      width: "1.0",
      quantity: "3",
      stage: "Slitting",
      date: "12/01/2025",
      status: "Completed",
    },
    rawMaterialRows: [
      { rollNo: "RM-480", weight: "55kgs", thickness: "4.2", supplier: "Global Metals", stage: "METALLISATION", status: "Completed" },
      { rollNo: "RM-481", weight: "54kgs", thickness: "4.2", supplier: "Global Metals", stage: "METALLISATION", status: "Completed" },
      { rollNo: "RM-482", weight: "56kgs", thickness: "4.2", supplier: "Asterisks.Inc", stage: "METALLISATION", status: "Completed" },
    ],
    metallisationRows: [
      { coilNo: "MC-0030", rmId: "RM-480", machineNo: "M-02", weight: "54.3kgs", opticalDensity: "2.3", resistance: "1.6 Ohms", timestamp: "12/01/2025 15:10", nextStage: "SLITTING", status: "Completed" },
      { coilNo: "MC-0031", rmId: "RM-481", machineNo: "M-02", weight: "55.1kgs", opticalDensity: "2.3", resistance: "1.6 Ohms", timestamp: "12/01/2025 16:00", nextStage: "SLITTING", status: "Completed" },
    ],
    slittingRows: [
      { productNo: "PM-00030", rmId: "RM-480", weight: "26.9kgs", thickness: "4.2", grade: "A", timestampAdded: "13/01/2025 10:10", stage: "Ready for Dispatch", status: "Completed" },
      { productNo: "PM-00031", rmId: "RM-481", weight: "27.4kgs", thickness: "4.2", grade: "A", timestampAdded: "13/01/2025 10:50", stage: "Ready for Dispatch", status: "Completed" },
    ],
  },
  "WO-0005": {
    overview: {
      wordCount: "6,000 words",
      micron: "6.0",
      width: "1.4",
      quantity: "1",
      stage: "Metallisation",
      date: "13/01/2025",
      status: "Yet to Start",
    },
    rawMaterialRows: [
      { rollNo: "RM-490", weight: "80kgs", thickness: "6.0", supplier: "Asterisks.Inc", stage: "METALLISATION", status: "Completed" },
    ],
    metallisationRows: [
      { coilNo: "MC-0040", rmId: "RM-490", machineNo: "M-04", weight: "TBD", opticalDensity: "TBD", resistance: "TBD", timestamp: "TBD", nextStage: "SLITTING", status: "Yet to Start" },
    ],
    slittingRows: [
      { productNo: "PM-00040", rmId: "RM-490", weight: "TBD", thickness: "6.0", grade: "TBD", timestampAdded: "TBD", stage: "Pending", status: "Yet to Start" },
    ],
  },
};

export function getWorkOrderFlowData(workOrderId: string): WorkOrderFlowData {
  return (
    flowByWorkOrderId[workOrderId.toUpperCase()] ?? {
      overview: {
        wordCount: "0 words",
        micron: "-",
        width: "-",
        quantity: "-",
        stage: "Raw Material",
        date: "-",
        status: "Yet to Start",
      },
      rawMaterialRows: [],
      metallisationRows: [],
      slittingRows: [],
    }
  );
}