"use client";

import { useState, useEffect } from 'react';
import {
  createEmptyFlowData,
  createSeedInventory,
  createSeedStore,
  computeWorkflowProgress,
  type WorkOrderSummary,
  type WorkOrderFlowData,
  type ProductOrderSummary,
  type WorkflowStatus,
  type InventoryItem,
  type MaterialRequest,
  type MaterialRequestItem,
  type MaterialReturn,
  type AssignedStock,
  type VendorPurchase,
} from '../lib/data';

interface StoreData {
  workOrders: WorkOrderSummary[];
  flowDataMap: Record<string, WorkOrderFlowData>;
  inventoryItems: InventoryItem[];
  productOrders: ProductOrderSummary[];
  materialRequests: MaterialRequest[];
  materialReturns: MaterialReturn[];
  assignments: Record<string, AssignedStock[]>;
  vendorPurchases: VendorPurchase[];
}

export type ComputedWorkOrderSummary = WorkOrderSummary & {
  stage: string;
  status: WorkflowStatus;
};

const STORAGE_KEY = 'capcoDataStore';
const EMPTY_STORE: StoreData = { workOrders: [], flowDataMap: {}, inventoryItems: [], productOrders: [], materialRequests: [], materialReturns: [], assignments: {}, vendorPurchases: [] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) && value.constructor === Object;
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
      const rawRows = (Array.isArray(value.rawMaterialRows) ? value.rawMaterialRows : [])
        .filter(isRecord).map((row) => ({
          rollNo: String(row.rollNo ?? ''),
          weight: String(row.weight ?? ''),
          thickness: String(row.thickness ?? ''),
          supplier: String(row.supplier ?? ''),
          stage: String(row.stage ?? 'METALLISATION'),
          status: (row.status as WorkflowStatus) ?? 'Yet to Start' as WorkflowStatus,
          actualWeight: row.actualWeight ? String(row.actualWeight) : undefined,
          damagedWeight: row.damagedWeight ? String(row.damagedWeight) : undefined,
          usedWeight: row.usedWeight ? String(row.usedWeight) : undefined,
          wastageWeight: row.wastageWeight ? String(row.wastageWeight) : undefined,
          netWeight: row.netWeight ? String(row.netWeight) : (row.weight ? String(row.weight) : undefined),
          grossWeight: row.grossWeight ? String(row.grossWeight) : undefined,
          width: row.width ? String(row.width) : undefined,
          temperature: row.temperature ? String(row.temperature) : undefined,
        }));
      const metRows = (Array.isArray(value.metallisationRows) ? value.metallisationRows : [])
        .filter(isRecord).map((row) => ({
          coilNo: String(row.coilNo ?? ''),
          rmId: String(row.rmId ?? ''),
          machineNo: String(row.machineNo ?? ''),
          weight: String(row.weight ?? ''),
          opticalDensity: String(row.opticalDensity ?? ''),
          resistance: String(row.resistance ?? ''),
          timestamp: String(row.timestamp ?? ''),
          nextStage: String(row.nextStage ?? ''),
          status: (row.status as WorkflowStatus) ?? 'Yet to Start' as WorkflowStatus,
        }));
      const slitRows = (Array.isArray(value.slittingRows) ? value.slittingRows : [])
        .filter(isRecord).map((row) => {
          const stage = row.stage === 'Ready for Dispatch' ? 'Ready for Winding' : String(row.stage ?? '');
          return {
            productNo: String(row.productNo ?? ''),
            rmId: String(row.rmId ?? ''),
            weight: String(row.weight ?? ''),
            thickness: String(row.thickness ?? ''),
            grade: String(row.grade ?? ''),
            remarks: row.remarks ? String(row.remarks) : undefined,
            timestampAdded: String(row.timestampAdded ?? ''),
            stage,
            status: (row.status as WorkflowStatus) ?? 'Yet to Start' as WorkflowStatus,
          };
        });
      const windRows = (Array.isArray(value.windingRows) ? value.windingRows : [])
        .filter(isRecord).map((row) => ({
          wdId: String(row.wdId ?? ''),
          linkedPmId: String(row.linkedPmId ?? ''),
          filmWidth: String(row.filmWidth ?? ''),
          windingTension: String(row.windingTension ?? ''),
          turnsCount: String(row.turnsCount ?? ''),
          quantityWound: String(row.quantityWound ?? ''),
          stage: String(row.stage ?? ''),
          timestamp: String(row.timestamp ?? ''),
          status: (row.status as WorkflowStatus) ?? 'Yet to Start' as WorkflowStatus,
        }));
      const sprRows = (Array.isArray(value.sprayRows) ? value.sprayRows : [])
        .filter(isRecord).map((row) => ({
          spId: String(row.spId ?? ''),
          linkedWdId: String(row.linkedWdId ?? ''),
          sprayType: String(row.sprayType ?? ''),
          feedRate: String(row.feedRate ?? ''),
          pressureSitting: String(row.pressureSitting ?? ''),
          stage: String(row.stage ?? ''),
          timestamp: String(row.timestamp ?? ''),
          status: (row.status as WorkflowStatus) ?? 'Yet to Start' as WorkflowStatus,
        }));
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
        rawMaterialRows: rawRows,
        metallisationRows: metRows,
        slittingRows: slitRows,
        windingRows: windRows,
        sprayRows: sprRows,
      };

      const progress = computeWorkflowProgress(normalizedFlow);
      normalizedFlow.overview.stage = progress.stage;
      normalizedFlow.overview.status = progress.status;
      flowDataMap[key.toUpperCase()] = normalizedFlow;
    }
  }

  const inventoryItems: InventoryItem[] = Array.isArray(raw.inventoryItems)
    ? raw.inventoryItems.filter((row): row is InventoryItem => isRecord(row)).map((row) => ({
        ...row,
        netWeight: (row as any).netWeight || (row as any).weight || '',
        grossWeight: (row as any).grossWeight || '',
        temperature: (row as any).temperature || '',
      })) as InventoryItem[]
    : createSeedInventory();

  const productOrders: ProductOrderSummary[] = Array.isArray(raw.productOrders)
    ? raw.productOrders
        .filter((row): row is Record<string, unknown> => isRecord(row))
        .map((row: Record<string, any>) => ({
          id: String(row.id || ''),
          micron: String(row.micron || '-'),
          width: String(row.width || '-'),
          product: String(row.product || row.type || row.code || '-'),
          grade: String(row.grade || '-'),
          specifications: String(row.specifications || '-'),
          quantity: String(row.quantity || row.batchSize || '0'),
          customer: String(row.customer || 'OEM'),
          instructions: String(row.instructions || '-'),
          status: String(row.status || 'Yet to Start'),
          stage: String(row.stage || 'Raw Material'),
          timestamp: String(row.timestamp || new Date().toISOString()),
        }))
        .filter((row) => row.id.length > 0)
    : [];

  const materialRequests: MaterialRequest[] = Array.isArray(raw.materialRequests)
    ? raw.materialRequests.filter((row): row is MaterialRequest => isRecord(row))
    : [];

  const materialReturns: MaterialReturn[] = Array.isArray(raw.materialReturns)
    ? raw.materialReturns.filter((row): row is MaterialReturn => isRecord(row))
    : [];

  const assignments: Record<string, AssignedStock[]> = {};
  if (isRecord(raw.assignments)) {
    for (const [key, value] of Object.entries(raw.assignments)) {
      if (Array.isArray(value)) {
        assignments[key] = value.filter((item): item is AssignedStock => isRecord(item));
      }
    }
  }

  const vendorPurchases: VendorPurchase[] = Array.isArray(raw.vendorPurchases)
    ? raw.vendorPurchases.filter((row): row is VendorPurchase => isRecord(row))
    : [];

  return { workOrders, flowDataMap, inventoryItems, productOrders, materialRequests, materialReturns, assignments, vendorPurchases };
}

export function loadStore(): StoreData {
  if (typeof window === 'undefined') return EMPTY_STORE;
  const stored = localStorage.getItem(STORAGE_KEY);

  if (!stored) {
    const seeded = createSeedStore();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }

  try {
    const parsed = JSON.parse(stored);
    const sanitized = sanitizeStore(parsed);
    if (sanitized.workOrders.length === 0 && sanitized.productOrders.length === 0) {
      const seeded = createSeedStore();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      if (typeof window !== 'undefined') {
        console.log('[capco] Seeded store with demo data');
      }
      return seeded;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
    return sanitized;
  } catch {
    const seeded = createSeedStore();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }
}

export function saveStore(data: StoreData) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    window.dispatchEvent(new Event('capco-store-change'));
  }
}

export function useStore() {
  const [store, setStore] = useState<StoreData>({ workOrders: [], flowDataMap: {}, inventoryItems: [], productOrders: [], materialRequests: [], materialReturns: [], assignments: {}, vendorPurchases: [] });
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

  const deleteWorkOrder = (woId: string) => {
    const normalizedId = woId.toUpperCase();
    const nextStore = loadStore();

    nextStore.workOrders = nextStore.workOrders.filter((row) => row.id !== normalizedId);
    delete nextStore.flowDataMap[normalizedId];

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
    if (tab === "Winding") flow.windingRows.push(rowData);
    if (tab === "Spray") flow.sprayRows.push(rowData);

    const progress = computeWorkflowProgress(flow);
    flow.overview.stage = progress.stage;
    flow.overview.status = progress.status;
    
    nextStore.flowDataMap[woId] = flow;
    saveStore(nextStore);
  };

  const updateFlowRowField = (woId: string, tab: string, rowIndex: number, field: string, value: any) => {
    const nextStore = loadStore();
    const flow = nextStore.flowDataMap[woId];
    if (!flow) return;

    let rows: any[] | null = null;
    if (tab === "Raw Material") rows = flow.rawMaterialRows;
    else if (tab === "Metallisation") rows = flow.metallisationRows;
    else if (tab === "Slitting") rows = flow.slittingRows;
    else if (tab === "Winding") rows = flow.windingRows;
    else if (tab === "Spray") rows = flow.sprayRows;
    if (!rows) return;

    if (rowIndex >= 0 && rowIndex < rows.length) {
      rows[rowIndex][field] = value;
    }

    const progress = computeWorkflowProgress(flow);
    flow.overview.stage = progress.stage;
    flow.overview.status = progress.status;
    nextStore.flowDataMap[woId] = flow;
    saveStore(nextStore);
  };

  const updateInventoryStatus = (rawMaterialId: string, newStatus: InventoryItem["status"]) => {
    const nextStore = loadStore();
    const idx = nextStore.inventoryItems.findIndex((item) => item.rawMaterialId === rawMaterialId);
    if (idx === -1) return false;
    nextStore.inventoryItems[idx].status = newStatus;
    saveStore(nextStore);
    return true;
  };

  const addInventoryItem = (item: InventoryItem) => {
    const nextStore = loadStore();
    if (nextStore.inventoryItems.some((i) => i.rawMaterialId === item.rawMaterialId)) return false;
    nextStore.inventoryItems.push(item);
    saveStore(nextStore);
    return true;
  };

  const deleteInventoryItem = (rawMaterialId: string) => {
    const nextStore = loadStore();
    nextStore.inventoryItems = nextStore.inventoryItems.filter((i) => i.rawMaterialId !== rawMaterialId);
    saveStore(nextStore);
    return true;
  };

  const getAvailableInventory = () => {
    return store.inventoryItems.filter((item) => item.status === "In Inventory");
  };

  const addProductOrder = (po: ProductOrderSummary) => {
    const nextStore = loadStore();
    if (nextStore.productOrders.some((row) => row.id === po.id)) return;
    nextStore.productOrders = [po, ...nextStore.productOrders];
    saveStore(nextStore);
  };

  const deleteProductOrder = (poId: string) => {
    const nextStore = loadStore();
    nextStore.productOrders = nextStore.productOrders.filter((row) => row.id !== poId);
    delete nextStore.assignments[poId]; // clean up orphaned stock assignments
    saveStore(nextStore);
  };

  const updateProductOrder = (poId: string, updates: Partial<ProductOrderSummary>) => {
    const nextStore = loadStore();
    const idx = nextStore.productOrders.findIndex((row) => row.id === poId);
    if (idx === -1) return false;

    nextStore.productOrders[idx] = {
      ...nextStore.productOrders[idx],
      ...updates,
    };

    saveStore(nextStore);
    return true;
  };

  const addMaterialRequest = (req: MaterialRequest) => {
    const nextStore = loadStore();
    nextStore.materialRequests = [req, ...nextStore.materialRequests];
    saveStore(nextStore);
  };

  const issueMaterialRequest = (reqId: string, items: MaterialRequestItem[]) => {
    const nextStore = loadStore();
    const idx = nextStore.materialRequests.findIndex((r) => r.id === reqId);
    if (idx === -1) return;
    nextStore.materialRequests[idx].items = items;
    nextStore.materialRequests[idx].status = items.every((i) => Number(i.issuedQty) >= Number(i.requestedQty)) ? "Issued" : "Partially Issued";
    nextStore.materialRequests[idx].issuedAt = new Date().toLocaleDateString();
    saveStore(nextStore);
  };

  const cancelMaterialRequest = (reqId: string) => {
    const nextStore = loadStore();
    const idx = nextStore.materialRequests.findIndex((r) => r.id === reqId);
    if (idx === -1) return;
    nextStore.materialRequests[idx].status = "Cancelled";
    saveStore(nextStore);
  };

  const addMaterialReturn = (ret: MaterialReturn) => {
    const nextStore = loadStore();
    nextStore.materialReturns = [ret, ...nextStore.materialReturns];
    saveStore(nextStore);
  };

  const acceptMaterialReturn = (retId: string) => {
    const nextStore = loadStore();
    const idx = nextStore.materialReturns.findIndex((r) => r.id === retId);
    if (idx === -1) return;
    nextStore.materialReturns[idx].status = "Accepted";
    saveStore(nextStore);
  };

  const rejectMaterialReturn = (retId: string) => {
    const nextStore = loadStore();
    const idx = nextStore.materialReturns.findIndex((r) => r.id === retId);
    if (idx === -1) return;
    nextStore.materialReturns[idx].status = "Rejected";
    saveStore(nextStore);
  };

  const assignStockToProductOrder = (productOrderId: string, stock: AssignedStock) => {
    const nextStore = loadStore();
    if (!nextStore.assignments[productOrderId]) nextStore.assignments[productOrderId] = [];
    if (nextStore.assignments[productOrderId].some((s) => s.stockId === stock.stockId)) return;
    nextStore.assignments[productOrderId].push(stock);
    saveStore(nextStore);
  };

  const removeAssignedStock = (productOrderId: string, stockId: string) => {
    const nextStore = loadStore();
    if (!nextStore.assignments[productOrderId]) return;
    nextStore.assignments[productOrderId] = nextStore.assignments[productOrderId].filter((s) => s.stockId !== stockId);
    saveStore(nextStore);
  };

  const getAssignedStocks = (productOrderId: string): AssignedStock[] => {
    const nextStore = loadStore();
    return nextStore.assignments[productOrderId] ?? [];
  };

  const addVendorPurchase = (purchase: VendorPurchase) => {
    const nextStore = loadStore();
    if (nextStore.vendorPurchases.some((p) => p.id === purchase.id)) return;
    nextStore.vendorPurchases = [purchase, ...nextStore.vendorPurchases];
    saveStore(nextStore);
  };

  const updateVendorPurchase = (id: string, amountPaid: number, paymentType: string, notes?: string) => {
    const nextStore = loadStore();
    const idx = nextStore.vendorPurchases.findIndex((p) => p.id === id);
    if (idx === -1) return;

    const purchase = nextStore.vendorPurchases[idx];
    const newHistoryEntry = {
      id: `PH-${Date.now()}`,
      date: new Date().toLocaleDateString(),
      amountPaid: amountPaid.toString(),
      paymentType,
      notes,
    };

    const newTotalPaid = (parseFloat(purchase.amountPaid || "0") + amountPaid).toString();
    const grandTotal = parseFloat(purchase.grandTotal || "0");
    const newStatus = parseFloat(newTotalPaid) >= grandTotal ? "Paid" : "Partial Payment";

    nextStore.vendorPurchases[idx] = {
      ...purchase,
      amountPaid: newTotalPaid,
      status: newStatus,
      paymentHistory: [newHistoryEntry, ...(purchase.paymentHistory || [])],
    };

    saveStore(nextStore);
  };

  return { store, mounted, workOrders, addWorkOrder, deleteWorkOrder, addFlowRow, updateFlowRowField, updateInventoryStatus, addInventoryItem, deleteInventoryItem, getAvailableInventory, addProductOrder, updateProductOrder, deleteProductOrder, addMaterialRequest, issueMaterialRequest, cancelMaterialRequest, addMaterialReturn, acceptMaterialReturn, rejectMaterialReturn, assignStockToProductOrder, removeAssignedStock, getAssignedStocks, addVendorPurchase, updateVendorPurchase, vendorPurchases: store.vendorPurchases };
}
