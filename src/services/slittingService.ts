import { supabaseRest, type Json, type ListParams, getAccessToken } from "./supabaseClient";

export type SlittingCoilScanResult = {
  metallisation_id: string;
  metallisation_no: string;
  coil_no?: string | null;
  work_order_id: string;
  work_order_no: string;
  product_order?: { id: string; product_order_no: string } | null;
  material?: string | null;
  raw_material_code?: string | null;
  micron?: number | null;
  width_m?: number | null;
  weight_kg?: number | null;
  metallisation_date?: string;
  metallisation_status?: string;
  current_production_stage?: string;
  next_stage?: string;
  existing_slitting_status?: string | null;
  already_confirmed: boolean;
  confirmed_by?: string | null;
  confirmed_by_profile_id?: string | null;
  confirmed_at?: string | null;
};

export type SlittingConfirmationResult = {
  confirmation: Record<string, unknown>;
  duplicate: boolean;
};

export type CreateSlittingBatchPayload = {
  slitting_id: string;
  packet_type: "Bag" | "Packet";
  quantity: number;
  product_order_id?: string;
  item_weights?: number[];
  item_grades?: string[];
  idempotency_key: string;
  metadata?: Json;
};

export type SlittingBatchResult = {
  batch: Record<string, unknown>;
  items: Record<string, unknown>[];
  idempotent: boolean;
};

export const slittingService = {
  listConfirmations(params?: ListParams) {
    return supabaseRest.list("slitting_coil_confirmations", {
      select:
        params?.select ??
        "*,work_orders(work_order_no,status,stage),product_orders(product_order_no),metallisation(metallisation_no,coil_no,weight_kg,status,next_stage),operator:profiles!slitting_coil_confirmations_operator_id_fkey(id,full_name,phone)",
      order: params?.order ?? "confirmed_at",
      ascending: params?.ascending,
      filters: params?.filters,
      limit: params?.limit,
      offset: params?.offset,
    });
  },
  listBatches(params?: ListParams) {
    return supabaseRest.list("slitting_batches", {
      select:
        params?.select ??
        "*,slitting(slitting_no,product_no),work_orders(work_order_no),product_orders(product_order_no),metallisation(metallisation_no,coil_no),slitting_batch_items(*)",
      order: params?.order ?? "created_at",
      ascending: params?.ascending,
      filters: params?.filters,
      limit: params?.limit,
      offset: params?.offset,
    });
  },
  scanMetallisationCoil(qrValue: string) {
    return supabaseRest.rpc<SlittingCoilScanResult>("scan_slitting_metallisation_coil", { p_qr_value: qrValue });
  },
  confirmMetallisationCoil(payload: {
    qr_value: string;
    work_order_id?: string;
    product_order_id?: string;
    idempotency_key?: string;
  }) {
    return supabaseRest.rpc<SlittingConfirmationResult>("confirm_slitting_metallisation_coil", {
      p_qr_value: payload.qr_value,
      p_work_order_id: payload.work_order_id ?? null,
      p_product_order_id: payload.product_order_id ?? null,
      p_idempotency_key: payload.idempotency_key ?? null,
    });
  },
  createPacketBatch(payload: CreateSlittingBatchPayload) {
    return supabaseRest.rpc<SlittingBatchResult>("create_slitting_packet_batch", {
      p_slitting_id: payload.slitting_id,
      p_packet_type: payload.packet_type,
      p_quantity: payload.quantity,
      p_product_order_id: payload.product_order_id ?? null,
      p_item_weights: payload.item_weights ?? [],
      p_item_grades: payload.item_grades ?? [],
      p_idempotency_key: payload.idempotency_key,
      p_metadata: payload.metadata ?? {},
    });
  },
  stickerDownloadUrl(documentId: string) {
    const token = getAccessToken() || "";
    return `/api/documents/generated_documents/${encodeURIComponent(documentId)}?intent=download&token=${encodeURIComponent(token)}`;
  },
  stickerPrintUrl(documentId: string) {
    const token = getAccessToken() || "";
    return `/api/documents/generated_documents/${encodeURIComponent(documentId)}?intent=print&token=${encodeURIComponent(token)}`;
  },
  batchStickerDownloadUrl(batchId: string) {
    const token = getAccessToken() || "";
    return `/api/documents/slitting_batches/${encodeURIComponent(batchId)}?kind=stickers&intent=download&token=${encodeURIComponent(token)}`;
  },
  batchStickerPrintUrl(batchId: string) {
    const token = getAccessToken() || "";
    return `/api/documents/slitting_batches/${encodeURIComponent(batchId)}?kind=stickers&intent=print&token=${encodeURIComponent(token)}`;
  },
};
