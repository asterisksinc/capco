import { supabaseRest, supabaseStorage, type Json, type ListParams, type WorkflowStatus } from "./supabaseClient";

export type MetallisationPayload = {
  metallisation_no?: string;
  work_order_id: string;
  raw_material_id: string;
  operator_id?: string;
  coil_no?: string;
  machine_no?: string;
  weight_kg: number;
  gross_weight_kg?: number;
  used_weight_kg?: number;
  weight_after_metallisation_kg?: number;
  optical_density?: number;
  resistance_ohms?: number;
  factory_wastage_kg?: number;
  factory_wastage_image_url?: string;
  photo_url?: string;
  metallisation_image_url?: string;
  metallisation_review_image_url?: string;
  qc_details?: Json;
  status?: WorkflowStatus;
};

export type SlittingPayload = {
  slitting_no?: string;
  work_order_id: string;
  metallisation_id?: string;
  raw_material_id?: string;
  operator_id?: string;
  product_no?: string;
  weight_kg: number;
  gross_weight_kg?: number;
  used_weight_kg?: number;
  thickness_micron: number;
  width_m?: number;
  number_of_bags?: number;
  grade: string;
  grade_each_bag?: Json;
  weight_each_bag?: Json;
  remarks?: string;
  slitting_image_url?: string;
  slitting_review_image_url?: string;
};

export type WindingPayload = {
  winding_no: string;
  product_order_id: string;
  product_material_id?: string;
  operator_id?: string;
  film_width: string;
  winding_tension?: string;
  film_turns?: number;
  turns_count?: number;
  quantity_wound: number;
  weight_of_element_kg?: number;
  total_film_consumed_kg?: number;
  rejected_quantity?: number;
};

export type SprayPayload = {
  spray_no: string;
  product_order_id: string;
  winding_id?: string;
  operator_id?: string;
  spray_type: string;
  feed_rate?: string;
  pressure_setting?: string;
  mfd?: string;
  no_of_coats?: number;
  thickness_maintained?: string;
  rejected_quantity?: number;
  quantity: number;
};

const stageSelects: Record<string, string> = {
  metallisation:
    "*,created_by_profile:profiles!metallisation_created_by_fkey(id,full_name,email,phone,worker_label,team_name),operator:profiles!metallisation_operator_id_fkey(id,full_name,email,phone,worker_label,team_name),work_orders(work_order_no),inventory(raw_material_code,roll_no)",
  slitting:
    "*,created_by_profile:profiles!slitting_created_by_fkey(id,full_name,email,phone,worker_label,team_name),operator:profiles!slitting_operator_id_fkey(id,full_name,email,phone,worker_label,team_name),work_orders(work_order_no),metallisation(metallisation_no),inventory(raw_material_code,roll_no)",
  winding:
    "*,created_by_profile:profiles!winding_created_by_fkey(id,full_name,email,phone,worker_label,team_name),operator:profiles!winding_operator_id_fkey(id,full_name,email,phone,worker_label,team_name),product_orders(product_order_no)",
  spray:
    "*,created_by_profile:profiles!spray_created_by_fkey(id,full_name,email,phone,worker_label,team_name),operator:profiles!spray_operator_id_fkey(id,full_name,email,phone,worker_label,team_name),product_orders(product_order_no),winding(winding_no)",
};

function listStage(table: string, params?: ListParams) {
  return supabaseRest.list(table, {
    select: params?.select ?? stageSelects[table] ?? "*",
    order: params?.order ?? "created_at",
    ascending: params?.ascending,
    filters: params?.filters,
    limit: params?.limit,
    offset: params?.offset,
  });
}

export const productionStageService = {
  listMetallisation: (params?: ListParams) => listStage("metallisation", params),
  listSlitting: (params?: ListParams) => listStage("slitting", params),
  listWinding: (params?: ListParams) => listStage("winding", params),
  listSpray: (params?: ListParams) => listStage("spray", params),
  getMetallisationById(id: string) {
    return supabaseRest.getById("metallisation", id, stageSelects.metallisation);
  },
  getSlittingById(id: string) {
    return supabaseRest.getById("slitting", id, stageSelects.slitting);
  },
  getWindingById(id: string) {
    return supabaseRest.getById("winding", id, stageSelects.winding);
  },
  getSprayById(id: string) {
    return supabaseRest.getById("spray", id, stageSelects.spray);
  },
  addMetallisation(payload: MetallisationPayload) {
    const createMetallisation = (metallisation_no: string) => supabaseRest.create("metallisation", {
      ...payload,
      metallisation_no,
      coil_no: payload.coil_no ?? metallisation_no,
      gross_weight_kg: payload.gross_weight_kg ?? payload.weight_kg,
      used_weight_kg: payload.used_weight_kg ?? 0,
      factory_wastage_kg: payload.factory_wastage_kg ?? 0,
      next_stage: "Slitting",
      stage: "Metallisation",
      status: payload.status ?? ("Completed" satisfies WorkflowStatus),
    });
    if (payload.metallisation_no) return createMetallisation(payload.metallisation_no);
    return supabaseRest.rpc<string>("capco_next_serial", { p_entity: "metallisation_coil" }).then(createMetallisation);
  },
  updateMetallisation(id: string, payload: Partial<MetallisationPayload>) {
    return supabaseRest.update("metallisation", id, payload);
  },
  uploadMetallisationImage(metallisationNo: string, file: Blob & { name?: string }, label = "metallisation") {
    return supabaseStorage.uploadProductionImage({
      stage: "metallisation",
      ownerCode: metallisationNo,
      file,
      label,
    });
  },
  addSlitting(payload: SlittingPayload) {
    const createSlitting = (slitting_no: string, product_no: string) => supabaseRest.create("slitting", {
      ...payload,
      slitting_no,
      product_no,
      gross_weight_kg: payload.gross_weight_kg ?? payload.weight_kg,
      used_weight_kg: payload.used_weight_kg ?? 0,
      number_of_bags: payload.number_of_bags ?? 0,
      stage: "Slitting",
      status: payload.number_of_bags && payload.number_of_bags > 0 ? ("Completed" satisfies WorkflowStatus) : ("Quality Check Pending" satisfies WorkflowStatus),
    });
    if (payload.slitting_no && payload.product_no) return createSlitting(payload.slitting_no, payload.product_no);

    return Promise.all([
      payload.slitting_no ? Promise.resolve(payload.slitting_no) : supabaseRest.rpc<string>("capco_next_serial", { p_entity: "slitting" }),
      payload.product_no ? Promise.resolve(payload.product_no) : supabaseRest.rpc<string>("capco_next_serial", { p_entity: "stock" }),
    ]).then(([slitting_no, product_no]) => createSlitting(slitting_no, product_no));
  },
  updateSlitting(id: string, payload: Partial<SlittingPayload>) {
    return supabaseRest.update("slitting", id, payload);
  },
  uploadSlittingImage(slittingNo: string, file: Blob & { name?: string }, label = "slitting") {
    return supabaseStorage.uploadProductionImage({
      stage: "slitting",
      ownerCode: slittingNo,
      file,
      label,
    });
  },
  addWinding(payload: WindingPayload) {
    return supabaseRest.create("winding", {
      ...payload,
      rejected_quantity: payload.rejected_quantity ?? 0,
      stage: "Winding",
      status: "Completed" satisfies WorkflowStatus,
    });
  },
  addSpray(payload: SprayPayload) {
    return supabaseRest.create("spray", {
      ...payload,
      rejected_quantity: payload.rejected_quantity ?? 0,
      stage: "Spray",
      status: "Completed" satisfies WorkflowStatus,
    });
  },
};
