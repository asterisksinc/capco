# Table Controls Rollout Plan (Capco) — **Revised (Strict + Context-Aware)**

## Goal

Implement a **context-aware, accurate, and per-table controlled** interaction system across all table-based screens in `capco/capco`.

This is NOT a generic/global enhancement.
Every table must be handled **individually based on its data type and purpose**.

---

## ❗ Critical Corrections (Must Follow)

### 1. No Blind Sorting

* ❌ Do NOT attach sort to every column automatically.
* ✅ Sorting should ONLY exist where it makes logical sense.

| Column Type          | Sorting Allowed | Behavior                    |
| -------------------- | --------------- | --------------------------- |
| Text (names, IDs)    | ✅ Yes           | Alphabetical                |
| Numbers (qty, price) | ✅ Yes           | Numeric                     |
| Dates                | ✅ Yes           | Chronological               |
| Status / Enum        | ⚠️ Conditional  | Only if mapped order exists |
| Boolean (Yes/No)     | ❌ Avoid         | Use filter instead          |

---

### 2. Status Columns ≠ Sort Columns

* Columns like:

  * `status` (completed, pending, dispatched)
  * `approval` (yes/no)
* ❌ Should NOT default to sort

Instead:

* ✅ Provide **filter dropdown**
* ✅ Optional: define **custom order mapping** ONLY if meaningful

Example:

```ts
const statusOrder = {
  pending: 1,
  in_progress: 2,
  completed: 3
};
```

---

### 3. Copilot Execution Rule (Very Important)

> ⚠️ DO NOT modify all tables globally.
> ⚠️ DO NOT apply one logic to every table.

### ✅ Correct Approach:

* Work **one table at a time**
* Understand:

  * Data structure
  * Column types
  * Existing UI
* Then apply controls **selectively**

---

## Implementation Status (Current Problem)

From existing implementation :

* Global enhancer applied blindly
* Sort added to ALL headers ❌
* No distinction between:

  * status vs text
  * boolean vs numeric
* Result:

  * Poor UX
  * Misleading controls

---

## New Implementation Strategy

### 🔁 Remove Global Blind Enhancer Behavior

* Keep structure if needed
* BUT:

  * Disable automatic column enhancements
  * Move logic to **config-driven per-table control**

---

## 🧠 Per-Table Configuration System (MANDATORY)

Each table MUST define its behavior:

```ts
const tableConfig = {
  columns: [
    { key: "name", type: "text", sortable: true },
    { key: "quantity", type: "number", sortable: true },
    { key: "createdAt", type: "date", sortable: true },
    
    // Status example
    { 
      key: "status",
      type: "enum",
      sortable: false,
      filter: "dropdown",
      options: ["pending", "completed", "dispatched"]
    },

    // Boolean example
    {
      key: "approved",
      type: "boolean",
      sortable: false,
      filter: "toggle"
    }
  ]
};
```

---

## Functional Requirements (Updated)

### 1) Row Options Menu ✅ (No Change)

* Last column: `Options`
* Actions:

  * Edit
  * Delete (with confirmation)

---

### 2) Toolbar (Top-right)

* `Export`

BUT:

* Filter must be **context-aware per table**
* No generic filter UI

---

### 3) Sorting (STRICT RULES)

Only apply if:

* Column has:

  ```ts
  sortable: true
  ```

#### Behavior:

* Click cycle:

  * ASC → DESC → NONE
* Visual:

  * Arrow indicator ONLY if sortable

---

### 4) Replace Sorting with Filtering (Important UX Fix)

| Column Type | Replace Sort With      |
| ----------- | ---------------------- |
| Status      | Dropdown filter        |
| Boolean     | Toggle / Yes-No filter |
| Category    | Multi-select filter    |

---

### 5) Date Range Filter

* Keep as-is (valid feature)
* Applies ONLY if table has date field
(this comes right to any search bar in UI it has from data and to date )
---

## Technical Design (Revised)

### ❌ Remove Responsibility From:

* `GlobalTableEnhancer` (logic-heavy behavior)

### ✅ Move To:

* Config-driven system per table

---

### Components (Updated Role)

#### `SortableHeader.tsx`

* Should:

  * Render ONLY if `sortable === true`
* Otherwise:

  * Render plain label

---

#### `TableToolbar.tsx`

* Accept dynamic filters based on config
* NOT static UI

---

#### `useTableControls.ts`

* Must respect:

  * `tableConfig`
* Should NOT assume:

  * all columns sortable
  * all filters same

---

## Rollout Strategy (STRICT ORDER)

### Phase 0: Fix Foundation

* Remove blind sorting logic
* Introduce `tableConfig`

---

### Phase 1: Pilot (ONE TABLE ONLY)

* `productionhead/productorders/page.tsx`

Focus:

* Correct sorting
* Proper filters for status
* No unnecessary controls

---

### Phase 2: Gradual Rollout

Apply ONLY after validation:

* One table → test → move next
* DO NOT batch update all tables

---

### Phase 3: Shared Component Refactor

* Build reusable logic
* BUT keep config flexibility

---

## File-by-File Execution Rule

For EACH file:

1. Identify columns
2. Classify types
3. Define config
4. Apply controls

---

## Behavior Rules (Final)

* ❌ No universal sorting

* ❌ No UI without meaning

* ❌ No global assumptions

* ✅ Every control must justify its existence

* ✅ Status = filter first, sort optional

* ✅ Boolean = filter only

* ✅ UI must match data semantics

---

## Testing Focus (Updated)

### Must Validate:

* Status columns → filter works, no sort shown
* Boolean → no sort present
* Numeric/date → sorting accurate
* No unnecessary icons

---

## Definition of Done (Revised)

✔ No meaningless sort buttons
✔ Status handled correctly (filter-based)
✔ Each table behaves independently
✔ UX feels intentional, not auto-generated
✔ Copilot logic is controlled, not generic

---

## Final Instruction to Copilot

> Work on ONE table at a time.
> Understand the data.
> Apply only relevant controls.
> Do NOT generalize across all tables.
> Do NOT add features blindly.

---

This version fixes the core issue:
👉 Your system becomes **intentional, not auto-generated garbage UI**
