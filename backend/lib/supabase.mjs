import { config } from "./config.mjs";

function buildUrl(path, query) {
  const base = new URL(path, config.supabaseUrl).toString();
  if (!query) return base;
  const url = new URL(base);
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    url.searchParams.set(key, String(value));
  }
  return url.toString();
}

async function parseResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");

  if (response.status === 204) {
    return null;
  }

  if (isJson) {
    return response.json();
  }

  return response.text();
}

async function request(path, options = {}) {
  const {
    method = "GET",
    token = config.supabaseServiceRoleKey,
    query,
    body,
    headers = {},
  } = options;

  const response = await fetch(buildUrl(path, query), {
    method,
    headers: {
      apikey: config.supabaseServiceRoleKey,
      Authorization: `Bearer ${token || config.supabaseServiceRoleKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const data = await parseResponse(response);

  if (!response.ok) {
    const message = typeof data === "string" ? data : data?.message || data?.error || "Supabase request failed";
    const error = new Error(message);
    error.statusCode = response.status;
    error.details = data;
    throw error;
  }

  return data;
}

export async function authLogin(email, password) {
  const response = await fetch(new URL("/auth/v1/token?grant_type=password", config.supabaseUrl), {
    method: "POST",
    headers: {
      apikey: config.supabaseAnonKey,
      Authorization: `Bearer ${config.supabaseAnonKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await parseResponse(response);

  if (!response.ok) {
    const message = typeof data === "string" ? data : data?.msg || data?.message || "Invalid login";
    const error = new Error(message);
    error.statusCode = response.status;
    error.details = data;
    throw error;
  }

  return data;
}

export async function authLogout(token) {
  return request("/auth/v1/logout", {
    method: "POST",
    token,
    headers: {
      apikey: config.supabaseAnonKey,
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function authGetUser(token) {
  return request("/auth/v1/user", {
    token,
    headers: {
      apikey: config.supabaseAnonKey,
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function adminCreateUser({ email, password, user_metadata = {}, email_confirm = true }) {
  return request("/auth/v1/admin/users", {
    method: "POST",
    body: { email, password, user_metadata, email_confirm },
  });
}

export async function adminUpdateUser(userId, body) {
  return request(`/auth/v1/admin/users/${userId}`, {
    method: "PUT",
    body,
  });
}

export async function adminListUsers() {
  return request("/auth/v1/admin/users");
}

export async function dbSelect(table, query = {}) {
  const { select = "*", ...rest } = query;
  return request(`/rest/v1/${table}`, {
    query: {
      select,
      ...rest,
    },
  });
}

export async function dbSelectOne(table, query = {}) {
  const rows = await dbSelect(table, query);
  return rows?.[0] || null;
}

export async function dbInsert(table, body) {
  return request(`/rest/v1/${table}`, {
    method: "POST",
    body,
    headers: {
      Prefer: "return=representation",
    },
  });
}

export async function dbUpdate(table, filters, body) {
  const query = {};
  for (const [key, value] of Object.entries(filters)) {
    query[key] = value;
  }
  return request(`/rest/v1/${table}`, {
    method: "PATCH",
    query,
    body,
    headers: {
      Prefer: "return=representation",
    },
  });
}

export async function dbDelete(table, filters) {
  const query = {};
  for (const [key, value] of Object.entries(filters)) {
    query[key] = value;
  }
  return request(`/rest/v1/${table}`, {
    method: "DELETE",
    query,
    headers: {
      Prefer: "return=representation",
    },
  });
}

export async function getProfileByEmail(email) {
  return dbSelectOne("profiles", { email: `eq.${email}`, limit: 1 });
}

export async function getProfileByRole(role) {
  return dbSelectOne("profiles", { role: `eq.${role}`, active: "eq.true", limit: 1 });
}

export async function listProfiles(filters = {}) {
  const query = { order: "created_at.desc" };
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === "") continue;
    query[key] = `eq.${value}`;
  }
  return dbSelect("profiles", query);
}

export async function listWorkOrders(filters = {}) {
  const query = { select: "*", order: "created_at.desc" };
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === "") continue;
    query[key] = `eq.${value}`;
  }
  return dbSelect("work_orders", query);
}

export async function getWorkOrderById(id) {
  return dbSelectOne("work_orders", { id: `eq.${id}`, limit: 1 });
}

export async function listRawMaterials(workOrderId) {
  return dbSelect("raw_materials", { work_order_id: `eq.${workOrderId}`, order: "created_at.asc" });
}

export async function listStageRecords(workOrderId) {
  return dbSelect("stage_records", { work_order_id: `eq.${workOrderId}`, order: "created_at.asc" });
}

export async function listWorkflowEvents(workOrderId) {
  return dbSelect("workflow_events", { work_order_id: `eq.${workOrderId}`, order: "created_at.asc" });
}

export async function listProductOrders(filters = {}) {
  const query = { order: "created_at.desc" };
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === "") continue;
    query[key] = `eq.${value}`;
  }
  return dbSelect("product_orders", query);
}

export async function getPrimaryEmailForRole(role) {
  const profile = await getProfileByRole(role);
  return profile?.email || null;
}

export async function getRestRaw(path, options = {}) {
  return request(path, options);
}

export async function getDbCount(table, filters = {}) {
  const response = await fetch(buildUrl(`/rest/v1/${table}`, { select: "count", ...filters }), {
    method: "HEAD",
    headers: {
      apikey: config.supabaseServiceRoleKey,
      Authorization: `Bearer ${config.supabaseServiceRoleKey}`,
      Prefer: "count=exact",
    },
  });

  const contentRange = response.headers.get("content-range") || "0-0/0";
  const total = Number.parseInt(contentRange.split("/")[1] || "0", 10);
  return Number.isFinite(total) ? total : 0;
}
