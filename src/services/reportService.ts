import { getAccessToken } from "./supabaseClient";

export type ReportDataRow = Record<string, string | number | boolean | null>;

export type ReportRow = {
  id: string;
  databaseId: string;
  stage: string;
  fromDate: string;
  toDate: string;
  timestamp: string;
  rowCount: number;
  dataSnapshot?: ReportDataRow[];
};

async function reportRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getAccessToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body) headers.set("Content-Type", "application/json");
  const response = await fetch(path, { ...init, headers });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message || "Report request failed");
  return data as T;
}

export const reportService = {
  async list() {
    const result = await reportRequest<{ reports: ReportRow[] }>("/api/reports");
    return result.reports;
  },

  async preview(stage: string, dateFrom: string, dateTo: string) {
    const result = await reportRequest<{ rows: ReportDataRow[] }>("/api/reports/preview", {
      method: "POST",
      body: JSON.stringify({ stage, dateFrom, dateTo }),
    });
    return result.rows;
  },

  async generate(stage: string, dateFrom: string, dateTo: string) {
    const result = await reportRequest<{ report: ReportRow }>("/api/reports", {
      method: "POST",
      body: JSON.stringify({ stage, dateFrom, dateTo }),
    });
    return result.report;
  },

  async get(databaseId: string) {
    const result = await reportRequest<{ report: ReportRow }>(`/api/reports/${encodeURIComponent(databaseId)}`);
    return result.report;
  },

  async download(databaseId: string, fallbackName: string) {
    const token = getAccessToken();
    const response = await fetch(`/api/reports/${encodeURIComponent(databaseId)}/download`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.message || "Failed to download report");
    }

    const disposition = response.headers.get("Content-Disposition") || "";
    const headerName = disposition.match(/filename="([^"]+)"/)?.[1];
    const blobUrl = URL.createObjectURL(await response.blob());
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = headerName || `${fallbackName}.xlsx`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(blobUrl);
  },
};
