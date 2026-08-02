import { NextResponse } from "next/server";
import { buildReportSnapshot, isIsoDate, isReportStage } from "@/lib/server/reportData";
import {
  getProfileFromBearer,
  missingSupabaseAdminResponse,
  supabaseAdminConfig,
} from "@/lib/server/supabaseAdmin";

export async function POST(request: Request) {
  if (!supabaseAdminConfig.url || !supabaseAdminConfig.serviceRoleKey) return missingSupabaseAdminResponse();

  const profile = await getProfileFromBearer(request);
  if (profile?.roles?.code !== "super_admin") {
    return NextResponse.json({ ok: false, message: "Super Admin access required" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!isReportStage(body?.stage) || !isIsoDate(body?.dateFrom) || !isIsoDate(body?.dateTo)) {
    return NextResponse.json({ ok: false, message: "A valid stage, dateFrom and dateTo are required" }, { status: 400 });
  }
  if (body.dateFrom > body.dateTo) {
    return NextResponse.json({ ok: false, message: "dateFrom cannot be after dateTo" }, { status: 400 });
  }

  try {
    const rows = await buildReportSnapshot(body.stage, body.dateFrom, body.dateTo);
    return NextResponse.json({ ok: true, rows, rowCount: rows.length });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Failed to preview report" },
      { status: 500 },
    );
  }
}

