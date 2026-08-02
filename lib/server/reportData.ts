import { supabaseAdminRequest } from "@/lib/server/supabaseAdmin";

export const REPORT_STAGES = [
  "Raw Material",
  "Work Order",
  "Metallisation",
  "Slitting",
  "Product Order",
  "Winding",
  "Spray",
] as const;

export type ReportStage = (typeof REPORT_STAGES)[number];
export type ReportSnapshotRow = Record<string, string | number | boolean | null>;

type SourceConfig = { table: string; select: string };

const sourceByStage: Record<ReportStage, SourceConfig> = {
  "Raw Material": { table: "inventory", select: "*" },
  "Work Order": { table: "work_orders", select: "*" },
  Metallisation: {
    table: "metallisation",
    select: "*,inventory:raw_material_id(raw_material_code,roll_no,net_weight_kg)",
  },
  Slitting: {
    table: "slitting",
    select: "*,metallisation:metallisation_id(coil_no,metallisation_no)",
  },
  "Product Order": { table: "product_orders", select: "*" },
  Winding: { table: "winding", select: "*" },
  Spray: { table: "spray", select: "*" },
};

export function isReportStage(value: unknown): value is ReportStage {
  return typeof value === "string" && REPORT_STAGES.includes(value as ReportStage);
}

export function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function followingDate(date: string) {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + 1);
  return value.toISOString().slice(0, 10);
}

function displayDate(value: unknown) {
  if (typeof value !== "string" || !value) return "-";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" }).format(new Date(value));
}

function valueOrDash(value: unknown): string | number | boolean {
  if (value === undefined || value === null || value === "") return "-";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  return String(value);
}

function withUnit(value: unknown, unit: string) {
  return value === undefined || value === null || value === "" ? "-" : `${value}${unit}`;
}

function related(value: unknown): Record<string, unknown> {
  if (Array.isArray(value)) return (value[0] as Record<string, unknown>) || {};
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

export function formatReportRows(stage: ReportStage, rows: Record<string, unknown>[]): ReportSnapshotRow[] {
  return rows.map((item): ReportSnapshotRow => {
    if (stage === "Raw Material") {
      return {
        rollNo: valueOrDash(item.raw_material_code),
        micron: withUnit(item.micron, "μ"),
        width: withUnit(item.width_m, "m"),
        netWeight: withUnit(item.net_weight_kg, "kgs"),
        grossWeight: withUnit(item.gross_weight_kg, "kgs"),
        usedWeight: withUnit(item.used_weight_kg, "kgs"),
        wastageWeight: withUnit(item.wastage_weight_kg, "kgs"),
        damagedWeight: withUnit(item.damaged_weight_kg, "kgs"),
        temperature: withUnit(item.temperature_c, "°C"),
        supplier: valueOrDash(item.supplier),
        status: valueOrDash(item.status),
        createdAt: displayDate(item.created_at),
      };
    }

    if (stage === "Work Order") {
      return {
        workOrderNo: valueOrDash(item.work_order_no),
        micron: withUnit(item.micron, "μ"),
        width: withUnit(item.width_m, "m"),
        quantity: withUnit(item.quantity, "kg"),
        stage: valueOrDash(item.stage),
        status: valueOrDash(item.status),
        createdAt: displayDate(item.created_at),
      };
    }

    if (stage === "Product Order") {
      return {
        orderId: valueOrDash(item.product_order_no),
        product: valueOrDash(item.product_name ?? item.product_code),
        grade: valueOrDash(item.grade),
        quantity: withUnit(item.quantity, "kg"),
        customer: valueOrDash(item.customer),
        stage: valueOrDash(item.stage),
        status: valueOrDash(item.status),
        createdAt: displayDate(item.created_at),
      };
    }

    if (stage === "Metallisation") {
      const inventory = related(item.inventory);
      return {
        coilNo: valueOrDash(item.coil_no ?? item.metallisation_no),
        rmId: valueOrDash(inventory.raw_material_code ?? inventory.roll_no),
        rmWeight: withUnit(inventory.net_weight_kg, "kgs"),
        factoryWastageWeight: withUnit(item.factory_wastage_kg, "kgs"),
        weight: withUnit(item.weight_kg, "kgs"),
        status: valueOrDash(item.status),
        createdAt: displayDate(item.created_at),
      };
    }

    if (stage === "Slitting") {
      const metallisation = related(item.metallisation);
      return {
        productNo: valueOrDash(item.product_no ?? item.slitting_no),
        coilId: valueOrDash(metallisation.coil_no ?? metallisation.metallisation_no),
        weight: withUnit(item.weight_kg, "kgs"),
        thickness: withUnit(item.thickness_micron, "μ"),
        grade: valueOrDash(item.grade),
        status: valueOrDash(item.status),
        createdAt: displayDate(item.created_at),
      };
    }

    if (stage === "Winding") {
      return {
        windingNo: valueOrDash(item.winding_no),
        filmWidth: valueOrDash(item.film_width),
        quantityWound: valueOrDash(item.quantity_wound),
        rejectedQuantity: valueOrDash(item.rejected_quantity),
        status: valueOrDash(item.status),
        createdAt: displayDate(item.created_at),
      };
    }

    return {
      sprayNo: valueOrDash(item.spray_no),
      sprayType: valueOrDash(item.spray_type),
      quantity: valueOrDash(item.quantity),
      rejectedQuantity: valueOrDash(item.rejected_quantity),
      status: valueOrDash(item.status),
      createdAt: displayDate(item.created_at),
    };
  });
}

export async function buildReportSnapshot(stage: ReportStage, dateFrom: string, dateTo: string) {
  const source = sourceByStage[stage];
  const query = new URLSearchParams({ select: source.select, order: "created_at.asc" });
  // Report dates are Capco business dates (IST), with an exclusive next-day upper bound.
  query.set("created_at", `gte.${dateFrom}T00:00:00+05:30`);
  query.append("created_at", `lt.${followingDate(dateTo)}T00:00:00+05:30`);
  const rows = await supabaseAdminRequest<Record<string, unknown>[]>(`/rest/v1/${source.table}?${query.toString()}`);
  return formatReportRows(stage, rows);
}
