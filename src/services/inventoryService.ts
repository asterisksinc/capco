import { buildQrPayload, supabaseRest, supabaseStorage, toCsv, type ListParams, type WorkflowStage, type WorkflowStatus, getAccessToken } from "./supabaseClient";

export type InventoryPayload = {
  raw_material_code: string;
  raw_material_name?: string;
  roll_no: string;
  micron: number;
  width_m: number;
  net_weight_kg: number;
  gross_weight_kg: number;
  current_weight_kg?: number;
  used_weight_kg?: number;
  wastage_weight_kg?: number;
  damaged_weight_kg?: number;
  supplier: string;
  package_no?: string;
  core_inch?: number;
  temperature_c?: number;
  raw_material_image_url?: string;
  date_received?: string;
  status?: WorkflowStatus;
  stage?: WorkflowStage;
};

export type BulkCreateRow = {
  roll_no: string;
  width_m: number;
  net_weight_kg: number;
  gross_weight_kg: number;
  package_no?: string;
  core_inch?: number;
  temperature_c?: number;
};

export const inventoryService = {
  bulkCreate(payload: { micron: number; supplier: string; batches: BulkCreateRow[] }) {
    return fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/inventory/bulk-create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getAccessToken()}`,
      },
      body: JSON.stringify(payload),
    }).then((res) =>
      res.ok
        ? res.json()
        : res.json().catch(() => ({})).then((errObj) => {
            throw Object.assign(new Error(errObj?.message || errObj?.error || "Bulk create failed"), {
              status: res.status,
              issues: errObj?.issues || [],
            });
          })
    );
  },
  
  bulkUpdate(payload: { inventoryIds: string[]; micron?: number; supplier?: string }) {
    return fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/inventory/bulk-update`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getAccessToken()}`,
      },
      body: JSON.stringify(payload),
    }).then((res) =>
      res.ok
        ? res.json()
        : res.json().catch(() => ({})).then((errObj) => {
            throw Object.assign(new Error(errObj?.message || errObj?.error || "Bulk update failed"), {
              status: res.status,
              issues: errObj?.issues || [],
            });
          })
    );
  },
  list(params?: ListParams) {
    return supabaseRest.list("inventory", {
      select: params?.select ?? "*,qr_references(qr_payload,qr_url),work_orders(work_order_no)",
      order: params?.order ?? "created_at",
      ascending: params?.ascending,
      filters: params?.filters,
      limit: params?.limit,
      offset: params?.offset,
    });
  },
  getById(id: string) {
    return supabaseRest.getById("inventory", id, "*,qr_references(qr_payload,qr_url),work_orders(work_order_no)");
  },
  counts() {
    return supabaseRest.list<{ status: WorkflowStatus }>("inventory", { select: "status" }).then((rows) => ({
      totalRawMaterials: rows.length,
      inInventory: rows.filter((row) => row.status === "In Inventory").length,
      beingUsed: rows.filter((row) => row.status === "Being Used").length,
      usedCompletely: rows.filter((row) => row.status === "Used Completely").length,
    }));
  },
  create(payload: InventoryPayload) {
    return supabaseRest.create("inventory", {
      ...payload,
      current_weight_kg: payload.current_weight_kg ?? payload.net_weight_kg,
      status: payload.status ?? "In Inventory",
      stage: payload.stage ?? "Inventory",
    });
  },
  update(id: string, payload: Partial<InventoryPayload>) {
    return supabaseRest.update("inventory", id, payload);
  },
  uploadRawMaterialImage(rawMaterialCode: string, file: Blob & { name?: string }) {
    return supabaseStorage.uploadProductionImage({
      stage: "raw-material",
      ownerCode: rawMaterialCode,
      file,
      label: "raw-material",
    });
  },
  remove(id: string) {
    return supabaseRest.remove("inventory", id);
  },
  importRows(rows: InventoryPayload[]) {
    return Promise.all(rows.map((row) => inventoryService.create(row)));
  },
  exportCsv() {
    return inventoryService.list().then((rows) => toCsv(rows as Record<string, unknown>[]));
  },
  qrPayload(rawMaterialCode: string) {
    return buildQrPayload("inventory", rawMaterialCode);
  },
};
