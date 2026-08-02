import { NextResponse } from "next/server";
import { buildReportSnapshot, isIsoDate, isReportStage } from "@/lib/server/reportData";
import {
  getProfileFromBearer,
  missingSupabaseAdminResponse,
  supabaseAdminConfig,
  supabaseAdminRequest,
} from "@/lib/server/supabaseAdmin";

type ReportRecord = {
  id: string;
  report_no: string;
  stage: string;
  date_from: string;
  date_to: string;
  data_snapshot?: Record<string, unknown>[];
  row_count: number;
  generated_by: string;
  created_at: string;
};

function toResponse(row: ReportRecord, includeSnapshot = false) {
  return {
    id: row.report_no,
    databaseId: row.id,
    stage: row.stage,
    fromDate: row.date_from,
    toDate: row.date_to,
    timestamp: row.created_at,
    rowCount: row.row_count,
    ...(includeSnapshot ? { dataSnapshot: row.data_snapshot ?? [] } : {}),
  };
}

async function requireSuperAdmin(request: Request) {
  const profile = await getProfileFromBearer(request);
  return profile?.roles?.code === "super_admin" ? profile : null;
}

export async function GET(request: Request) {
  if (!supabaseAdminConfig.url || !supabaseAdminConfig.serviceRoleKey) return missingSupabaseAdminResponse();

  const profile = await requireSuperAdmin(request);
  if (!profile) return NextResponse.json({ ok: false, message: "Super Admin access required" }, { status: 403 });

  try {
    const rows = await supabaseAdminRequest<ReportRecord[]>(
      "/rest/v1/reports?select=id,report_no,stage,date_from,date_to,row_count,generated_by,created_at&order=created_at.desc",
    );
    return NextResponse.json({ ok: true, reports: rows.map((row) => toResponse(row)) });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Failed to load reports" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  if (!supabaseAdminConfig.url || !supabaseAdminConfig.serviceRoleKey) return missingSupabaseAdminResponse();

  const profile = await requireSuperAdmin(request);
  if (!profile) return NextResponse.json({ ok: false, message: "Super Admin access required" }, { status: 403 });

  const body = await request.json().catch(() => null);
  const stage = body?.stage;
  const dateFrom = body?.dateFrom;
  const dateTo = body?.dateTo;

  if (!isReportStage(stage) || !isIsoDate(dateFrom) || !isIsoDate(dateTo)) {
    return NextResponse.json({ ok: false, message: "A valid stage, dateFrom and dateTo are required" }, { status: 400 });
  }
  if (dateFrom > dateTo) {
    return NextResponse.json({ ok: false, message: "dateFrom cannot be after dateTo" }, { status: 400 });
  }

  try {
    const snapshot = await buildReportSnapshot(stage, dateFrom, dateTo);
    if (snapshot.length === 0) {
      return NextResponse.json({ ok: false, message: "No data found for this period" }, { status: 422 });
    }

    const rows = await supabaseAdminRequest<ReportRecord[]>("/rest/v1/reports", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        stage,
        date_from: dateFrom,
        date_to: dateTo,
        data_snapshot: snapshot,
        row_count: snapshot.length,
        generated_by: profile.id,
      }),
    });

    return NextResponse.json({ ok: true, report: toResponse(rows[0], true) }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Failed to generate report" },
      { status: 500 },
    );
  }
}

