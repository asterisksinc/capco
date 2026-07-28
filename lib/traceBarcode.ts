export type EntityType = "WO" | "PO" | "RM" | "MC" | "PM" | "WD" | "SP" | "Unknown";

export interface TraceEntity {
  id: string;
  type: EntityType;
  label: string;
  details: { label: string; value: string }[];
  status: string;
}

export interface TraceResult {
  scanned: TraceEntity;
  parentChain: TraceEntity[];
  children: TraceEntity[];
  workOrder?: TraceEntity;
  productOrder?: TraceEntity;
  rawMaterial?: TraceEntity & {
    rollId?: string;
    supplier?: string;
  };
}

interface RawMaterialRow {
  rollNo: string;
  weight: string;
  thickness: string;
  supplier: string;
  stage: string;
  status: string;
  netWeight?: string;
  grossWeight?: string;
  width?: string;
  temperature?: string;
}

interface MetallisationRow {
  coilNo: string;
  rmId: string;
  machineNo: string;
  weight: string;
  opticalDensity: string;
  resistance: string;
  timestamp: string;
  nextStage: string;
  status: string;
}

interface SlittingRow {
  productNo: string;
  rmId: string;
  weight: string;
  thickness: string;
  grade: string;
  remarks?: string;
  timestampAdded: string;
  stage: string;
  status: string;
}

interface WindingRow {
  wdId: string;
  linkedPmId: string;
  filmWidth: string;
  windingTension: string;
  turnsCount: string;
  quantityWound: string;
  stage: string;
  timestamp: string;
  status: string;
}

interface SprayRow {
  spId: string;
  linkedWdId: string;
  sprayType: string;
  feedRate: string;
  pressureSitting: string;
  stage: string;
  timestamp: string;
  status: string;
}

interface WorkOrderFlowData {
  overview: { wordCount: string; micron: string; width: string; quantity: string; date: string; stage: string; status: string };
  rawMaterialRows: RawMaterialRow[];
  metallisationRows: MetallisationRow[];
  slittingRows: SlittingRow[];
  windingRows: WindingRow[];
  sprayRows: SprayRow[];
}

interface WorkOrderSummary {
  id: string;
  micron: string;
  width: string;
  qty: string;
  date: string;
}

interface ProductOrderSummary {
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
}

interface InventoryItem {
  rawMaterialId: string;
  rollId: string;
  micron: string;
  width: string;
  weight: string;
  supplier: string;
  date: string;
  status: string;
}

interface AssignedStock {
  stockId: string;
  linkedWoId: string;
  weight: string;
  width: string;
  micron: string;
  grade: string;
  stage: string;
  assignedAt: string;
}

export interface StoreSnapshot {
  workOrders: WorkOrderSummary[];
  flowDataMap: Record<string, WorkOrderFlowData>;
  inventoryItems: InventoryItem[];
  productOrders: ProductOrderSummary[];
  assignments: Record<string, AssignedStock[]>;
}

function findRM(store: StoreSnapshot, rmId: string) {
  const inv = store.inventoryItems.find((i) => i.rawMaterialId === rmId);
  for (const [woId, flow] of Object.entries(store.flowDataMap)) {
    const row = flow.rawMaterialRows.find((r) => r.rollNo === rmId);
    if (row) return { inv, flow: { woId, row } };
  }
  return inv ? { inv, flow: null as { woId: string; row: RawMaterialRow } | null } : null;
}

function findMC(store: StoreSnapshot, mcId: string) {
  for (const [woId, flow] of Object.entries(store.flowDataMap)) {
    const row = flow.metallisationRows.find((r) => r.coilNo === mcId);
    if (row) return { ...row, woId };
  }
  return null;
}

function findPM(store: StoreSnapshot, pmId: string) {
  for (const [woId, flow] of Object.entries(store.flowDataMap)) {
    const row = flow.slittingRows.find((r) => r.productNo === pmId);
    if (row) return { ...row, woId };
  }
  return null;
}

function findWD(store: StoreSnapshot, wdId: string) {
  for (const [woId, flow] of Object.entries(store.flowDataMap)) {
    const row = flow.windingRows.find((r) => r.wdId === wdId);
    if (row) return { ...row, woId };
  }
  return null;
}

function findSP(store: StoreSnapshot, spId: string) {
  for (const [woId, flow] of Object.entries(store.flowDataMap)) {
    const row = flow.sprayRows.find((r) => r.spId === spId);
    if (row) return { ...row, woId };
  }
  return null;
}

function findPOByPM(store: StoreSnapshot, pmId: string) {
  for (const [poId, stocks] of Object.entries(store.assignments)) {
    if (stocks.some((s) => s.stockId === pmId)) {
      return store.productOrders.find((p) => p.id === poId) ?? null;
    }
  }
  return null;
}

function e(id: string, type: EntityType, label: string, details: { label: string; value: string }[], status: string): TraceEntity {
  return { id, type, label, details, status };
}

export function traceBarcode(store: StoreSnapshot, rawId: string): TraceResult | null {
  const id = rawId.toUpperCase().trim();

  // Try WO
  const wo = store.workOrders.find((w) => w.id === id);
  if (wo) {
    const flow = store.flowDataMap[id];
    const children: TraceEntity[] = [];
    if (flow) {
      for (const rm of flow.rawMaterialRows) {
        children.push(e(rm.rollNo, "RM", `Raw Material ${rm.rollNo}`, [
          { label: "Supplier", value: rm.supplier },
          { label: "Weight", value: rm.weight },
          { label: "Thickness", value: rm.thickness },
        ], rm.status));
      }
    }
    return {
      scanned: e(id, "WO", `Work Order ${id}`, [
        { label: "Micron", value: wo.micron },
        { label: "Width", value: wo.width },
        { label: "Qty", value: wo.qty },
        { label: "Date", value: wo.date },
      ], flow?.overview.status ?? "Yet to Start"),
      parentChain: [],
      children,
    };
  }

  // Try PO
  const po = store.productOrders.find((p) => p.id === id);
  if (po) {
    const stocks = store.assignments[id] ?? [];
    const children = stocks.map((s) =>
      e(s.stockId, "PM", `Product ${s.stockId}`, [
        { label: "Weight", value: s.weight },
        { label: "Grade", value: s.grade },
        { label: "WO", value: s.linkedWoId },
      ], s.stage)
    );
    return {
      scanned: e(id, "PO", `Product Order ${id}`, [
        { label: "Code", value: po.micron },
        { label: "Type", value: po.width },
        { label: "Grade", value: po.grade },
        { label: "Batch", value: po.quantity },
      ], po.status),
      parentChain: [],
      children,
    };
  }

  // Try RM
  const rm = findRM(store, id);
  if (rm) {
    const details: { label: string; value: string }[] = [];
    if (rm.inv) {
      details.push({ label: "Supplier", value: rm.inv.supplier });
      details.push({ label: "Weight", value: rm.inv.weight });
      details.push({ label: "Micron", value: rm.inv.micron });
      details.push({ label: "Width", value: rm.inv.width });
    } else if (rm.flow) {
      details.push({ label: "Supplier", value: rm.flow.row.supplier });
      details.push({ label: "Weight", value: rm.flow.row.weight });
      details.push({ label: "Thickness", value: rm.flow.row.thickness });
    }

    const woEntity = rm.flow
      ? e(rm.flow.woId, "WO", `Work Order ${rm.flow.woId}`, [], store.workOrders.find((w) => w.id === rm.flow!.woId) ? store.flowDataMap[rm.flow.woId]?.overview.status ?? "Yet to Start" : "")
      : undefined;

    const children: TraceEntity[] = [];
    if (rm.flow) {
      const flow = store.flowDataMap[rm.flow.woId];
      if (flow) {
        for (const mc of flow.metallisationRows.filter((m) => m.rmId === id)) {
          children.push(e(mc.coilNo, "MC", `Metallisation ${mc.coilNo}`, [
            { label: "Weight", value: mc.weight },
            { label: "Machine", value: mc.machineNo },
          ], mc.status));
        }
        for (const pm of flow.slittingRows.filter((s) => s.rmId === id)) {
          if (!children.some((c) => c.id === pm.productNo)) {
            children.push(e(pm.productNo, "PM", `Product ${pm.productNo}`, [
              { label: "Weight", value: pm.weight },
              { label: "Grade", value: pm.grade },
            ], pm.status));
          }
        }
      }
    }

    return {
      scanned: e(id, "RM", `Raw Material ${id}`, details, rm.inv?.status ?? rm.flow?.row.status ?? "Unknown"),
      parentChain: woEntity ? [woEntity] : [],
      children,
      workOrder: woEntity,
      rawMaterial: {
        ...e(id, "RM", `Raw Material ${id}`, details, rm.inv?.status ?? rm.flow?.row.status ?? "Unknown"),
        rollId: rm.inv?.rollId,
        supplier: rm.inv?.supplier ?? rm.flow?.row.supplier,
      },
    };
  }

  // Try MC
  const mc = findMC(store, id);
  if (mc) {
    const rawMaterial = findRM(store, mc.rmId);
    const woEntity = e(mc.woId, "WO", `Work Order ${mc.woId}`, [], store.flowDataMap[mc.woId]?.overview.status ?? "");
    const rmEntity = rawMaterial
      ? e(mc.rmId, "RM", `Raw Material ${mc.rmId}`, [
        { label: "Supplier", value: rawMaterial.inv?.supplier ?? rawMaterial.flow?.row.supplier ?? "" },
        { label: "Weight", value: rawMaterial.inv?.weight ?? rawMaterial.flow?.row.weight ?? "" },
      ], rawMaterial.inv?.status ?? rawMaterial.flow?.row.status ?? "Unknown")
      : null;

    const flow = store.flowDataMap[mc.woId];
    const children: TraceEntity[] = [];
    if (flow) {
      for (const pm of flow.slittingRows.filter((s) => s.rmId === mc.rmId)) {
        children.push(e(pm.productNo, "PM", `Product ${pm.productNo}`, [
          { label: "Weight", value: pm.weight },
          { label: "Grade", value: pm.grade },
        ], pm.status));
      }
    }

    return {
      scanned: e(id, "MC", `Metallisation ${id}`, [
        { label: "Weight", value: mc.weight },
        { label: "Machine", value: mc.machineNo },
        { label: "Optical Density", value: mc.opticalDensity },
        { label: "Resistance", value: mc.resistance },
        { label: "Timestamp", value: mc.timestamp },
      ], mc.status),
      parentChain: [rmEntity, woEntity].filter(Boolean) as TraceEntity[],
      children,
      workOrder: woEntity,
      rawMaterial: rawMaterial
        ? {
          ...e(mc.rmId, "RM", `Raw Material ${mc.rmId}`, [], rawMaterial.inv?.status ?? rawMaterial.flow?.row.status ?? "Unknown"),
          rollId: rawMaterial.inv?.rollId,
          supplier: rawMaterial.inv?.supplier ?? rawMaterial.flow?.row.supplier,
        }
        : undefined,
    };
  }

  // Try PM
  const pm = findPM(store, id);
  if (pm) {
    const rawMaterial = findRM(store, pm.rmId);
    const woEntity = e(pm.woId, "WO", `Work Order ${pm.woId}`, [], store.flowDataMap[pm.woId]?.overview.status ?? "");
    const rmEntity = rawMaterial
      ? e(pm.rmId, "RM", `Raw Material ${pm.rmId}`, [
        { label: "Supplier", value: rawMaterial.inv?.supplier ?? rawMaterial.flow?.row.supplier ?? "" },
      ], rawMaterial.inv?.status ?? rawMaterial.flow?.row.status ?? "Unknown")
      : null;

    const poEntity = findPOByPM(store, id);
    const poResult = poEntity
      ? e(poEntity.id, "PO", `Product Order ${poEntity.id}`, [
        { label: "Code", value: poEntity.micron },
        { label: "Type", value: poEntity.width },
      ], poEntity.status)
      : undefined;

    const flow = store.flowDataMap[pm.woId];
    const children: TraceEntity[] = [];
    if (flow) {
      for (const wd of flow.windingRows.filter((w) => w.linkedPmId === id)) {
        children.push(e(wd.wdId, "WD", `Winding ${wd.wdId}`, [
          { label: "Film Width", value: wd.filmWidth },
          { label: "Qty Wound", value: wd.quantityWound },
        ], wd.status));
      }
    }

    return {
      scanned: e(id, "PM", `Product ${id}`, [
        { label: "Weight", value: pm.weight },
        { label: "Thickness", value: pm.thickness },
        { label: "Grade", value: pm.grade },
        { label: "Remarks", value: pm.remarks ?? "—" },
      ], pm.status),
      parentChain: [rmEntity, woEntity].filter(Boolean) as TraceEntity[],
      children,
      workOrder: woEntity,
      productOrder: poResult,
      rawMaterial: rawMaterial
        ? {
          ...e(pm.rmId, "RM", `Raw Material ${pm.rmId}`, [], rawMaterial.inv?.status ?? rawMaterial.flow?.row.status ?? "Unknown"),
          rollId: rawMaterial.inv?.rollId,
          supplier: rawMaterial.inv?.supplier ?? rawMaterial.flow?.row.supplier,
        }
        : undefined,
    };
  }

  // Try WD
  const wd = findWD(store, id);
  if (wd) {
    let pmEntity: TraceEntity | null = null;
    let rmEntity: TraceEntity | null = null;
    let woEntity: TraceEntity | null = null;
    let poResult: TraceEntity | undefined;

    const flow = store.flowDataMap[wd.woId];
    if (flow) {
      const pmRow = flow.slittingRows.find((s) => s.productNo === wd.linkedPmId);
      if (pmRow) {
        pmEntity = e(pmRow.productNo, "PM", `Product ${pmRow.productNo}`, [
          { label: "Weight", value: pmRow.weight },
          { label: "Grade", value: pmRow.grade },
        ], pmRow.status);

        const po = findPOByPM(store, pmRow.productNo);
        if (po) poResult = e(po.id, "PO", `Product Order ${po.id}`, [{ label: "Code", value: po.micron }], po.status);

        const rawMaterial = findRM(store, pmRow.rmId);
        if (rawMaterial) {
          rmEntity = e(pmRow.rmId, "RM", `Raw Material ${pmRow.rmId}`, [
            { label: "Supplier", value: rawMaterial.inv?.supplier ?? rawMaterial.flow?.row.supplier ?? "" },
          ], rawMaterial.inv?.status ?? rawMaterial.flow?.row.status ?? "Unknown");
        }

        woEntity = e(wd.woId, "WO", `Work Order ${wd.woId}`, [], store.flowDataMap[wd.woId]?.overview.status ?? "");
      }
    }

    const children: TraceEntity[] = [];
    if (flow) {
      for (const sp of flow.sprayRows.filter((s) => s.linkedWdId === id)) {
        children.push(e(sp.spId, "SP", `Spray ${sp.spId}`, [
          { label: "Type", value: sp.sprayType },
          { label: "Feed Rate", value: sp.feedRate },
          { label: "Pressure", value: sp.pressureSitting },
        ], sp.status));
      }
    }

    return {
      scanned: e(id, "WD", `Winding ${id}`, [
        { label: "Film Width", value: wd.filmWidth },
        { label: "Tension", value: wd.windingTension },
        { label: "Turns", value: wd.turnsCount },
        { label: "Qty Wound", value: wd.quantityWound },
        { label: "Timestamp", value: wd.timestamp },
      ], wd.status),
      parentChain: [pmEntity, rmEntity, woEntity].filter(Boolean) as TraceEntity[],
      children,
      workOrder: woEntity ?? undefined,
      productOrder: poResult,
    };
  }

  // Try SP
  const sp = findSP(store, id);
  if (sp) {
    let wdEntity: TraceEntity | null = null;
    let pmEntity: TraceEntity | null = null;
    let rmEntity: TraceEntity | null = null;
    let woEntity: TraceEntity | null = null;
    let poResult: TraceEntity | undefined;

    const flow = store.flowDataMap[sp.woId];
    if (flow) {
      const wdRow = flow.windingRows.find((w) => w.wdId === sp.linkedWdId);
      if (wdRow) {
        wdEntity = e(wdRow.wdId, "WD", `Winding ${wdRow.wdId}`, [{ label: "Qty Wound", value: wdRow.quantityWound }], wdRow.status);

        const pmRow = flow.slittingRows.find((s) => s.productNo === wdRow.linkedPmId);
        if (pmRow) {
          pmEntity = e(pmRow.productNo, "PM", `Product ${pmRow.productNo}`, [
            { label: "Weight", value: pmRow.weight },
            { label: "Grade", value: pmRow.grade },
          ], pmRow.status);

          const po = findPOByPM(store, pmRow.productNo);
          if (po) poResult = e(po.id, "PO", `Product Order ${po.id}`, [{ label: "Code", value: po.micron }], po.status);

          const rawMaterial = findRM(store, pmRow.rmId);
          if (rawMaterial) {
            rmEntity = e(pmRow.rmId, "RM", `Raw Material ${pmRow.rmId}`, [
              { label: "Supplier", value: rawMaterial.inv?.supplier ?? rawMaterial.flow?.row.supplier ?? "" },
            ], rawMaterial.inv?.status ?? rawMaterial.flow?.row.status ?? "Unknown");
          }

          woEntity = e(sp.woId, "WO", `Work Order ${sp.woId}`, [], store.flowDataMap[sp.woId]?.overview.status ?? "");
        }
      }
    }

    return {
      scanned: e(id, "SP", `Spray ${id}`, [
        { label: "Type", value: sp.sprayType },
        { label: "Feed Rate", value: sp.feedRate },
        { label: "Pressure", value: sp.pressureSitting },
        { label: "Timestamp", value: sp.timestamp },
      ], sp.status),
      parentChain: [wdEntity, pmEntity, rmEntity, woEntity].filter(Boolean) as TraceEntity[],
      children: [],
      workOrder: woEntity ?? undefined,
      productOrder: poResult,
    };
  }

  return null;
}

export function detectEntityType(rawId: string): EntityType {
  const id = rawId.toUpperCase().trim();
  if (id.startsWith("WO-")) return "WO";
  if (id.startsWith("PO-") || id.startsWith("#PO-")) return "PO";
  if (id.startsWith("RM-")) return "RM";
  if (id.startsWith("MC-")) return "MC";
  if (id.startsWith("PM-") || id.startsWith("STOCK-")) return "PM";
  if (id.startsWith("WD-")) return "WD";
  if (id.startsWith("SP-")) return "SP";
  return "Unknown";
}

export interface LineageNode {
  type: EntityType;
  id: string;
  label: string;
  details: { label: string; value: string }[];
  status: string;
  rawRecord?: any;
}

export function getLineageChain(store: StoreSnapshot, rawId: string): LineageNode[] {
  let cleanId = rawId.toUpperCase().trim();
  if (cleanId.startsWith("STOCK-")) {
    cleanId = "PM-" + cleanId.substring(6);
  }
  const startType = detectEntityType(cleanId);
  if (startType === "Unknown") return [];

  const resolved = {
    RM: new Set<string>(),
    WO: new Set<string>(),
    MC: new Set<string>(),
    PM: new Set<string>(),
    PO: new Set<string>(),
    WD: new Set<string>(),
    SP: new Set<string>(),
  };

  // Upstream backtracking helper
  function traceUpstream(type: EntityType, id: string) {
    if (type === "Unknown") return;
    const upperId = id.toUpperCase().trim();
    if (resolved[type].has(upperId)) return;
    resolved[type].add(upperId);

    if (type === "SP") {
      for (const [woId, flow] of Object.entries(store.flowDataMap)) {
        const spRow = flow.sprayRows.find(r => r.spId.toUpperCase() === upperId);
        if (spRow) {
          traceUpstream("WO", woId);
          traceUpstream("WD", spRow.linkedWdId);
          break;
        }
      }
    } else if (type === "WD") {
      for (const [woId, flow] of Object.entries(store.flowDataMap)) {
        const wdRow = flow.windingRows.find(r => r.wdId.toUpperCase() === upperId);
        if (wdRow) {
          traceUpstream("WO", woId);
          traceUpstream("PM", wdRow.linkedPmId);
          break;
        }
      }
    } else if (type === "PM") {
      let found = false;
      for (const [woId, flow] of Object.entries(store.flowDataMap)) {
        const pmRow = flow.slittingRows.find(r => r.productNo.toUpperCase() === upperId);
        if (pmRow) {
          found = true;
          traceUpstream("WO", woId);
          const parentId = pmRow.rmId.toUpperCase().trim();
          const parentType = detectEntityType(parentId);
          if (parentType === "MC") {
            traceUpstream("MC", parentId);
          } else if (parentType === "RM") {
            traceUpstream("RM", parentId);
            // In case there is an MC that produced this RM, add it as well
            const mcRow = flow.metallisationRows.find(m => m.rmId.toUpperCase() === parentId);
            if (mcRow) {
              traceUpstream("MC", mcRow.coilNo);
            }
          }
          break;
        }
      }
      if (!found) {
        for (const [poId, assigns] of Object.entries(store.assignments)) {
          const assign = assigns.find(a => a.stockId.toUpperCase() === upperId);
          if (assign) {
            traceUpstream("WO", assign.linkedWoId);
            break;
          }
        }
      }
      for (const [poId, assigns] of Object.entries(store.assignments)) {
        if (assigns.some(a => a.stockId.toUpperCase() === upperId)) {
          traceUpstream("PO", poId);
          break;
        }
      }
    } else if (type === "MC") {
      for (const [woId, flow] of Object.entries(store.flowDataMap)) {
        const mcRow = flow.metallisationRows.find(r => r.coilNo.toUpperCase() === upperId);
        if (mcRow) {
          traceUpstream("WO", woId);
          traceUpstream("RM", mcRow.rmId);
          break;
        }
      }
    } else if (type === "RM") {
      for (const [woId, flow] of Object.entries(store.flowDataMap)) {
        if (flow.rawMaterialRows.some(r => r.rollNo.toUpperCase() === upperId)) {
          traceUpstream("WO", woId);
          break;
        }
      }
    }
  }

  // Downstream tracking helper
  function traceDownstream(type: EntityType, id: string) {
    if (type === "Unknown") return;
    const upperId = id.toUpperCase().trim();
    if (resolved[type].has(upperId)) return;
    resolved[type].add(upperId);

    if (type === "RM") {
      for (const [woId, flow] of Object.entries(store.flowDataMap)) {
        const usedInWO = flow.rawMaterialRows.some(r => r.rollNo.toUpperCase() === upperId);
        if (usedInWO) {
          resolved.WO.add(woId.toUpperCase().trim());
        }
        flow.metallisationRows.forEach(m => {
          if (m.rmId.toUpperCase() === upperId) {
            traceDownstream("MC", m.coilNo);
          }
        });
        flow.slittingRows.forEach(s => {
          if (s.rmId.toUpperCase() === upperId) {
            traceDownstream("PM", s.productNo);
          }
        });
      }
    } else if (type === "MC") {
      for (const [woId, flow] of Object.entries(store.flowDataMap)) {
        flow.slittingRows.forEach(s => {
          if (s.rmId.toUpperCase() === upperId) {
            traceDownstream("PM", s.productNo);
          }
        });
      }
    } else if (type === "PM") {
      for (const [woId, flow] of Object.entries(store.flowDataMap)) {
        flow.windingRows.forEach(w => {
          if (w.linkedPmId.toUpperCase() === upperId) {
            traceDownstream("WD", w.wdId);
          }
        });
      }
      for (const [poId, assigns] of Object.entries(store.assignments)) {
        if (assigns.some(a => a.stockId.toUpperCase() === upperId)) {
          resolved.PO.add(poId.toUpperCase().trim());
        }
      }
    } else if (type === "WD") {
      for (const [woId, flow] of Object.entries(store.flowDataMap)) {
        flow.sprayRows.forEach(s => {
          if (s.linkedWdId.toUpperCase() === upperId) {
            traceDownstream("SP", s.spId);
          }
        });
      }
    } else if (type === "WO") {
      const flow = store.flowDataMap[upperId];
      if (flow) {
        flow.rawMaterialRows.forEach(r => traceDownstream("RM", r.rollNo));
      }
    } else if (type === "PO") {
      const assigns = store.assignments[upperId] ?? [];
      assigns.forEach(a => {
        traceDownstream("PM", a.stockId);
      });
    }
  }

  // Execute trace
  if (startType === "SP" || startType === "WD" || startType === "PM" || startType === "MC") {
    // For intermediate processing stages, trace strictly upstream (backtrack)
    traceUpstream(startType, cleanId);
  } else {
    // For order entries and raw materials, trace downstream
    traceDownstream(startType, cleanId);
  }

  const chain: LineageNode[] = [];

  const addNode = (node: LineageNode) => {
    if (!chain.some(n => n.id.toUpperCase() === node.id.toUpperCase())) {
      chain.push(node);
    }
  };

  // Resolve RM details
  for (const id of Array.from(resolved.RM)) {
    const inv = store.inventoryItems.find(i => i.rawMaterialId.toUpperCase() === id);
    let supplier = inv?.supplier || "";
    let weight = inv?.weight || "";
    let micron = inv?.micron || "";
    let width = inv?.width || "";
    let date = inv?.date || "";
    let status = inv?.status || "Unknown";

    if (!inv) {
      for (const flow of Object.values(store.flowDataMap)) {
        const row = flow.rawMaterialRows.find(r => r.rollNo.toUpperCase() === id);
        if (row) {
          supplier = row.supplier;
          weight = row.weight;
          micron = flow.overview.micron;
          width = flow.overview.width;
          status = row.status;
          break;
        }
      }
    }

    const details = [
      { label: "Supplier", value: supplier || "—" },
      { label: "Weight", value: weight || "—" },
      { label: "Micron", value: micron || "—" },
      { label: "Width", value: width || "—" },
    ];
    if (date) details.push({ label: "Date Received", value: date });

    const linkedWOs = Array.from(resolved.WO);
    const linkedPOs = Array.from(resolved.PO);
    if (linkedWOs.length > 0) details.push({ label: "Linked WO ID", value: linkedWOs.join(", ") });
    if (linkedPOs.length > 0) details.push({ label: "Linked PO ID", value: linkedPOs.join(", ") });

    addNode({
      type: "RM",
      id,
      label: `Raw Material: ${id}`,
      status,
      details,
    });
  }

  // Resolve WO details
  for (const id of Array.from(resolved.WO)) {
    const wo = store.workOrders.find(w => w.id.toUpperCase() === id);
    const flow = store.flowDataMap[id];
    const micron = wo?.micron || flow?.overview.micron || "—";
    const width = wo?.width || flow?.overview.width || "—";
    const qty = wo?.qty || flow?.overview.quantity || "—";
    const date = wo?.date || flow?.overview.date || "—";
    const status = flow?.overview.status || "Yet to Start";

    const details = [
      { label: "Micron", value: micron },
      { label: "Width", value: width },
      { label: "Qty Required", value: qty },
      { label: "Date Created", value: date },
    ];

    addNode({
      type: "WO",
      id,
      label: `Work Order: ${id}`,
      status,
      details,
    });
  }

  // Resolve MC details
  for (const id of Array.from(resolved.MC)) {
    let mcRow: any = null;
    let foundWoId = "";
    for (const [woId, flow] of Object.entries(store.flowDataMap)) {
      const row = flow.metallisationRows.find(r => r.coilNo.toUpperCase() === id);
      if (row) {
        mcRow = row;
        foundWoId = woId;
        break;
      }
    }
    const details = [];
    let status = "Yet to Start";
    if (mcRow) {
      details.push({ label: "Machine No", value: mcRow.machineNo });
      details.push({ label: "Weight", value: mcRow.weight });
      details.push({ label: "Optical Density", value: mcRow.opticalDensity });
      details.push({ label: "Resistance", value: mcRow.resistance });
      details.push({ label: "Timestamp", value: mcRow.timestamp });
      details.push({ label: "Linked RM ID", value: mcRow.rmId });
      status = mcRow.status;
    }
    if (foundWoId) details.push({ label: "Linked WO ID", value: foundWoId });
    const linkedPOs = Array.from(resolved.PO);
    if (linkedPOs.length > 0) details.push({ label: "Linked PO ID", value: linkedPOs.join(", ") });

    addNode({
      type: "MC",
      id,
      label: `Metallisation Coil: ${id}`,
      status,
      details,
    });
  }

  // Resolve PM details
  for (const id of Array.from(resolved.PM)) {
    let pmRow: any = null;
    let foundWoId = "";
    for (const [woId, flow] of Object.entries(store.flowDataMap)) {
      const row = flow.slittingRows.find(r => r.productNo.toUpperCase() === id);
      if (row) {
        pmRow = row;
        foundWoId = woId;
        break;
      }
    }
    const details = [];
    let status = "Yet to Start";
    if (pmRow) {
      details.push({ label: "Weight", value: pmRow.weight });
      details.push({ label: "Thickness", value: pmRow.thickness });
      details.push({ label: "Grade", value: pmRow.grade });
      details.push({ label: "Remarks", value: pmRow.remarks || "—" });
      details.push({ label: "Timestamp", value: pmRow.timestampAdded });

      const parentId = pmRow.rmId.toUpperCase().trim();
      const parentType = detectEntityType(parentId);
      if (parentType === "MC") {
        details.push({ label: "Linked MC ID", value: parentId });
        const mcRow = store.flowDataMap[foundWoId]?.metallisationRows.find(m => m.coilNo.toUpperCase() === parentId);
        if (mcRow) {
          details.push({ label: "Linked RM ID", value: mcRow.rmId });
        }
      } else if (parentType === "RM") {
        const mcRow = store.flowDataMap[foundWoId]?.metallisationRows.find(m => m.rmId.toUpperCase() === parentId);
        if (mcRow) {
          details.push({ label: "Linked MC ID", value: mcRow.coilNo });
        } else {
          details.push({ label: "Linked MC ID", value: "—" });
        }
        details.push({ label: "Linked RM ID", value: parentId });
      }
      status = pmRow.status;
    }
    if (foundWoId) details.push({ label: "Linked WO ID", value: foundWoId });
    let foundPoId = "";
    for (const [poId, assigns] of Object.entries(store.assignments)) {
      if (assigns.some(a => a.stockId.toUpperCase() === id)) {
        foundPoId = poId;
        break;
      }
    }
    if (foundPoId) details.push({ label: "Linked PO ID", value: foundPoId });

    addNode({
      type: "PM",
      id,
      label: `Slit Roll: ${id}`,
      status,
      details,
    });
  }

  // Resolve PO details
  for (const id of Array.from(resolved.PO)) {
    const po = store.productOrders.find(p => p.id.toUpperCase() === id || p.id.replace('#', '').toUpperCase() === id);
    const details = [];
    let status = "Yet to Start";
    if (po) {
      details.push({ label: "Code", value: po.micron });
      details.push({ label: "Type", value: po.width });
      details.push({ label: "Grade", value: po.grade });
      details.push({ label: "Batch Size", value: po.quantity });
      status = po.status;
    }

    addNode({
      type: "PO",
      id,
      label: `Product Order: ${id}`,
      status,
      details,
    });
  }

  // Resolve WD details
  for (const id of Array.from(resolved.WD)) {
    let wdRow: any = null;
    let foundWoId = "";
    for (const [woId, flow] of Object.entries(store.flowDataMap)) {
      const row = flow.windingRows.find(r => r.wdId.toUpperCase() === id);
      if (row) {
        wdRow = row;
        foundWoId = woId;
        break;
      }
    }
    const details = [];
    let status = "Yet to Start";
    if (wdRow) {
      details.push({ label: "Film Width", value: wdRow.filmWidth });
      details.push({ label: "Winding Tension", value: wdRow.windingTension });
      details.push({ label: "Turns Count", value: wdRow.turnsCount });
      details.push({ label: "Qty Wound", value: wdRow.quantityWound });
      details.push({ label: "Timestamp", value: wdRow.timestamp });
      details.push({ label: "Linked PM ID", value: wdRow.linkedPmId });
      status = wdRow.status;

      // Resolve preceding MC and RM
      const flow = store.flowDataMap[foundWoId];
      const pmRow = flow?.slittingRows.find(r => r.productNo === wdRow.linkedPmId);
      if (pmRow) {
        const parentId = pmRow.rmId.toUpperCase().trim();
        const parentType = detectEntityType(parentId);
        if (parentType === "MC") {
          details.push({ label: "Linked MC ID", value: parentId });
          const mcRow = flow?.metallisationRows.find(r => r.coilNo.toUpperCase() === parentId);
          if (mcRow) {
            details.push({ label: "Linked RM ID", value: mcRow.rmId });
          }
        } else if (parentType === "RM") {
          const mcRow = flow?.metallisationRows.find(m => m.rmId.toUpperCase() === parentId);
          if (mcRow) {
            details.push({ label: "Linked MC ID", value: mcRow.coilNo });
          }
          details.push({ label: "Linked RM ID", value: parentId });
        }
      }
    }
    if (foundWoId) details.push({ label: "Linked WO ID", value: foundWoId });
    
    // Find the exact PO from PM ID
    let foundPoId = "";
    if (wdRow) {
      for (const [poId, assigns] of Object.entries(store.assignments)) {
        if (assigns.some(a => a.stockId.toUpperCase() === wdRow.linkedPmId.toUpperCase())) {
          foundPoId = poId;
          break;
        }
      }
    }
    if (foundPoId) details.push({ label: "Linked PO ID", value: foundPoId });

    addNode({
      type: "WD",
      id,
      label: `Winding Roll: ${id}`,
      status,
      details,
    });
  }

  // Resolve SP details
  for (const id of Array.from(resolved.SP)) {
    let spRow: any = null;
    let foundWoId = "";
    for (const [woId, flow] of Object.entries(store.flowDataMap)) {
      const row = flow.sprayRows.find(r => r.spId.toUpperCase() === id);
      if (row) {
        spRow = row;
        foundWoId = woId;
        break;
      }
    }
    const details = [];
    let status = "Yet to Start";
    if (spRow) {
      details.push({ label: "Spray Type", value: spRow.sprayType });
      details.push({ label: "Feed Rate", value: spRow.feedRate });
      details.push({ label: "Pressure Sitting", value: spRow.pressureSitting });
      details.push({ label: "Timestamp", value: spRow.timestamp });
      details.push({ label: "Linked WD ID", value: spRow.linkedWdId });
      status = spRow.status;

      // Resolve preceding WD, PM, MC, RM
      const flow = store.flowDataMap[foundWoId];
      const wdRow = flow?.windingRows.find(r => r.wdId === spRow.linkedWdId);
      if (wdRow) {
        details.push({ label: "Linked PM ID", value: wdRow.linkedPmId });
        const pmRow = flow?.slittingRows.find(r => r.productNo === wdRow.linkedPmId);
        if (pmRow) {
          const parentId = pmRow.rmId.toUpperCase().trim();
          const parentType = detectEntityType(parentId);
          if (parentType === "MC") {
            details.push({ label: "Linked MC ID", value: parentId });
            const mcRow = flow?.metallisationRows.find(r => r.coilNo.toUpperCase() === parentId);
            if (mcRow) {
              details.push({ label: "Linked RM ID", value: mcRow.rmId });
            }
          } else if (parentType === "RM") {
            const mcRow = flow?.metallisationRows.find(m => m.rmId.toUpperCase() === parentId);
            if (mcRow) {
              details.push({ label: "Linked MC ID", value: mcRow.coilNo });
            }
            details.push({ label: "Linked RM ID", value: parentId });
          }
        }
      }
    }
    if (foundWoId) details.push({ label: "Linked WO ID", value: foundWoId });
    
    // Find the exact PO from WD ID -> PM ID
    let foundPoId = "";
    if (spRow) {
      const flow = store.flowDataMap[foundWoId];
      const wdRow = flow?.windingRows.find(r => r.wdId === spRow.linkedWdId);
      if (wdRow) {
        for (const [poId, assigns] of Object.entries(store.assignments)) {
          if (assigns.some(a => a.stockId.toUpperCase() === wdRow.linkedPmId.toUpperCase())) {
            foundPoId = poId;
            break;
          }
        }
      }
    }
    if (foundPoId) details.push({ label: "Linked PO ID", value: foundPoId });

    addNode({
      type: "SP",
      id,
      label: `Spray Roll: ${id}`,
      status,
      details,
    });
  }

  const typeOrder: Record<EntityType, number> = {
    RM: 0,
    WO: 1,
    MC: 2,
    PM: 3,
    PO: 4,
    WD: 5,
    SP: 6,
    Unknown: 7,
  };
  return chain.sort((a, b) => typeOrder[a.type] - typeOrder[b.type]);
}
