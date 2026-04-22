"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

type SortDirection = "none" | "asc" | "desc";
type ColumnType = "text" | "number" | "date";
type RowLinkAction = {
  label: string;
  href: string;
  target?: string;
  rel?: string;
};

type TableState = {
  sortIndex: number | null;
  sortDirection: SortDirection;
  dateColumnIndex: number;
  fromDate: string;
  toDate: string;
  columnFilters: Record<number, string>;
};

const TABLE_MARKER = "data-gtc-enhanced";
const TOOLBAR_ATTR = "data-gtc-toolbar-for";
const ROW_MENU_ATTR = "data-gtc-row-menu";
const HEADER_SHELL_ATTR = "data-gtc-header-shell";
const COLUMN_FILTER_ATTR = "data-gtc-column-filter";
const MAX_CATEGORY_FILTER_OPTIONS = 20;

const tableStateMap = new WeakMap<HTMLTableElement, TableState>();

function isPersonDashboardRoute(pathname: string): boolean {
  return pathname.startsWith("/person-a") || pathname.startsWith("/person-b");
}

function getState(table: HTMLTableElement): TableState {
  const existing = tableStateMap.get(table);
  if (existing) {
    return existing;
  }

  const state: TableState = {
    sortIndex: null,
    sortDirection: "none",
    dateColumnIndex: findDateColumnIndex(table),
    fromDate: "",
    toDate: "",
    columnFilters: {},
  };

  tableStateMap.set(table, state);
  return state;
}

function getHeaderCells(table: HTMLTableElement): HTMLTableCellElement[] {
  const headerRow = table.tHead?.rows[0];
  if (!headerRow) {
    return [];
  }
  return Array.from(headerRow.cells);
}

function getColumnText(row: HTMLTableRowElement, columnIndex: number): string {
  return row.cells[columnIndex]?.textContent?.trim() ?? "";
}

function normalizeHeaderLabel(rawLabel: string): string {
  return rawLabel.replace(/\s+/g, " ").trim();
}

function isActionHeaderLabel(label: string): boolean {
  const value = label.toLowerCase();
  return (
    value === ":" ||
    value.includes("action") ||
    value.includes("option") ||
    value === "view" ||
    value.includes("menu")
  );
}

function getHeaderLabel(header: HTMLTableCellElement): string {
  const datasetLabel = header.dataset.gtcHeaderLabel;
  if (datasetLabel) {
    return datasetLabel;
  }

  const label = normalizeHeaderLabel(header.textContent ?? "");
  if (label) {
    header.dataset.gtcHeaderLabel = label;
  }
  return label;
}

function getDistinctColumnValues(table: HTMLTableElement, columnIndex: number): string[] {
  const rows = Array.from(table.tBodies[0]?.rows ?? []);
  const values = new Set<string>();

  rows.forEach((row) => {
    const value = getColumnText(row, columnIndex);
    if (!value) {
      return;
    }
    values.add(value);
  });

  return Array.from(values).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));
}

function findDateColumnIndex(table: HTMLTableElement): number {
  const headers = getHeaderCells(table);
  for (let i = 0; i < headers.length; i += 1) {
    const text = getHeaderLabel(headers[i]).toLowerCase();
    if (text.includes("date") || text.includes("timestamp") || text.includes("created")) {
      return i;
    }
  }
  return -1;
}

function parseDate(rawValue: string): Date | null {
  const value = rawValue.trim();
  if (!value) {
    return null;
  }

  const ddmmyyyy = value.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (ddmmyyyy) {
    const day = Number(ddmmyyyy[1]);
    const month = Number(ddmmyyyy[2]);
    const year = Number(ddmmyyyy[3]);
    if (!Number.isNaN(day) && !Number.isNaN(month) && !Number.isNaN(year)) {
      return new Date(year, month - 1, day);
    }
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function parseNumber(rawValue: string): number | null {
  const value = rawValue.replace(/,/g, "");
  const match = value.match(/-?\d+(\.\d+)?/);
  if (!match) {
    return null;
  }
  const parsed = Number(match[0]);
  if (Number.isNaN(parsed)) {
    return null;
  }
  return parsed;
}

function inferColumnType(table: HTMLTableElement, columnIndex: number): ColumnType {
  const headerCell = getHeaderCells(table)[columnIndex];
  const headerText = (headerCell ? getHeaderLabel(headerCell) : "").toLowerCase();

  if (headerText.includes("date") || headerText.includes("timestamp") || headerText.includes("created")) {
    return "date";
  }

  if (
    headerText.includes("qty") ||
    headerText.includes("quantity") ||
    headerText.includes("weight") ||
    headerText.includes("width") ||
    headerText.includes("micron") ||
    headerText.includes("count") ||
    headerText.includes("rate") ||
    headerText.includes("pressure")
  ) {
    return "number";
  }

  const sampleRow = table.tBodies[0]?.rows[0];
  const sampleText = sampleRow?.cells[columnIndex]?.textContent?.trim() ?? "";

  if (parseDate(sampleText)) {
    return "date";
  }

  if (parseNumber(sampleText) !== null) {
    return "number";
  }

  return "text";
}

function compareRows(
  rowA: HTMLTableRowElement,
  rowB: HTMLTableRowElement,
  index: number,
  type: ColumnType,
  direction: SortDirection,
): number {
  const aText = rowA.cells[index]?.textContent?.trim() ?? "";
  const bText = rowB.cells[index]?.textContent?.trim() ?? "";

  let result = 0;

  if (type === "number") {
    const aValue = parseNumber(aText) ?? Number.NEGATIVE_INFINITY;
    const bValue = parseNumber(bText) ?? Number.NEGATIVE_INFINITY;
    result = aValue - bValue;
  } else if (type === "date") {
    const aDate = parseDate(aText)?.getTime() ?? Number.NEGATIVE_INFINITY;
    const bDate = parseDate(bText)?.getTime() ?? Number.NEGATIVE_INFINITY;
    result = aDate - bDate;
  } else {
    result = aText.localeCompare(bText, undefined, { numeric: true, sensitivity: "base" });
  }

  return direction === "desc" ? -result : result;
}

function exportVisibleRows(table: HTMLTableElement): void {
  const headers = getHeaderCells(table).map((cell) => (cell.textContent ?? "").trim());
  const bodyRows = Array.from(table.tBodies[0]?.rows ?? []);
  const visibleRows = bodyRows.filter((row) => row.style.display !== "none");

  const escapeCsv = (value: string) => `"${value.replace(/"/g, '""')}"`;

  const lines: string[] = [];
  lines.push(headers.map(escapeCsv).join(","));

  visibleRows.forEach((row) => {
    const cells = Array.from(row.cells).map((cell) => (cell.textContent ?? "").trim());
    lines.push(cells.map(escapeCsv).join(","));
  });

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "table-export.csv";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function applyFilters(table: HTMLTableElement): void {
  const state = getState(table);
  const rows = Array.from(table.tBodies[0]?.rows ?? []);

  const fromDate = state.fromDate ? new Date(state.fromDate) : null;
  const toDate = state.toDate ? new Date(state.toDate) : null;

  if (toDate) {
    toDate.setHours(23, 59, 59, 999);
  }

  rows.forEach((row) => {
    const columnFilterMatch = Object.entries(state.columnFilters).every(([columnIndexRaw, selectedValue]) => {
      if (!selectedValue) {
        return true;
      }

      const columnIndex = Number(columnIndexRaw);
      if (Number.isNaN(columnIndex)) {
        return true;
      }

      return getColumnText(row, columnIndex) === selectedValue;
    });

    let dateMatch = true;
    if (state.dateColumnIndex >= 0 && (fromDate || toDate)) {
      const dateText = row.cells[state.dateColumnIndex]?.textContent ?? "";
      const parsedDate = parseDate(dateText);
      if (!parsedDate) {
        dateMatch = false;
      } else {
        if (fromDate && parsedDate < fromDate) {
          dateMatch = false;
        }
        if (toDate && parsedDate > toDate) {
          dateMatch = false;
        }
      }
    }

    row.style.display = columnFilterMatch && dateMatch ? "" : "none";
  });
}

function applySort(table: HTMLTableElement): void {
  const state = getState(table);
  if (state.sortIndex === null || state.sortDirection === "none") {
    return;
  }

  const tbody = table.tBodies[0];
  if (!tbody) {
    return;
  }

  const rows = Array.from(tbody.rows);
  const type = inferColumnType(table, state.sortIndex);

  rows.sort((a, b) => compareRows(a, b, state.sortIndex!, type, state.sortDirection));
  rows.forEach((row) => tbody.appendChild(row));
}

function setSortIndicators(table: HTMLTableElement): void {
  const state = getState(table);
  const headers = getHeaderCells(table);

  headers.forEach((header, index) => {
    const icon = header.querySelector<HTMLElement>("[data-gtc-sort-icon]");
    if (!icon) {
      return;
    }

    if (state.sortIndex !== index || state.sortDirection === "none") {
      icon.textContent = "↕";
      return;
    }

    icon.textContent = state.sortDirection === "asc" ? "↑" : "↓";
  });
}

function getActionColumnIndex(table: HTMLTableElement): number {
  const headers = getHeaderCells(table);
  for (let index = 0; index < headers.length; index += 1) {
    const headerLabel = getHeaderLabel(headers[index]);
    if (isActionHeaderLabel(headerLabel)) {
      return index;
    }
  }
  return -1;
}

function getRowLinkActions(cell: HTMLTableCellElement): RowLinkAction[] {
  const links = Array.from(cell.querySelectorAll<HTMLAnchorElement>("a[href]"));
  return links
    .map((link) => {
      const label = normalizeHeaderLabel(link.textContent ?? "") || "Open";
      return {
        label,
        href: link.href,
        target: link.target || undefined,
        rel: link.rel || undefined,
      };
    })
    .filter((action) => Boolean(action.href));
}

function appendDefaultMockMenuItems(
  table: HTMLTableElement,
  row: HTMLTableRowElement,
  menu: HTMLDivElement,
): void {
  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.className = "gtc-options-item";
  editButton.textContent = "Edit";

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "gtc-options-item gtc-options-delete";
  deleteButton.textContent = "Delete";

  editButton.addEventListener("click", () => {
    menu.classList.remove("is-open");

    const entityId = row.dataset.entityId;
    const editUrlTemplate = table.dataset.editUrl;
    if (entityId && editUrlTemplate) {
      window.location.href = editUrlTemplate.replace("[id]", entityId);
      return;
    }

    const firstCell = row.cells[0];
    const currentValue = firstCell?.textContent?.trim() ?? "";
    const nextValue = window.prompt("Edit row identifier (Mock Mode):", currentValue);
    if (nextValue !== null && firstCell) {
      firstCell.textContent = nextValue.trim();

      row.dispatchEvent(
        new CustomEvent("gtc-mock-edit", {
          bubbles: true,
          detail: { id: entityId, newValue: nextValue.trim() },
        }),
      );
    }
  });

  deleteButton.addEventListener("click", () => {
    menu.classList.remove("is-open");
    const entityId = row.dataset.entityId;
    const rowKey = row.cells[0]?.textContent?.trim() || "row";
    const confirmed = window.confirm(`Delete ${entityId ? `item ${entityId}` : rowKey} (Mock Mode)?`);
    if (!confirmed) {
      return;
    }

    row.dispatchEvent(
      new CustomEvent("gtc-mock-delete", {
        bubbles: true,
        detail: { id: entityId },
      }),
    );

    row.remove();
  });

  menu.appendChild(editButton);
  menu.appendChild(deleteButton);
}

function addOrRefreshOptionsColumn(table: HTMLTableElement): void {
  const headers = getHeaderCells(table);
  if (!headers.length) {
    return;
  }

  let actionColumnIndex = getActionColumnIndex(table);
  if (actionColumnIndex < 0) {
    const lastHeader = headers[headers.length - 1];
    const optionsHeader = document.createElement("th");
    optionsHeader.className = `${lastHeader.className} gtc-header-cell gtc-action-header`;
    optionsHeader.textContent = ":";
    optionsHeader.dataset.gtcHeaderLabel = ":";
    table.tHead?.rows[0].appendChild(optionsHeader);
    actionColumnIndex = headers.length;
  } else {
    const actionHeader = getHeaderCells(table)[actionColumnIndex];
    actionHeader.dataset.gtcHeaderLabel = ":";
    actionHeader.classList.add("gtc-action-header");
    actionHeader.textContent = ":";
  }

  const bodyRows = Array.from(table.tBodies[0]?.rows ?? []);
  bodyRows.forEach((row) => {
    let cell = row.cells[actionColumnIndex];
    if (!cell) {
      const templateCell = row.cells[row.cells.length - 1];
      cell = document.createElement("td");
      cell.className = `${templateCell?.className ?? ""} gtc-options-cell`;
      row.appendChild(cell);
    }

    if (cell.querySelector(`[${ROW_MENU_ATTR}]`)) {
      return;
    }

    const rowLinkActions = getRowLinkActions(cell);
    cell.textContent = "";
    cell.classList.add("gtc-options-cell");

    const wrapper = document.createElement("div");
    wrapper.className = "gtc-options-wrap";
    wrapper.setAttribute(ROW_MENU_ATTR, "true");

    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "gtc-options-trigger";
    trigger.textContent = ":";

    const menu = document.createElement("div");
    menu.className = "gtc-options-menu";

    trigger.addEventListener("click", (event) => {
      event.stopPropagation();
      document.querySelectorAll<HTMLElement>(".gtc-options-menu.is-open").forEach((openMenu) => {
        if (openMenu !== menu) {
          openMenu.classList.remove("is-open");
        }
      });
      menu.classList.toggle("is-open");
    });

    if (rowLinkActions.length > 0) {
      rowLinkActions.forEach((action) => {
        const linkItem = document.createElement("a");
        linkItem.className = "gtc-options-item";
        linkItem.href = action.href;
        linkItem.textContent = action.label;
        if (action.target) {
          linkItem.target = action.target;
        }
        if (action.rel) {
          linkItem.rel = action.rel;
        }
        menu.appendChild(linkItem);
      });
    } else {
      appendDefaultMockMenuItems(table, row, menu);
    }

    wrapper.appendChild(trigger);
    wrapper.appendChild(menu);
    cell.appendChild(wrapper);
  });
}

function refreshColumnFilterOptions(
  table: HTMLTableElement,
  columnIndex: number,
  state: TableState,
  shell: HTMLElement,
): void {
  const values = getDistinctColumnValues(table, columnIndex);
  const shouldRenderFilter = values.length > 1 && values.length <= MAX_CATEGORY_FILTER_OPTIONS;
  const existingSelect = shell.querySelector<HTMLSelectElement>(`[${COLUMN_FILTER_ATTR}="${columnIndex}"]`);

  if (!shouldRenderFilter) {
    if (existingSelect) {
      existingSelect.remove();
    }
    delete state.columnFilters[columnIndex];
    return;
  }

  const select = existingSelect ?? document.createElement("select");
  if (!existingSelect) {
    select.className = "gtc-column-filter";
    select.setAttribute(COLUMN_FILTER_ATTR, String(columnIndex));
    select.addEventListener("change", () => {
      if (select.value) {
        state.columnFilters[columnIndex] = select.value;
      } else {
        delete state.columnFilters[columnIndex];
      }
      applyFilters(table);
    });
    shell.appendChild(select);
  }

  const previousValue = state.columnFilters[columnIndex] ?? "";
  const options = ["", ...values];

  select.innerHTML = "";
  options.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value || "All";
    select.appendChild(option);
  });

  if (options.includes(previousValue)) {
    select.value = previousValue;
  } else {
    select.value = "";
    delete state.columnFilters[columnIndex];
  }
}

function attachSorting(table: HTMLTableElement): void {
  const headers = getHeaderCells(table);
  const state = getState(table);

  headers.forEach((header, index) => {
    const label = getHeaderLabel(header);
    if (!label) {
      return;
    }

    if (isActionHeaderLabel(label)) {
      header.classList.add("gtc-action-header");
      header.textContent = ":";
      delete state.columnFilters[index];
      return;
    }

    let shell = header.querySelector<HTMLElement>(`[${HEADER_SHELL_ATTR}]`);
    if (!shell) {
      shell = document.createElement("div");
      shell.className = "gtc-header-control";
      shell.setAttribute(HEADER_SHELL_ATTR, String(index));

      const content = document.createElement("button");
      content.type = "button";
      content.className = "gtc-sort-button";

      const textSpan = document.createElement("span");
      textSpan.textContent = label;

      const icon = document.createElement("span");
      icon.setAttribute("data-gtc-sort-icon", "true");
      icon.className = "gtc-sort-icon";
      icon.textContent = "↕";

      content.appendChild(textSpan);
      content.appendChild(icon);
      shell.appendChild(content);

      header.textContent = "";
      header.appendChild(shell);

      content.addEventListener("click", () => {
        if (state.sortIndex !== index) {
          state.sortIndex = index;
          state.sortDirection = "asc";
        } else if (state.sortDirection === "asc") {
          state.sortDirection = "desc";
        } else if (state.sortDirection === "desc") {
          state.sortDirection = "none";
        } else {
          state.sortDirection = "asc";
        }

        if (state.sortDirection === "none") {
          state.sortIndex = null;
        }

        applySort(table);
        applyFilters(table);
        setSortIndicators(table);
      });
    }

    refreshColumnFilterOptions(table, index, state, shell);
  });
}

function ensureToolbar(table: HTMLTableElement): void {
  const tableId = table.dataset.gtcTableId ?? `gtc-${Math.random().toString(36).slice(2, 10)}`;
  table.dataset.gtcTableId = tableId;

  const wrapper = table.parentElement;
  if (!wrapper) {
    return;
  }

  const host = wrapper.parentElement ?? wrapper;
  const existing = host.querySelector<HTMLElement>(`[${TOOLBAR_ATTR}="${tableId}"]`);
  if (existing) {
    return;
  }

  const state = getState(table);
  const toolbar = document.createElement("div");
  toolbar.className = "gtc-toolbar";
  toolbar.setAttribute(TOOLBAR_ATTR, tableId);

  const left = document.createElement("div");
  left.className = "gtc-toolbar-left";

  const fromLabel = document.createElement("label");
  fromLabel.className = "gtc-date-wrap";
  fromLabel.textContent = "From";

  const fromInput = document.createElement("input");
  fromInput.type = "date";
  fromInput.className = "gtc-date-input";

  const toLabel = document.createElement("label");
  toLabel.className = "gtc-date-wrap";
  toLabel.textContent = "To";

  const toInput = document.createElement("input");
  toInput.type = "date";
  toInput.className = "gtc-date-input";

  const clearDatesButton = document.createElement("button");
  clearDatesButton.type = "button";
  clearDatesButton.className = "gtc-toolbar-button";
  clearDatesButton.textContent = "Clear";

  if (state.dateColumnIndex < 0) {
    fromInput.disabled = true;
    toInput.disabled = true;
    fromInput.title = "No date column detected";
    toInput.title = "No date column detected";
  }

  fromInput.addEventListener("change", () => {
    state.fromDate = fromInput.value;
    if (state.toDate && state.fromDate && state.fromDate > state.toDate) {
      window.alert("From date cannot be later than To date.");
      state.fromDate = "";
      fromInput.value = "";
    }
    applyFilters(table);
  });

  toInput.addEventListener("change", () => {
    state.toDate = toInput.value;
    if (state.toDate && state.fromDate && state.fromDate > state.toDate) {
      window.alert("To date cannot be earlier than From date.");
      state.toDate = "";
      toInput.value = "";
    }
    applyFilters(table);
  });

  clearDatesButton.addEventListener("click", () => {
    state.fromDate = "";
    state.toDate = "";
    fromInput.value = "";
    toInput.value = "";
    applyFilters(table);
  });

  fromLabel.appendChild(fromInput);
  toLabel.appendChild(toInput);

  left.appendChild(fromLabel);
  left.appendChild(toLabel);
  left.appendChild(clearDatesButton);

  const right = document.createElement("div");
  right.className = "gtc-toolbar-right";

  const exportButton = document.createElement("button");
  exportButton.type = "button";
  exportButton.className = "gtc-toolbar-button gtc-toolbar-export";
  exportButton.textContent = "Export";
  exportButton.addEventListener("click", () => exportVisibleRows(table));

  right.appendChild(exportButton);

  toolbar.appendChild(left);
  toolbar.appendChild(right);

  host.insertBefore(toolbar, wrapper);
}

function enhanceTable(table: HTMLTableElement): void {
  ensureToolbar(table);
  addOrRefreshOptionsColumn(table);
  attachSorting(table);
  setSortIndicators(table);

  table.setAttribute(TABLE_MARKER, "true");
}

function processAllTables(): void {
  const tables = Array.from(document.querySelectorAll<HTMLTableElement>("table"));
  tables.forEach((table) => {
    const hasBody = table.tBodies.length > 0;
    const hasHeaders = getHeaderCells(table).length > 0;
    if (!hasBody || !hasHeaders) {
      return;
    }

    enhanceTable(table);
    applySort(table);
    applyFilters(table);
    setSortIndicators(table);
  });
}

function setupGlobalMenuCloser(): () => void {
  const closeMenus = () => {
    document.querySelectorAll<HTMLElement>(".gtc-options-menu.is-open").forEach((menu) => {
      menu.classList.remove("is-open");
    });
  };

  document.addEventListener("click", closeMenus);
  return () => document.removeEventListener("click", closeMenus);
}

export function GlobalTableEnhancer() {
  const pathname = usePathname();

  useEffect(() => {
    if (!isPersonDashboardRoute(pathname)) {
      return;
    }

    processAllTables();

    const cleanupClose = setupGlobalMenuCloser();

    let rafId = 0;
    const observer = new MutationObserver(() => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      rafId = requestAnimationFrame(() => {
        processAllTables();
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      cleanupClose();
      observer.disconnect();
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [pathname]);

  return null;
}
