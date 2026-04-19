import http from "node:http";
import "dotenv/config.js";
import { config, ensureConfig } from "./lib/config.mjs";
import {
  asPositiveInt,
  generateCode,
  getBearerToken,
  handleOptions,
  isNonEmptyString,
  normalizeString,
  readJsonBody,
  sendJson,
  withCors,
} from "./lib/http.mjs";
import {
  authGetUser,
  authLogin,
  authLogout,
  dbInsert,
  dbSelect,
  dbUpdate,
  getPrimaryEmailForRole,
  getProfileByEmail,
  getWorkOrderById,
  listProfiles,
  listProductOrders,
  listRawMaterials,
  listStageRecords,
  listWorkflowEvents,
} from "./lib/supabase.mjs";
import {
  canHandleStage,
  displayStage,
  initialAssigneeRole,
  nextAssigneeRoleForStage,
  nextStage,
  normalizeStage,
  roleStageScopes,
  workflowStages,
} from "./lib/workflow.mjs";

ensureConfig();

export async function handleBackendRequest(req, res) {
  withCors(res, config.corsOrigin);

  if (req.method === "OPTIONS") {
    return handleOptions(res, config.corsOrigin);
  }

  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const pathname = url.pathname.replace(/\/+$/, "") || "/";

  try {
    if (req.method === "GET" && pathname === "/health") {
      return sendJson(res, 200, {
        ok: true,
        service: "capco-backend",
        uptime: process.uptime(),
      });
    }

    if (req.method === "POST" && pathname === "/auth/login") {
      const body = await readJsonBody(req);
      if (!isNonEmptyString(body.email) || !isNonEmptyString(body.password)) {
        return sendJson(res, 400, { ok: false, message: "email and password are required" });
      }

      const auth = await authLogin(body.email.trim(), body.password);
      const profile = await getProfileByEmail(auth.user.email);

      if (!profile) {
        return sendJson(res, 403, {
          ok: false,
          message: "No application profile found for this account",
        });
      }

      return sendJson(res, 200, {
        ok: true,
        session: {
          access_token: auth.access_token,
          refresh_token: auth.refresh_token,
          expires_in: auth.expires_in,
          token_type: auth.token_type,
        },
        user: auth.user,
        profile: sanitizeProfile(profile),
        permissions: {
          stages: roleStageScopes[profile.role] || [],
          can_manage_users: profile.role === "super_admin",
          can_manage_work_orders: ["super_admin", "production_head"].includes(profile.role),
        },
      });
    }

    if (req.method === "POST" && pathname === "/auth/logout") {
      const token = getBearerToken(req);
      if (!token) {
        return sendJson(res, 401, { ok: false, message: "Missing bearer token" });
      }

      await authLogout(token);
      return sendJson(res, 200, { ok: true, message: "Logged out" });
    }

    const currentUser = await authenticate(req);

    if (req.method === "GET" && pathname === "/me") {
      return sendJson(res, 200, {
        ok: true,
        user: currentUser.authUser,
        profile: sanitizeProfile(currentUser.profile),
        permissions: {
          stages: roleStageScopes[currentUser.profile.role] || [],
          can_manage_users: currentUser.profile.role === "super_admin",
          can_manage_work_orders: ["super_admin", "production_head"].includes(currentUser.profile.role),
        },
      });
    }

    if (req.method === "GET" && pathname === "/users") {
      requireRole(currentUser.profile.role, ["super_admin", "production_head", "head_of_operations"]);
      const role = url.searchParams.get("role") || "";
      const users = await listProfiles(role ? { role: normalizeString(role) } : {});
      return sendJson(res, 200, { ok: true, data: users.map(sanitizeProfile) });
    }

    const usersPatch = pathname.match(/^\/users\/([^/]+)$/);
    if (req.method === "PATCH" && usersPatch) {
      requireRole(currentUser.profile.role, ["super_admin"]);
      const userId = decodeURIComponent(usersPatch[1]);
      const body = await readJsonBody(req);
      const patch = {};

      if (isNonEmptyString(body.full_name)) patch.full_name = body.full_name.trim();
      if (isNonEmptyString(body.role)) patch.role = normalizeString(body.role);
      if (body.stage_scope !== undefined) patch.stage_scope = Array.isArray(body.stage_scope) ? body.stage_scope.map(normalizeStage) : [];
      if (typeof body.active === "boolean") patch.active = body.active;
      if (isNonEmptyString(body.email)) patch.email = body.email.trim().toLowerCase();

      if (Object.keys(patch).length === 0) {
        return sendJson(res, 400, { ok: false, message: "Nothing to update" });
      }

      const updated = await dbUpdate("profiles", { id: `eq.${userId}` }, patch);
      return sendJson(res, 200, { ok: true, data: updated?.[0] || null });
    }

    if (req.method === "GET" && pathname === "/work-orders") {
      const mine = url.searchParams.get("mine") === "true";
      const status = url.searchParams.get("status") || "";

      let data = await listWorkOrdersForRole(currentUser.profile, { status });
      if (mine) {
        data = data.filter((row) => row.current_assignee_email === currentUser.profile.email);
      }

      return sendJson(res, 200, { ok: true, data: data.map(formatWorkOrderRow) });
    }

    if (req.method === "POST" && pathname === "/work-orders") {
      requireRole(currentUser.profile.role, ["super_admin", "production_head"]);
      const body = await readJsonBody(req);
      const micron = Number(body.micron);
      const width = Number(body.width);
      const quantity = asPositiveInt(body.quantity);

      if (!Number.isFinite(micron) || !Number.isFinite(width) || quantity <= 0) {
        return sendJson(res, 400, { ok: false, message: "micron, width and quantity are required" });
      }

      const order = {
        work_order_no: isNonEmptyString(body.work_order_no) ? body.work_order_no.trim() : generateCode("WO"),
        micron,
        width,
        quantity,
        current_stage: "raw_material",
        status: "yet_to_start",
        production_priority: asPositiveInt(body.production_priority, 3),
        current_assignee_role: initialAssigneeRole(),
        current_assignee_email: await getPrimaryEmailForRole(initialAssigneeRole()),
        created_by_email: currentUser.profile.email,
      };

      const created = await dbInsert("work_orders", order);
      return sendJson(res, 201, { ok: true, data: formatWorkOrderRow(created?.[0] || created) });
    }

    const workOrderIdMatch = pathname.match(/^\/work-orders\/([^/]+)$/);
    if (workOrderIdMatch) {
      const workOrderId = decodeURIComponent(workOrderIdMatch[1]);

      if (req.method === "GET") {
        const data = await getWorkOrderDetail(workOrderId);
        return sendJson(res, 200, { ok: true, data });
      }

      if (req.method === "PATCH") {
        requireRole(currentUser.profile.role, ["super_admin", "production_head"]);
        const body = await readJsonBody(req);
        const patch = {};
        if (body.micron !== undefined) patch.micron = Number(body.micron);
        if (body.width !== undefined) patch.width = Number(body.width);
        if (body.quantity !== undefined) patch.quantity = asPositiveInt(body.quantity);
        if (isNonEmptyString(body.status)) patch.status = normalizeString(body.status);
        if (isNonEmptyString(body.current_stage)) patch.current_stage = normalizeStage(body.current_stage);
        if (isNonEmptyString(body.current_assignee_role)) patch.current_assignee_role = normalizeString(body.current_assignee_role);
        if (isNonEmptyString(body.current_assignee_email)) patch.current_assignee_email = body.current_assignee_email.trim().toLowerCase();
        if (body.production_priority !== undefined) patch.production_priority = asPositiveInt(body.production_priority, 3);

        if (Object.keys(patch).length === 0) {
          return sendJson(res, 400, { ok: false, message: "Nothing to update" });
        }

        const updated = await dbUpdate("work_orders", { id: `eq.${workOrderId}` }, patch);
        return sendJson(res, 200, { ok: true, data: formatWorkOrderRow(updated?.[0] || updated) });
      }
    }

    const rawMatch = pathname.match(/^\/work-orders\/([^/]+)\/raw-materials$/);
    if (rawMatch) {
      const workOrderId = decodeURIComponent(rawMatch[1]);
      if (req.method === "GET") {
        const rows = await listRawMaterials(workOrderId);
        return sendJson(res, 200, { ok: true, data: rows });
      }

      if (req.method === "POST") {
        requireRole(currentUser.profile.role, ["super_admin", "production_head", "person_a"]);
        const body = await readJsonBody(req);
        const micron = Number(body.micron);
        const width = Number(body.width);
        const quantity = asPositiveInt(body.quantity);

        if (!Number.isFinite(micron) || !Number.isFinite(width) || quantity <= 0) {
          return sendJson(res, 400, { ok: false, message: "micron, width and quantity are required" });
        }

        const rawMaterial = {
          raw_material_no: isNonEmptyString(body.raw_material_no) ? body.raw_material_no.trim() : generateCode("RM"),
          work_order_id: workOrderId,
          micron,
          width,
          quantity,
          supplier: isNonEmptyString(body.supplier) ? body.supplier.trim() : null,
          other: isNonEmptyString(body.other) ? body.other.trim() : null,
          created_by_email: currentUser.profile.email,
        };

        const created = await dbInsert("raw_materials", rawMaterial);
        const nextAssigneeRole = "person_a";
        const nextAssigneeEmail = await getPrimaryEmailForRole(nextAssigneeRole);
        await dbUpdate("work_orders", { id: `eq.${workOrderId}` }, {
          current_stage: "metallisation",
          status: "in_progress",
          current_assignee_role: nextAssigneeRole,
          current_assignee_email: nextAssigneeEmail,
        });
        await dbInsert("workflow_events", {
          workflow_event_no: generateCode("EV"),
          work_order_id: workOrderId,
          event_type: "raw_material_added",
          from_stage: "raw_material",
          to_stage: "metallisation",
          actor_email: currentUser.profile.email,
          details: { raw_material_no: rawMaterial.raw_material_no },
        });

        return sendJson(res, 201, { ok: true, data: created?.[0] || created });
      }
    }

    const stageMatch = pathname.match(/^\/work-orders\/([^/]+)\/stages\/([^/]+)$/);
    if (stageMatch && req.method === "POST") {
      const workOrderId = decodeURIComponent(stageMatch[1]);
      const stage = normalizeStage(decodeURIComponent(stageMatch[2]));
      const body = await readJsonBody(req);

      if (!workflowStages.includes(stage)) {
        return sendJson(res, 400, { ok: false, message: "Unknown stage" });
      }

      const workOrder = await getWorkOrderById(workOrderId);
      if (!workOrder) {
        return sendJson(res, 404, { ok: false, message: "Work order not found" });
      }

      if (workOrder.current_stage !== stage) {
        return sendJson(res, 409, {
          ok: false,
          message: `Work order is currently at ${displayStage(workOrder.current_stage)}`,
        });
      }

      if (!canHandleStage(currentUser.profile.role, stage)) {
        return sendJson(res, 403, { ok: false, message: "You are not allowed to process this stage" });
      }

      const stageRecord = {
        stage_record_no: isNonEmptyString(body.stage_record_no) ? body.stage_record_no.trim() : generateCode("STG"),
        work_order_id: workOrderId,
        stage,
        payload: body.payload ?? body,
        observations: isNonEmptyString(body.observations) ? body.observations.trim() : null,
        created_by_email: currentUser.profile.email,
      };

      const created = await dbInsert("stage_records", stageRecord);
      const next = nextStage(stage);

      if (next === "production_head_review") {
        await dbUpdate("work_orders", { id: `eq.${workOrderId}` }, {
          current_stage: next,
          status: "awaiting_production_head_review",
          current_assignee_role: "production_head",
          current_assignee_email: await getPrimaryEmailForRole("production_head"),
        });
      } else if (next === "completed") {
        await dbUpdate("work_orders", { id: `eq.${workOrderId}` }, {
          current_stage: "production_head_review",
          status: "awaiting_production_head_review",
          current_assignee_role: "production_head",
          current_assignee_email: await getPrimaryEmailForRole("production_head"),
        });
      } else {
        await dbUpdate("work_orders", { id: `eq.${workOrderId}` }, {
          current_stage: next,
          status: "in_progress",
          current_assignee_role: nextAssigneeRoleForStage(next),
          current_assignee_email: await getPrimaryEmailForRole(nextAssigneeRoleForStage(next)),
        });
      }

      await dbInsert("workflow_events", {
        workflow_event_no: generateCode("EV"),
        work_order_id: workOrderId,
        event_type: `${stage}_completed`,
        from_stage: stage,
        to_stage: next === "completed" ? "production_head_review" : next,
        actor_email: currentUser.profile.email,
        details: {
          stage,
          stage_record_no: stageRecord.stage_record_no,
        },
      });

      return sendJson(res, 201, {
        ok: true,
        data: created?.[0] || created,
        next_stage: next === "completed" ? "production_head_review" : next,
      });
    }

    const advanceMatch = pathname.match(/^\/work-orders\/([^/]+)\/advance$/);
    if (advanceMatch && req.method === "POST") {
      const workOrderId = decodeURIComponent(advanceMatch[1]);
      const workOrder = await getWorkOrderById(workOrderId);

      if (!workOrder) {
        return sendJson(res, 404, { ok: false, message: "Work order not found" });
      }

      if (workOrder.current_stage === "production_head_review") {
        requireRole(currentUser.profile.role, ["super_admin", "production_head"]);
        await dbUpdate("work_orders", { id: `eq.${workOrderId}` }, {
          current_stage: "head_of_operations_review",
          status: "awaiting_head_of_operations_review",
          current_assignee_role: "head_of_operations",
          current_assignee_email: await getPrimaryEmailForRole("head_of_operations"),
        });
        await dbInsert("workflow_events", {
          workflow_event_no: generateCode("EV"),
          work_order_id: workOrderId,
          event_type: "production_head_approved",
          from_stage: "production_head_review",
          to_stage: "head_of_operations_review",
          actor_email: currentUser.profile.email,
          details: {},
        });
        return sendJson(res, 200, { ok: true, message: "Moved to head of operations review" });
      }

      if (workOrder.current_stage === "head_of_operations_review") {
        requireRole(currentUser.profile.role, ["super_admin", "head_of_operations"]);
        await dbUpdate("work_orders", { id: `eq.${workOrderId}` }, {
          current_stage: "completed",
          status: "completed",
          current_assignee_role: "super_admin",
          current_assignee_email: await getPrimaryEmailForRole("super_admin"),
          completed_at: new Date().toISOString(),
        });
        await dbInsert("workflow_events", {
          workflow_event_no: generateCode("EV"),
          work_order_id: workOrderId,
          event_type: "head_of_operations_approved",
          from_stage: "head_of_operations_review",
          to_stage: "completed",
          actor_email: currentUser.profile.email,
          details: {},
        });
        return sendJson(res, 200, { ok: true, message: "Work order completed" });
      }

      return sendJson(res, 409, {
        ok: false,
        message: "Advance is only allowed from production head or head of operations review stages",
      });
    }

    if (req.method === "GET" && pathname === "/inbox") {
      const role = currentUser.profile.role;
      const all = await listWorkOrdersForRole(currentUser.profile);
      const data = all.filter((order) => {
        if (role === "super_admin") return true;
        if (["production_head", "head_of_operations"].includes(role)) {
          return true;
        }
        return order.current_assignee_email === currentUser.profile.email || order.current_assignee_role === role;
      });

      return sendJson(res, 200, { ok: true, data: data.map(formatWorkOrderRow) });
    }

    if (req.method === "GET" && pathname === "/product-orders") {
      const data = await listProductOrders();
      return sendJson(res, 200, { ok: true, data });
    }

    if (req.method === "POST" && pathname === "/product-orders") {
      requireRole(currentUser.profile.role, ["super_admin", "production_head"]);
      const body = await readJsonBody(req);
      const productOrder = {
        product_order_no: isNonEmptyString(body.product_order_no) ? body.product_order_no.trim() : generateCode("PO"),
        product_code: isNonEmptyString(body.product_code) ? body.product_code.trim() : null,
        model_no: isNonEmptyString(body.model_no) ? body.model_no.trim() : null,
        capacitance_value: isNonEmptyString(body.capacitance_value) ? body.capacitance_value.trim() : null,
        voltage_rating: isNonEmptyString(body.voltage_rating) ? body.voltage_rating.trim() : null,
        capacitor_type: isNonEmptyString(body.capacitor_type) ? body.capacitor_type.trim() : null,
        grade: isNonEmptyString(body.grade) ? body.grade.trim() : null,
        tolerance: isNonEmptyString(body.tolerance) ? body.tolerance.trim() : null,
        dielectric_material: isNonEmptyString(body.dielectric_material) ? body.dielectric_material.trim() : null,
        batch_size: asPositiveInt(body.batch_size),
        production_priority: asPositiveInt(body.production_priority, 3),
        created_by_email: currentUser.profile.email,
      };

      const created = await dbInsert("product_orders", productOrder);
      return sendJson(res, 201, { ok: true, data: created?.[0] || created });
    }

    return sendJson(res, 404, {
      ok: false,
      message: "Route not found",
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return sendJson(res, statusCode, {
      ok: false,
      message: error.message || "Unexpected error",
      details: error.details || undefined,
    });
  }
}

async function authenticate(req) {
  const token = getBearerToken(req);
  if (!token) {
    const error = new Error("Missing bearer token");
    error.statusCode = 401;
    throw error;
  }

  const authUser = await authGetUser(token);
  const profile = await getProfileByEmail(authUser.email);

  if (!profile) {
    const error = new Error("No profile found for this account");
    error.statusCode = 403;
    throw error;
  }

  return { authUser, profile, token };
}

function requireRole(role, allowedRoles) {
  if (allowedRoles.includes(role) || role === "super_admin") return;
  const error = new Error("Forbidden");
  error.statusCode = 403;
  throw error;
}

function sanitizeProfile(profile) {
  return {
    id: profile.id,
    auth_user_id: profile.auth_user_id,
    full_name: profile.full_name,
    email: profile.email,
    role: profile.role,
    stage_scope: profile.stage_scope || [],
    active: profile.active,
    created_at: profile.created_at,
    updated_at: profile.updated_at,
  };
}

function formatWorkOrderRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    work_order_no: row.work_order_no,
    micron: row.micron,
    width: row.width,
    quantity: row.quantity,
    stage: displayStage(row.current_stage),
    current_stage: row.current_stage,
    status: row.status,
    production_priority: row.production_priority,
    current_assignee_role: row.current_assignee_role,
    current_assignee_email: row.current_assignee_email,
    created_by_email: row.created_by_email,
    date: row.created_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    completed_at: row.completed_at,
  };
}

async function getWorkOrderDetail(workOrderId) {
  const workOrder = await getWorkOrderById(workOrderId);
  if (!workOrder) {
    const error = new Error("Work order not found");
    error.statusCode = 404;
    throw error;
  }

  const [rawMaterials, stageRecords, workflowEvents] = await Promise.all([
    listRawMaterials(workOrderId),
    listStageRecords(workOrderId),
    listWorkflowEvents(workOrderId),
  ]);

  return {
    overview: formatWorkOrderRow(workOrder),
    raw_materials: rawMaterials,
    stage_records: stageRecords,
    workflow_events: workflowEvents,
    next_action:
      workOrder.current_stage === "production_head_review"
        ? "Awaiting production head approval"
        : workOrder.current_stage === "head_of_operations_review"
          ? "Awaiting head of operations approval"
          : `Assigned to ${displayStage(workOrder.current_stage)}`,
  };
}

async function listWorkOrdersForRole(profile, filters = {}) {
  const status = filters.status ? normalizeString(filters.status) : "";
  let rows = await dbSelect("work_orders", {
    order: "created_at.desc",
    ...(status ? { status: `eq.${status}` } : {}),
  });

  if (profile.role === "super_admin") {
    return rows;
  }

  if (["production_head", "head_of_operations"].includes(profile.role)) {
    return rows;
  }

  const scope = roleStageScopes[profile.role] || [];
  return rows.filter(
    (row) =>
      row.current_assignee_email === profile.email ||
      row.current_assignee_role === profile.role ||
      scope.includes(normalizeStage(row.current_stage)),
  );
}

if (process.env.CAPCO_STANDALONE_BACKEND === "true") {
  const server = http.createServer((req, res) => void handleBackendRequest(req, res));
  server.listen(config.port, () => {
    console.log(`Capco backend listening on http://localhost:${config.port}`);
  });
}
