import { NextResponse } from "next/server";
import { getBearerToken, supabaseAdminConfig } from "@/lib/server/supabaseAdmin";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type BulkUpdateBody = {
  inventoryIds?: unknown;
  micron?: unknown;
  supplier?: unknown;
};

export async function PATCH(request: Request) {
  if (!supabaseAdminConfig.url || !supabaseAdminConfig.anonKey) {
    return NextResponse.json(
      { ok: false, message: "Supabase configuration is missing" },
      { status: 500 },
    );
  }

  const token = getBearerToken(request);
  if (!token) {
    return NextResponse.json(
      { ok: false, message: "Authentication required" },
      { status: 401 },
    );
  }

  const body = (await request.json().catch(() => null)) as BulkUpdateBody | null;
  if (!body || !Array.isArray(body.inventoryIds)) {
    return NextResponse.json(
      { ok: false, message: "inventoryIds must be an array of inventory UUIDs" },
      { status: 400 },
    );
  }

  const inventoryIds = [...new Set(body.inventoryIds)];
  if (
    inventoryIds.length === 0 ||
    inventoryIds.length > 500 ||
    inventoryIds.some((id) => typeof id !== "string" || !uuidPattern.test(id))
  ) {
    return NextResponse.json(
      { ok: false, message: "Provide between 1 and 500 valid inventory UUIDs" },
      { status: 400 },
    );
  }

  const hasMicron = Object.prototype.hasOwnProperty.call(body, "micron");
  const hasSupplier = Object.prototype.hasOwnProperty.call(body, "supplier");

  if (!hasMicron && !hasSupplier) {
    return NextResponse.json(
      { ok: false, message: "Provide micron, supplier, or both" },
      { status: 400 },
    );
  }

  if (
    hasMicron &&
    (typeof body.micron !== "number" ||
      !Number.isFinite(body.micron) ||
      body.micron <= 0)
  ) {
    return NextResponse.json(
      { ok: false, message: "micron must be a positive number" },
      { status: 400 },
    );
  }

  if (
    hasSupplier &&
    (typeof body.supplier !== "string" || body.supplier.trim().length === 0)
  ) {
    return NextResponse.json(
      { ok: false, message: "supplier must be a non-empty string" },
      { status: 400 },
    );
  }

  const validatedInventoryIds = inventoryIds as string[];
  const micron = hasMicron ? (body.micron as number) : null;
  const supplier = hasSupplier ? (body.supplier as string).trim() : null;

  const response = await fetch(
    `${supabaseAdminConfig.url.replace(/\/$/, "")}/rest/v1/rpc/admin_bulk_update_inventory`,
    {
      method: "POST",
      headers: {
        apikey: supabaseAdminConfig.anonKey,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        p_inventory_ids: validatedInventoryIds,
        p_micron: micron,
        p_supplier: supplier,
      }),
    },
  );

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    return NextResponse.json(
      {
        ok: false,
        message: data?.message || response.statusText,
        details: data,
      },
      { status: response.status },
    );
  }

  const inventory = Array.isArray(data) ? data : [];
  return NextResponse.json({
    ok: true,
    updatedCount: inventory.length,
    inventory,
  });
}
