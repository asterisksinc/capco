import { useState, useEffect } from 'react';
import {
  createEmptyFlowData,
  computeWorkflowProgress,
  type WorkOrderSummary,
  type WorkOrderFlowData,
  type WorkflowStatus,
} from '../lib/data';

interface StoreData {
  workOrders: WorkOrderSummary[];
  flowDataMap: Record<string, WorkOrderFlowData>;
}

export type ComputedWorkOrderSummary = WorkOrderSummary & {
  stage: string;
  status: WorkflowStatus;
};

const STORAGE_KEY = 'capcoDataStore';
const EMPTY_STORE: StoreData = { workOrders: [], flowDataMap: {} };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function sanitizeStore(raw: unknown): StoreData {
  if (!isRecord(raw)) return EMPTY_STORE;

  const workOrders: WorkOrderSummary[] = Array.isArray(raw.workOrders)
    ? raw.workOrders
        .filter((row): row is WorkOrderSummary => isRecord(row))
        .map((row) => ({
          id: String(row.id ?? '').toUpperCase(),
          micron: String(row.micron ?? '-'),
          width: String(row.width ?? '-'),
          qty: String(row.qty ?? '-'),
          date: String(row.date ?? '-'),
        }))
        .filter((row) => row.id.length > 0)
    : [];

  const flowDataMap: Record<string, WorkOrderFlowData> = {};
  if (isRecord(raw.flowDataMap)) {
    for (const [key, value] of Object.entries(raw.flowDataMap)) {
      if (!isRecord(value)) continue;

      const fallback = createEmptyFlowData();
      const rawRows = Array.isArray(value.rawMaterialRows) ? value.rawMaterialRows : [];
      const metRows = Array.isArray(value.metallisationRows) ? value.metallisationRows : [];
      const slitRows = Array.isArray(value.slittingRows) ? value.slittingRows : [];
      const overview = isRecord(value.overview) ? value.overview : {};

      const normalizedFlow: WorkOrderFlowData = {
        overview: {
          wordCount: String(overview.wordCount ?? fallback.overview.wordCount),
          micron: String(overview.micron ?? fallback.overview.micron),
          width: String(overview.width ?? fallback.overview.width),
          quantity: String(overview.quantity ?? fallback.overview.quantity),
          date: String(overview.date ?? fallback.overview.date),
          stage: String(overview.stage ?? fallback.overview.stage),
          status: (overview.status as WorkflowStatus) ?? fallback.overview.status,
        },
        rawMaterialRows: rawRows as WorkOrderFlowData['rawMaterialRows'],
        metallisationRows: metRows as WorkOrderFlowData['metallisationRows'],
        slittingRows: slitRows.map((row) => {
          if (isRecord(row) && row.stage === 'Ready for Dispatch') {
            return { ...row, stage: 'Ready for Winding' };
          }
          return row;
        }) as WorkOrderFlowData['slittingRows'],
      };

      const progress = computeWorkflowProgress(normalizedFlow);
      normalizedFlow.overview.stage = progress.stage;
      normalizedFlow.overview.status = progress.status;
      flowDataMap[key.toUpperCase()] = normalizedFlow;
    }
  }

  return { workOrders, flowDataMap };
}

export function loadStore(): StoreData {
  if (typeof window === 'undefined') return EMPTY_STORE;
  const stored = localStorage.getItem(STORAGE_KEY);

  if (!stored) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(EMPTY_STORE));
    return EMPTY_STORE;
  }

  try {
    const parsed = JSON.parse(stored);
    const sanitized = sanitizeStore(parsed);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
    return sanitized;
  } catch {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(EMPTY_STORE));
    return EMPTY_STORE;
  }
}

export function saveStore(data: StoreData) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    window.dispatchEvent(new Event('capco-store-change'));
  }
}

export function useStore() {
  const [store, setStore] = useState<StoreData>({ workOrders: [], flowDataMap: {} });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setStore(loadStore());
    setMounted(true);
    const listener = () => {
      setStore(loadStore());
    };
    window.addEventListener('capco-store-change', listener);
    return () => window.removeEventListener('capco-store-change', listener);
  }, []);

  const workOrders: ComputedWorkOrderSummary[] = store.workOrders.map((workOrder) => {
    const flow = store.flowDataMap[workOrder.id];
    const progress = computeWorkflowProgress(flow);
    return {
      ...workOrder,
      stage: progress.stage,
      status: progress.status,
    };
  });

  const addWorkOrder = (wo: WorkOrderSummary) => {
    const nextStore = loadStore();

    if (nextStore.workOrders.some((row) => row.id === wo.id)) {
      return;
    }

    nextStore.workOrders = [wo, ...nextStore.workOrders];
    nextStore.flowDataMap[wo.id] = createEmptyFlowData({
      micron: wo.micron,
      width: wo.width,
      quantity: wo.qty,
      date: wo.date,
    });

    saveStore(nextStore);
  };

  const addFlowRow = (woId: string, tab: string, rowData: any) => {
    const nextStore = loadStore();
    let flow = nextStore.flowDataMap[woId];
    if (!flow) {
      const workOrder = nextStore.workOrders.find((row) => row.id === woId);
      flow = createEmptyFlowData({
        micron: workOrder?.micron,
        width: workOrder?.width,
        quantity: workOrder?.qty,
        date: workOrder?.date ?? new Date().toLocaleDateString(),
      });
    }
    
    if (tab === "Raw Material") flow.rawMaterialRows.push(rowData);
    if (tab === "Metallisation") flow.metallisationRows.push(rowData);
    if (tab === "Slitting") {
      const row =
        rowData?.stage === "Ready for Dispatch"
          ? { ...rowData, stage: "Ready for Winding" }
          : rowData;
      flow.slittingRows.push(row);
    }

    const progress = computeWorkflowProgress(flow);
    flow.overview.stage = progress.stage;
    flow.overview.status = progress.status;
    
    nextStore.flowDataMap[woId] = flow;
    saveStore(nextStore);
  };

  return { store, mounted, workOrders, addWorkOrder, addFlowRow };
}
