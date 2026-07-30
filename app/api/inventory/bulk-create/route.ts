import { NextResponse } from "next/server";
import { getBearerToken, supabaseAdminConfig } from "@/lib/server/supabaseAdmin";

const MAX_BATCH_SIZE = 500;

type BulkCreateBody = {
  batches?: unknown;
  micron?: unknown;
  supplier?: unknown;
};

type ValidationIssue = {
  row?: number;
  field: string;
  message: string;
};

type MaterialBatch = {
  roll_no: string;
  width_m: number;
  net_weight_kg: number;
  gross_weight_kg: number;
  micron: number;
  supplier: string;
  package_no?: string;
  core_inch?: number;
  temperature_c?: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readNumber(
  value: unknown,
  row: number | undefined,
  field: string,
  issues: ValidationIssue[],
  options: { required?: boolean; positive?: boolean } = {},
) {
  if (value === undefined || value === null || value === "") {
    if (options.required) issues.push({ row, field, message: `${field} is required` });
    return undefined;
  }

  if (typeof value !== "number" || !Number.isFinite(value)) {
    issues.push({ row, field, message: `${field} must be a finite number` });
    return undefined;
  }

  if (options.positive ? value <= 0 : value < 0) {
    issues.push({
      row,
      field,
      message: `${field} must be ${options.positive ? "greater than zero" : "zero or greater"}`,
    });
    return undefined;
  }

  return value;
}

function validateRequest(body: BulkCreateBody | null) {
  const issues: ValidationIssue[] = [];
  if (!body || !Array.isArray(body.batches)) {
    return {
      issues: [{ field: "batches", message: "batches must be an array" }],
      batches: [] as MaterialBatch[],
    };
  }

  if (body.batches.length < 1 || body.batches.length > MAX_BATCH_SIZE) {
    issues.push({
      field: "batches",
      message: `Provide between 1 and ${MAX_BATCH_SIZE} material batches`,
    });
  }

  const defaultMicron = readNumber(body.micron, undefined, "micron", issues, {
    positive: true,
  });
  const defaultSupplier =
    typeof body.supplier === "string" && body.supplier.trim()
      ? body.supplier.trim()
      : undefined;
  if (
    body.supplier !== undefined &&
    (typeof body.supplier !== "string" || !body.supplier.trim())
  ) {
    issues.push({ field: "supplier", message: "supplier must be a non-empty string" });
  }

  const seenRollNumbers = new Map<string, number>();
  const batches: MaterialBatch[] = [];

  body.batches.forEach((value, index) => {
    const row = index + 1;
    if (!isRecord(value)) {
      issues.push({ row, field: "batch", message: "Each batch must be an object" });
      return;
    }

    const rollNo = typeof value.roll_no === "string" ? value.roll_no.trim() : "";
    if (!rollNo) {
      issues.push({ row, field: "roll_no", message: "roll_no is required" });
    } else if (seenRollNumbers.has(rollNo)) {
      issues.push({
        row,
        field: "roll_no",
        message: `roll_no duplicates row ${seenRollNumbers.get(rollNo)}`,
      });
    } else {
      seenRollNumbers.set(rollNo, row);
    }

    const width = readNumber(value.width_m, row, "width_m", issues, {
      required: true,
      positive: true,
    });
    const netWeight = readNumber(value.net_weight_kg, row, "net_weight_kg", issues, {
      required: true,
      positive: true,
    });
    const grossWeight = readNumber(
      value.gross_weight_kg,
      row,
      "gross_weight_kg",
      issues,
      { required: true, positive: true },
    );
    if (
      netWeight !== undefined &&
      grossWeight !== undefined &&
      grossWeight < netWeight
    ) {
      issues.push({
        row,
        field: "gross_weight_kg",
        message: "gross_weight_kg must be greater than or equal to net_weight_kg",
      });
    }

    const rowMicron = readNumber(value.micron, row, "micron", issues, {
      positive: true,
    });
    const micron = rowMicron ?? defaultMicron;
    if (micron === undefined) {
      issues.push({
        row,
        field: "micron",
        message: "micron is required on the row or at the request level",
      });
    }

    const rowSupplier =
      typeof value.supplier === "string" && value.supplier.trim()
        ? value.supplier.trim()
        : undefined;
    if (
      value.supplier !== undefined &&
      (typeof value.supplier !== "string" || !value.supplier.trim())
    ) {
      issues.push({ row, field: "supplier", message: "supplier must be a non-empty string" });
    }
    const supplier = rowSupplier ?? defaultSupplier;
    if (!supplier) {
      issues.push({
        row,
        field: "supplier",
        message: "supplier is required on the row or at the request level",
      });
    }

    const packageNo =
      value.package_no === undefined || value.package_no === null
        ? undefined
        : String(value.package_no).trim();
    const coreInch = readNumber(value.core_inch, row, "core_inch", issues);
    const temperature = readNumber(value.temperature_c, row, "temperature_c", issues);

    if (
      rollNo &&
      width !== undefined &&
      netWeight !== undefined &&
      grossWeight !== undefined &&
      micron !== undefined &&
      supplier
    ) {
      batches.push({
        roll_no: rollNo,
        width_m: width,
        net_weight_kg: netWeight,
        gross_weight_kg: grossWeight,
        micron,
        supplier,
        ...(packageNo ? { package_no: packageNo } : {}),
        ...(coreInch !== undefined ? { core_inch: coreInch } : {}),
        ...(temperature !== undefined ? { temperature_c: temperature } : {}),
      });
    }
  });

  return { issues, batches };
}

export async function POST(request: Request) {
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

  const body = (await request.json().catch(() => null)) as BulkCreateBody | null;
  const { issues, batches } = validateRequest(body);
  if (issues.length > 0) {
    return NextResponse.json(
      { ok: false, message: "Material batch validation failed", issues },
      { status: 422 },
    );
  }

  const response = await fetch(
    `${supabaseAdminConfig.url.replace(/\/$/, "")}/rest/v1/rpc/admin_bulk_create_inventory`,
    {
      method: "POST",
      headers: {
        apikey: supabaseAdminConfig.anonKey,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_batches: batches }),
    },
  );

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const status =
      data?.code === "42501"
        ? 403
        : data?.code === "23505"
          ? 409
          : response.status;
    return NextResponse.json(
      {
        ok: false,
        message: data?.message || response.statusText,
        details: data,
      },
      { status },
    );
  }

  const inventory = Array.isArray(data) ? data : [];
  return NextResponse.json(
    {
      ok: true,
      createdCount: inventory.length,
      inventory,
    },
    { status: 201 },
  );
}
