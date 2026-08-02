import * as XLSX from "xlsx";
import { NextResponse } from "next/server";
import {
  getProfileFromBearer,
  missingSupabaseAdminResponse,
  supabaseAdminConfig,
  supabaseAdminRequest,
} from "@/lib/server/supabaseAdmin";

type DownloadReport = {
  report_no: string;
  stage: string;
  data_snapshot: Record<string, unknown>[];
};

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!supabaseAdminConfig.url || !supabaseAdminConfig.serviceRoleKey) return missingSupabaseAdminResponse();

  const profile = await getProfileFromBearer(request);
  if (profile?.roles?.code !== "super_admin") {
    return NextResponse.json({ ok: false, message: "Super Admin access required" }, { status: 403 });
  }

  const { id } = await context.params;
  try {
    const rows = await supabaseAdminRequest<DownloadReport[]>(
      `/rest/v1/reports?select=report_no,stage,data_snapshot&id=eq.${encodeURIComponent(id)}&limit=1`,
    );
    const report = rows[0];
    if (!report) return NextResponse.json({ ok: false, message: "Report not found" }, { status: 404 });

    const worksheet = XLSX.utils.json_to_sheet(report.data_snapshot);
    const first = report.data_snapshot[0] ?? {};
    worksheet["!cols"] = Object.keys(first).map((key) => ({ wch: Math.max(key.length, 15) }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, report.stage.slice(0, 31));
    const file = XLSX.write(workbook, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
    const fileName = `${report.report_no}-${report.stage.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase()}.xlsx`;

    return new Response(file, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Failed to download report" },
      { status: 500 },
    );
  }
}
