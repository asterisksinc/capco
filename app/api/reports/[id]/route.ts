import { NextResponse } from "next/server";
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
  data_snapshot: Record<string, unknown>[];
  row_count: number;
  created_at: string;
};

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!supabaseAdminConfig.url || !supabaseAdminConfig.serviceRoleKey) return missingSupabaseAdminResponse();

  const profile = await getProfileFromBearer(request);
  if (profile?.roles?.code !== "super_admin") {
    return NextResponse.json({ ok: false, message: "Super Admin access required" }, { status: 403 });
  }

  const { id } = await context.params;
  try {
    const rows = await supabaseAdminRequest<ReportRecord[]>(
      `/rest/v1/reports?select=*&id=eq.${encodeURIComponent(id)}&limit=1`,
    );
    const row = rows[0];
    if (!row) return NextResponse.json({ ok: false, message: "Report not found" }, { status: 404 });

    return NextResponse.json({
      ok: true,
      report: {
        id: row.report_no,
        databaseId: row.id,
        stage: row.stage,
        fromDate: row.date_from,
        toDate: row.date_to,
        timestamp: row.created_at,
        rowCount: row.row_count,
        dataSnapshot: row.data_snapshot,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Failed to load report" },
      { status: 500 },
    );
  }
}

