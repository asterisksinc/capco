export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type RoleCode =
  | "super_admin"
  | "production_head"
  | "store_head"
  | "person_a"
  | "operator_1_metallisation"
  | "operator_2_slitting"
  | "slitting_qc"
  | "slitting_operator"
  | "person_b"
  | "operator_3_winding"
  | "operator_4_spray"
  | "sales"
  | "accountant";

export type WorkflowStatus =
  | "Yet to Start"
  | "In-progress"
  | "Completed"
  | "Cancelled"
  | "Pending"
  | "Returned"
  | "Issued"
  | "Accepted"
  | "Rejected"
  | "Partially Issued"
  | "Paid"
  | "Partial Payment"
  | "Due"
  | "In Inventory"
  | "Being Used"
  | "Used Completely"
  | "Quality Check Pending"
  | "Dispatch Ready";

export type WorkflowStage =
  | "Inventory"
  | "Raw Material"
  | "Ready for Metallisation"
  | "Metallisation"
  | "Slitting"
  | "Stock"
  | "Ready for Winding"
  | "Winding"
  | "Spray"
  | "Finished Goods"
  | "Completed"
  | "Dispatch Ready";

export type ListParams = {
  select?: string;
  filters?: Record<string, string | number | boolean>;
  order?: string;
  ascending?: boolean;
  limit?: number;
  offset?: number;
  role?: RoleCode;
};

export type SupabaseSession = {
  access_token: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
  user?: SupabaseAuthUser;
};

export type SupabaseAuthUser = {
  id: string;
  email?: string;
  phone?: string;
};

export type ProductionImageStage = "raw-material" | "metallisation" | "slitting";

export type StorageUploadResult = {
  bucket: string;
  path: string;
  publicUrl: string;
};

export class SupabaseApiError extends Error {
  status: number;
  details: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "SupabaseApiError";
    this.status = status;
    this.details = details;
  }
}

const memoryTokenKey = "__capco_supabase_access_token";

function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
}

function getSupabaseAnonKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? "";
}

function getStorage(): Storage | undefined {
  if (typeof window === "undefined") return undefined;
  return window.localStorage;
}

export function getAccessToken() {
  const storage = getStorage();
  return storage?.getItem(memoryTokenKey) ?? undefined;
}

export function setAccessToken(token?: string) {
  const storage = getStorage();
  if (!storage) return;
  if (token) storage.setItem(memoryTokenKey, token);
  else storage.removeItem(memoryTokenKey);
}

export const supabaseConfig = {
  get url() {
    const url = getSupabaseUrl();
    if (!url) throw new SupabaseApiError("Missing NEXT_PUBLIC_SUPABASE_URL", 500);
    return url.replace(/\/$/, "");
  },
  get anonKey() {
    const key = getSupabaseAnonKey();
    if (!key) throw new SupabaseApiError("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY", 500);
    return key;
  },
};

function buildQuery(params: ListParams = {}) {
  const query = new URLSearchParams();
  query.set("select", params.select ?? "*");

  Object.entries(params.filters ?? {}).forEach(([key, value]) => {
    query.set(key, `eq.${String(value)}`);
  });

  if (params.order) {
    query.set("order", `${params.order}.${params.ascending === true ? "asc" : "desc"}`);
  }
  if (typeof params.limit === "number") query.set("limit", String(params.limit));
  if (typeof params.offset === "number") query.set("offset", String(params.offset));

  return query.toString();
}

export async function supabaseRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getAccessToken();
  const headers = new Headers(init.headers);
  headers.set("apikey", supabaseConfig.anonKey);
  headers.set("Authorization", `Bearer ${token ?? supabaseConfig.anonKey}`);
  headers.set("Content-Type", headers.get("Content-Type") ?? "application/json");

  const response = await fetch(`${supabaseConfig.url}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    console.log(response);
    let details: unknown;
    try {
      details = await response.json();
    } catch {
      details = await response.text();
    }
    const message = typeof details === "object" && details && "message" in details ? String(details.message) : response.statusText;
    throw new SupabaseApiError(message, response.status, details);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const supabaseRest = {
  list<T>(table: string, params?: ListParams) {
    return supabaseRequest<T[]>(`/rest/v1/${table}?${buildQuery(params)}`);
  },
  getById<T>(table: string, id: string, select = "*") {
    return supabaseRequest<T[]>(`/rest/v1/${table}?select=${encodeURIComponent(select)}&id=eq.${encodeURIComponent(id)}&limit=1`).then((rows) => rows[0] ?? null);
  },
  create<T>(table: string, payload: unknown) {
    return supabaseRequest<T[]>(`/rest/v1/${table}`, {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(payload),
    }).then((rows) => rows[0]);
  },
  update<T>(table: string, id: string, payload: unknown) {
    return supabaseRequest<T[]>(`/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(payload),
    }).then((rows) => rows[0]);
  },
  remove(table: string, id: string) {
    return supabaseRequest<void>(`/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { Prefer: "return=minimal" },
    });
  },
  rpc<T>(fnName: string, payload: unknown = {}) {
    return supabaseRequest<T>(`/rest/v1/rpc/${fnName}`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};

const productionImagesBucket = "production-stage-images";

function sanitizeStorageSegment(value: string) {
  return value.trim().replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function encodeStoragePath(path: string) {
  return path
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function getFileExtension(file: Blob & { name?: string }) {
  const fromName = file.name?.split(".").pop();
  if (fromName && fromName !== file.name) return fromName.toLowerCase();
  return file.type.split("/")[1]?.toLowerCase() || "jpg";
}

export const supabaseStorage = {
  bucket: productionImagesBucket,
  buildProductionImagePath(stage: ProductionImageStage, ownerCode: string, file: Blob & { name?: string }, label = "image") {
    const timestamp = Date.now();
    const extension = getFileExtension(file);
    return [
      stage,
      sanitizeStorageSegment(ownerCode),
      `${sanitizeStorageSegment(label)}-${timestamp}.${sanitizeStorageSegment(extension)}`,
    ].join("/");
  },
  publicUrl(path: string, bucket = productionImagesBucket) {
    return `${supabaseConfig.url}/storage/v1/object/public/${bucket}/${encodeStoragePath(path)}`;
  },
  async uploadProductionImage(params: {
    stage: ProductionImageStage;
    ownerCode: string;
    file: Blob & { name?: string };
    label?: string;
    bucket?: string;
    upsert?: boolean;
  }): Promise<StorageUploadResult> {
    if (!params.file.type.startsWith("image/")) {
      throw new SupabaseApiError("Only image uploads are allowed", 400);
    }

    const bucket = params.bucket ?? productionImagesBucket;
    const path = this.buildProductionImagePath(params.stage, params.ownerCode, params.file, params.label);
    const token = getAccessToken();
    const response = await fetch(`${supabaseConfig.url}/storage/v1/object/${bucket}/${encodeStoragePath(path)}`, {
      method: "POST",
      headers: {
        apikey: supabaseConfig.anonKey,
        Authorization: `Bearer ${token ?? supabaseConfig.anonKey}`,
        "Content-Type": params.file.type,
        "x-upsert": String(params.upsert ?? true),
      },
      body: params.file,
    });

    if (!response.ok) {
      let details: unknown;
      try {
        details = await response.json();
      } catch {
        details = await response.text();
      }
      const message = typeof details === "object" && details && "message" in details ? String(details.message) : response.statusText;
      throw new SupabaseApiError(message, response.status, details);
    }

    return {
      bucket,
      path,
      publicUrl: this.publicUrl(path, bucket),
    };
  },
};

export const supabaseAuth = {
  getUser() {
    return supabaseRequest<SupabaseAuthUser>("/auth/v1/user");
  },
  sendOtp(phone: string) {
    return supabaseRequest<{ message_id?: string }>("/auth/v1/otp", {
      method: "POST",
      body: JSON.stringify({ phone, create_user: false }),
    });
  },
  verifyOtp(phone: string, token: string) {
    return supabaseRequest<SupabaseSession>("/auth/v1/verify", {
      method: "POST",
      body: JSON.stringify({ phone, token, type: "sms" }),
    }).then((session) => {
      setAccessToken(session.access_token);
      return session;
    });
  },
  signInWithPassword(identifier: string, password: string) {
    const isPhone = /^\+?[0-9]{8,15}$/.test(identifier);
    return supabaseRequest<SupabaseSession>("/auth/v1/token?grant_type=password", {
      method: "POST",
      body: JSON.stringify(isPhone ? { phone: identifier, password } : { email: identifier, password }),
    }).then((session) => {
      setAccessToken(session.access_token);
      return session;
    });
  },
  signOut() {
    return supabaseRequest<void>("/auth/v1/logout", { method: "POST" }).finally(() => setAccessToken(undefined));
  },
};

export function buildQrPayload(entityType: string, code: string) {
  return `capco://${entityType}/${code}`;
}

export function toCsv<T extends Record<string, unknown>>(rows: T[]) {
  if (rows.length === 0) return "";
  const columns = Object.keys(rows[0]);
  const escape = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  return [columns.join(","), ...rows.map((row) => columns.map((column) => escape(row[column])).join(","))].join("\n");
}
