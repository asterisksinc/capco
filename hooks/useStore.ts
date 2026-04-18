import { useState, useEffect } from 'react';
import { initialWorkOrders, flowByWorkOrderId, type WorkOrderSummary, type WorkOrderFlowData } from '@/lib/data';

interface StoreData {
  workOrders: WorkOrderSummary[];
  flowDataMap: Record<string, WorkOrderFlowData>;
}

export function loadStore(): StoreData {
  if (typeof window === 'undefined') return { workOrders: initialWorkOrders, flowDataMap: flowByWorkOrderId };
  const stored = localStorage.getItem('capcoDataStore');
  if (stored) {
    return JSON.parse(stored);
  }
  const defaultStore = { workOrders: initialWorkOrders, flowDataMap: flowByWorkOrderId };
  localStorage.setItem('capcoDataStore', JSON.stringify(defaultStore));
  return defaultStore;
}

export function saveStore(data: StoreData) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('capcoDataStore', JSON.stringify(data));
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

  const addWorkOrder = (wo: WorkOrderSummary) => {
    const nextStore = loadStore();
    nextStore.workOrders = [wo, ...nextStore.workOrders];
    // Create empty flow data
    nextStore.flowDataMap[wo.id] = {
      overview: {
        wordCount: "0 words",
        micron: wo.micron,
        width: wo.width,
        quantity: wo.qty,
        stage: wo.stage,
        date: wo.date,
        status: wo.status
      },
      rawMaterialRows: [],
      metallisationRows: [],
      slittingRows: []
    };
    saveStore(nextStore);
  };

  const addFlowRow = (woId: string, tab: string, rowData: any) => {
    const nextStore = loadStore();
    let flow = nextStore.flowDataMap[woId];
    if (!flow) {
      // Fallback empty flow
      flow = {
        overview: {
          wordCount: "0 words",
          micron: "0",
          width: "0",
          quantity: "0",
          stage: "Unknown",
          date: new Date().toLocaleDateString(),
          status: "Yet to Start"
        },
        rawMaterialRows: [],
        metallisationRows: [],
        slittingRows: []
      };
    }
    
    if (tab === "Raw Material") flow.rawMaterialRows.push(rowData);
    if (tab === "Metallisation") flow.metallisationRows.push(rowData);
    if (tab === "Slitting") flow.slittingRows.push(rowData);
    
    nextStore.flowDataMap[woId] = flow;
    saveStore(nextStore);
  };

  return { store, mounted, addWorkOrder, addFlowRow };
}
