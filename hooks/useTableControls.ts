"use client";

import { useState, useMemo } from "react";

export type ColumnType = "text" | "number" | "date" | "enum" | "boolean";

export type ColumnConfig<T> = {
  key: keyof T | "options";
  label: string;
  type: ColumnType;
  sortable: boolean;
  filter?: "dropdown" | "toggle" | "multi-select";
  options?: string[]; // for enum dropdown filters
};

export type TableConfig<T> = {
  columns: ColumnConfig<T>[];
};

export function useTableControls<T extends Record<string, unknown>>({
  data,
  config,
}: {
  data: T[];
  config: TableConfig<T>;
}) {
  const [sortConfig, setSortConfig] = useState<{
    key: keyof T;
    direction: "asc" | "desc";
  } | null>(null);

  const [filters, setFilters] = useState<Record<string, string>>({});
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({
    from: "",
    to: "",
  });

  const handleSort = (key: keyof T) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key) {
      if (sortConfig.direction === "asc") direction = "desc";
      else if (sortConfig.direction === "desc") {
        setSortConfig(null);
        return;
      }
    }
    setSortConfig({ key, direction });
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => {
      if (!value) {
        const newFilters = { ...prev };
        delete newFilters[key];
        return newFilters;
      }
      return { ...prev, [key]: value };
    });
  };

  const parseDate = (val: string) => {
    // Assuming format "DD/MM/YYYY:HH:MM:SS" or standard ISO
    const parts = val.split(/[:/ ]/);
    if (parts.length >= 3 && val.includes("/")) {
      const [day, month, year] = parts;
      return new Date(Number(year), Number(month) - 1, Number(day)).getTime();
    }
    const d = new Date(val);
    return isNaN(d.getTime()) ? 0 : d.getTime();
  };

  const filteredAndSortedData = useMemo(() => {
    let processed = [...data];

    // Filters
    processed = processed.filter((row) => {
      let matches = true;

      // Dropdown filters
      for (const [fKey, fValue] of Object.entries(filters)) {
        if (String(row[fKey]) !== fValue) {
          matches = false;
        }
      }

      // Date Range (if there's a date column)
      if (dateRange.from || dateRange.to) {
        const dateColumn = config.columns.find((c) => c.type === "date");
        if (dateColumn && dateColumn.key in row) {
          const rowDateStr = String(row[dateColumn.key]);
          const rowTime = parseDate(rowDateStr);

          if (dateRange.from) {
            const fromTime = new Date(dateRange.from).getTime();
            if (rowTime < fromTime) matches = false;
          }
          if (dateRange.to) {
            const toDateObj = new Date(dateRange.to);
            toDateObj.setHours(23, 59, 59, 999);
            const toTime = toDateObj.getTime();
            if (rowTime > toTime) matches = false;
          }
        }
      }

      return matches;
    });

    // Sorting
    if (sortConfig) {
      const colConfig = config.columns.find((c) => c.key === sortConfig.key);
      const isDate = colConfig?.type === "date";
      const isNumber = colConfig?.type === "number";

      processed.sort((a, b) => {
        const valA = a[sortConfig.key];
        const valB = b[sortConfig.key];

        if (isNumber) {
          const numA = Number(String(valA).replace(/,/g, ""));
          const numB = Number(String(valB).replace(/,/g, ""));
          return sortConfig.direction === "asc" ? numA - numB : numB - numA;
        }
        if (isDate) {
          const timeA = parseDate(String(valA));
          const timeB = parseDate(String(valB));
          return sortConfig.direction === "asc" ? timeA - timeB : timeB - timeA;
        }

        const strA = String(valA).toLowerCase();
        const strB = String(valB).toLowerCase();
        if (strA < strB) return sortConfig.direction === "asc" ? -1 : 1;
        if (strA > strB) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return processed;
  }, [data, config, sortConfig, filters, dateRange]);

  return {
    processedData: filteredAndSortedData,
    sortConfig,
    handleSort,
    filters,
    handleFilterChange,
    dateRange,
    setDateRange,
  };
}
