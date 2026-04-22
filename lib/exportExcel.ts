import * as XLSX from "xlsx";

export function exportToExcel<T extends Record<string, unknown>>(
  data: T[],
  filename: string,
  sheetName: string = "Sheet1"
) {
  if (data.length === 0) {
    alert("No data to export");
    return;
  }

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  const colWidths = Object.keys(data[0] || {}).map((key) => ({
    wch: Math.max(key.length, 15),
  }));
  worksheet["!cols"] = colWidths;

  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

export function convertDataToExportFormat<T extends Record<string, unknown>>(
  data: T[],
  excludeKeys: string[] = []
): Record<string, string>[] {
  return data.map((row) => {
    const filtered: Record<string, string> = {};
    Object.entries(row).forEach(([key, value]) => {
      if (!excludeKeys.includes(key) && key !== "options" && key !== "action") {
        filtered[key] = String(value ?? "");
      }
    });
    return filtered;
  });
}