export type WorkflowStatus = "Yet to Start" | "In-progress" | "Completed";

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

export type WorkOrderFlowData = {
  overview: WorkOrderOverview;
  rawMaterialRows: RawMaterialRow[];
  metallisationRows: MetallisationRow[];
  slittingRows: SlittingRow[];
};

export type WorkOrderProgress = {
  stage: string;
  status: WorkflowStatus;
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
  };
}

export function computeWorkflowProgress(flow?: WorkOrderFlowData): WorkOrderProgress {
  if (!flow) {
    return { stage: "Raw Material", status: "Yet to Start" };
  }

  const stage =
    flow.slittingRows.length > 0
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
  ];

  const slittingCompleted =
    flow.slittingRows.length > 0 && flow.slittingRows.every((row) => row.status === "Completed");

  if (slittingCompleted) {
    return { stage, status: "Completed" };
  }

  const anyActive = allStatuses.some((status) => status === "In-progress" || status === "Completed");

  if (anyActive) {
    return { stage, status: "In-progress" };
  }

  return { stage, status: "Yet to Start" };
}
