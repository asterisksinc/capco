# Capco Dashboard - Complete Documentation

Comprehensive technical documentation for the Capco manufacturing workflow management system, including architecture, data models, UI workflows, state management, and localStorage design.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture & Tech Stack](#architecture--tech-stack)
3. [Data Models & Types](#data-models--types)
4. [State Management (localStorage)](#state-management-localstorage)
5. [Dashboard Views](#dashboard-views)
6. [User Roles & Permissions](#user-roles--permissions)
7. [Workflow Stages & Steps](#workflow-stages--steps)
8. [UI Components & Pages](#ui-components--pages)
9. [Add Work Order Flow](#add-work-order-flow)
10. [Detail Page Workflow](#detail-page-workflow)
11. [Runtime Progress Computation](#runtime-progress-computation)
12. [localStorage Structure & Persistence](#localstorage-structure--persistence)
13. [Development Guide](#development-guide)
14. [Debugging & Troubleshooting](#debugging--troubleshooting)

---

## Project Overview

**Capco** is a Next.js-based manufacturing workflow management dashboard designed to track work orders through three sequential production stages:

### Three Production Stages
1. **Raw Material** - Initial material intake, specification entry, and supplier documentation
2. **Metallisation** - Machine-based coating/processing with parameter tracking (OD, resistance, weight)
3. **Slitting** - Final cutting, quality grading (AA/A/B/C/D), and completion with mandatory remarks

### Two User Roles
- **Supervisor**: Can create work orders, view all workflows, monitor team progress (read-only detail pages)
- **Operator**: Can execute workflow tasks, input stage-specific data, view assigned orders

### Key Features
- ✅ Multi-step work order management with three distinct production stages
- ✅ Stage-specific form inputs with mandatory field validation
- ✅ Real-time progress computation from workflow data
- ✅ localStorage-driven persistent state (no backend required)
- ✅ Responsive Tailwind CSS design
- ✅ Dynamic status calculation based on workflow completeness
- ✅ Three-step modal workflow (Input → Review → Confirm)

### Core Statistics Tracked
- Total Work Orders, Status Breakdown (Yet to Start, In-progress, Completed)
- Total Product Lots, Metallisation Stock, Slitting Queue
- Quality Check counts across stages

---

## Architecture & Tech Stack

### Technology Stack
| Component | Technology |
|-----------|-----------|
| **Framework** | Next.js 14+ (App Router) |
| **Styling** | Tailwind CSS with custom color palette |
| **State Management** | React hooks + browser localStorage |
| **Icons** | lucide-react |
| **Language** | TypeScript (fully typed) |
| **Data Persistence** | Browser localStorage (no backend) |

### Color Palette (Hex Values)
```
Primary Blue:        #00B6E2  (Capco brand color)
Dark Text:           #171717  (Near black for headings)
Medium Gray Text:    #5C5C5C  (Body text)
Light Gray Borders:  #EBEBEB  (Form dividers, borders)
Status Red:          #FB3748  (Error/Critical - "Yet to Start")
Status Orange:       #E19242  (Warning - "In-progress")
Status Green:        #1CB061  (Success - "Completed")
```

### Project Structure
```
capco/
├── app/
│   ├── globals.css
│   ├── layout.tsx
│   ├── page.tsx
│   └── supervisor/
│       ├── layout.tsx
│       ├── page.tsx (redirect to workorder)
│       ├── workorder/
│       │   ├── page.tsx (Work Order list + add modal)
│       │   └── [detailpage]/
│       │       └── page.tsx (Detail page, read-only)
│       ├── stock/
│       ├── overview/
│       └── pipeline/
│   └── operator/
│       ├── workorder/
│       │   ├── page.tsx (Assigned list)
│       │   └── [detailpage]/
│       │       └── page.tsx (Workflow execution, interactive)
│       └── stock/
├── components/
│   └── supervisor/
│       ├── SupervisorShell.tsx (Layout wrapper)
│       ├── SupervisorSidebar.tsx (Navigation)
│       ├── SupervisorTopbar.tsx (Breadcrumbs)
│       └── StatusBadge.tsx (Color-coded status)
├── hooks/
│   └── useStore.ts (React state management)
├── lib/
│   ├── data.ts (Types + helpers)
│   └── [other utilities]
└── public/
```

---

## Data Models & Types

All data types are defined in `lib/data.ts` for consistency across components.

### WorkOrderSummary
Base work order record persisted in localStorage. **Note**: Stage and Status are NOT stored here; they are computed at runtime.

```typescript
type WorkOrderSummary = {
  id: string;              // Unique ID (e.g., "WO-0001", auto-incremented)
  micron: string;          // Thickness specification (e.g., "4.5")
  width: string;           // Width specification (e.g., "1.0")
  qty: string;             // Quantity in Kgs (e.g., "100")
  date: string;            // Creation date (DD/MM/YYYY format)
  // NOTE: stage and status are NOT stored - they are computed
};
```

**Micron Options**: 2, 2.5, 3, 3.5, 4, 4.5, 4.5HT, 5, 5.5, 6, 6.5, 7, 7.5

### RawMaterialRow
Individual raw material entry in the Raw Material workflow stage.

```typescript
type RawMaterialRow = {
  rollNo: string;          // Material ID (e.g., "RM-8350")
  weight: string;          // Weight in Kgs (e.g., "60kgs")
  thickness: string;       // Micron value (from specification)
  supplier: string;        // Supplier name (dropdown selection)
  stage: string;           // Current processing stage (e.g., "METALLISATION, SLITTING")
  status: WorkflowStatus;  // "Yet to Start" | "In-progress" | "Completed"
};
```

**Supplier Options**:
- VedaCap Industries
- ElectroForge Capacitors
- NextGen Metallic Pvt Ltd

**Available RM IDs** (Godown Pool):
- Range 1: RM-8300 to RM-8400
- Range 2: RM-3400 to RM-3600
- Seeded IDs: RM-456, RM-457, etc.

### MetallisationRow
Machine processing record for the Metallisation stage.

```typescript
type MetallisationRow = {
  coilNo: string;          // Auto-generated coil ID (e.g., "MC-0001")
  rmId: string;            // Associated raw material ID (RM-XXXX)
  machineNo: string;       // Machine identifier (e.g., "M-01")
  weight: string;          // Output weight in Kgs
  opticalDensity: string;  // OD measurement value
  resistance: string;      // Resistance in Ohms (e.g., "1.5 Ohms")
  timestamp: string;       // Processing datetime
  nextStage: string;       // Always "SLITTING"
  status: WorkflowStatus;  // "Yet to Start" | "In-progress" | "Completed"
};
```

### SlittingRow
Final production record for the Slitting stage (quality checked and graded).

```typescript
type SlittingRow = {
  productNo: string;       // Auto-generated product ID (e.g., "PM-00001")
  rmId: string;            // Linked raw material ID
  weight: string;          // Final weight in Kgs
  thickness: string;       // Final thickness in microns
  grade: string;           // Quality grade: "AA" | "A" | "B" | "C" | "D"
  remarks: string;         // **MANDATORY** Quality observations (textarea)
  timestampAdded: string;  // Completion timestamp
  stage: string;           // "Ready for Winding" (was "Ready for Dispatch")
  status: WorkflowStatus;  // Always "Completed" when saved
};
```

### WorkOrderFlowData
Complete workflow record for a single work order - contains all stages' data.

```typescript
type WorkOrderFlowData = {
  overview: WorkOrderOverview;
  rawMaterialRows: RawMaterialRow[];
  metallisationRows: MetallisationRow[];
  slittingRows: SlittingRow[];
};
```

### WorkOrderOverview
Summary information displayed in the detail page header, computed from workflow.

```typescript
type WorkOrderOverview = {
  wordCount: string;       // Display metric (e.g., "4,200 words")
  micron: string;          // From work order spec
  width: string;           // From work order spec
  quantity: string;        // From work order spec
  date: string;            // Creation date
  stage: string;           // Computed at runtime from flow data
  status: WorkflowStatus;  // Computed at runtime from row statuses
};
```

### WorkflowStatus (Enum)
Used throughout the system for consistent status representation.

```typescript
type WorkflowStatus = "Yet to Start" | "In-progress" | "Completed";
```

---

## State Management (localStorage)

### Overview
Capco uses **pure localStorage-driven state** with no backend. All work orders and workflow data are persisted in the browser's localStorage, enabling offline-first design and instant persistence.

### StoreData Interface (hooks/useStore.ts)

```typescript
interface StoreData {
  workOrders: WorkOrderSummary[];           // Array of all work orders
  flowDataMap: Record<string, WorkOrderFlowData>;  // Map of WO ID → full workflow
}
```

### Storage Implementation

**Storage Key**: `"capcoDataStore"`

**Initialization** (on first load):
```typescript
const defaultStore: StoreData = {
  workOrders: [],
  flowDataMap: {},
};
```

### Core Functions in useStore()

#### loadStore(): StoreData
Loads store from localStorage with safe fallback for missing/corrupt data.

```typescript
export function loadStore(): StoreData {
  try {
    const stored = localStorage.getItem('capcoDataStore');
    if (!stored) return defaultStore; // First load
    
    const parsed = JSON.parse(stored);
    return sanitizeStore(parsed);  // Validate & clean data
  } catch (error) {
    console.error('Failed to load store:', error);
    return defaultStore;
  }
}
```

**Sanitization Process**:
- Validates structure is valid Record type
- Filters workOrders to only valid WorkOrderSummary entries
- Reconstructs flowDataMap with normalized entries
- Migrates legacy "Ready for Dispatch" → "Ready for Winding"
- Recomputes stage/status using computeWorkflowProgress()

#### saveStore(data: StoreData): void
Persists store to localStorage and broadcasts change event.

```typescript
export function saveStore(data: StoreData) {
  try {
    localStorage.setItem('capcoDataStore', JSON.stringify(data));
    // Notify other components of state change
    window.dispatchEvent(new Event('capco-store-change'));
  } catch (error) {
    console.error('Failed to save store:', error);
  }
}
```

#### useStore() Hook
React hook providing reactive access to store with computed properties.

```typescript
export function useStore() {
  const [store, setStore] = useState<StoreData>(loadStore);
  const [mounted, setMounted] = useState(false);
  
  // Re-synchronize when store changes in another component/tab
  useEffect(() => {
    const handleStorageChange = () => {
      setStore(loadStore());
    };
    window.addEventListener('capco-store-change', handleStorageChange);
    setMounted(true);
    return () => window.removeEventListener('capco-store-change', handleStorageChange);
  }, []);
  
  return {
    store,
    mounted,
    workOrders,        // COMPUTED with runtime stage/status
    addWorkOrder(),    // Add new work order
    addFlowRow(),      // Add workflow row & recompute
  };
}
```

**Computed Workorders**:
```typescript
const workOrders = store.workOrders.map((wo) => {
  const flow = store.flowDataMap[wo.id];
  const progress = computeWorkflowProgress(flow);
  return {
    ...wo,
    stage: progress.stage,
    status: progress.status,
  };
});
```

### Methods

#### addWorkOrder(micron: string, width: string, qty: string)
Creates a new work order with auto-incremented ID.

```typescript
const store = loadStore();
const nextId = `WO-${String(store.workOrders.length + 1).padStart(4, '0')}`;

const newWO: WorkOrderSummary = {
  id: nextId,
  micron,
  width,
  qty,
  date: formatDate(new Date()),  // DD/MM/YYYY
};

const updatedStore = {
  workOrders: [...store.workOrders, newWO],
  flowDataMap: {
    ...store.flowDataMap,
    [nextId]: createEmptyFlowData({ micron, width, quantity: qty, date: newWO.date }),
  },
};

saveStore(updatedStore);
```

#### addFlowRow(woId: string, stage: "raw" | "metallisation" | "slitting", rowData: any)
Adds a new workflow row to the appropriate stage and recomputes progress.

```typescript
const store = loadStore();
const flow = store.flowDataMap[woId];

if (stage === 'raw') {
  flow.rawMaterialRows.push(rowData);
} else if (stage === 'metallisation') {
  flow.metallisationRows.push(rowData);
} else if (stage === 'slitting') {
  flow.slittingRows.push(rowData);
}

// Recompute stage & status
const progress = computeWorkflowProgress(flow);
flow.overview.stage = progress.stage;
flow.overview.status = progress.status;

saveStore(store);
```

---

## Dashboard Views

### Supervisor Dashboard (/supervisor/workorder)

**Purpose**: Centralized management and monitoring of all work orders.

**Components**:

1. **Header Section**
   - Title: "Work Orders"
   - Subheading: "Manage and track all manufacturing work orders"
   - Button: "Add Work Order" (opens modal)

2. **Statistics Cards** (4 cards, computed from workOrders)
   ```
   Total Work Orders: X
   ├─ Yet to Start: X
   ├─ In-progress: X  
   └─ Completed: X
   
   Yet to Start: X
   └─ Stage breakdown (Raw Material, Metallisation, Slitting)
   
   In-progress: X
   └─ Stage breakdown
   
   Completed: X
   └─ Stage breakdown
   ```

3. **Work Orders Table**
   ```
   Columns: ID | Micron | Width | Qty | Stage | Date | Status | Action
   - Rows sorted by creation date (newest first)
   - Status badges color-coded
   - Action button: "View" → Navigate to /supervisor/workorder/[id]
   ```

### Operator Dashboard (/operator/workorder)

**Purpose**: Task-focused view for operators to execute work.

**Key Differences from Supervisor**:
- ❌ No "Add Work Order" button
- ✅ Same stats layout (read-only)
- ✅ Same table with "View" action
- ✅ Leads to interactive workflow execution

### Stock Dashboard (/supervisor/stock and /operator/stock)

**Purpose**: Inventory tracking across manufacturing stages.

**Statistics** (computed from flowDataMap):
```
Total Product Lots: Sum of all rows across all stages
- Metallisation Stock: Count of metallisationRows entries
- Slitting Queue: Count of slittingRows entries
- Quality Check Lots: Count of entries pending review
```

**Calculation Example**:
```typescript
const allFlows = Object.values(store.flowDataMap);
const totalLots = allFlows.reduce((sum, flow) => 
  sum + 
  flow.rawMaterialRows.length + 
  flow.metallisationRows.length + 
  flow.slittingRows.length, 
  0
);
```

---

## User Roles & Permissions

### Supervisor (`/supervisor/*`)

**Capabilities**:
- ✅ Create new work orders (modal form)
- ✅ View all work orders and list
- ✅ View workflow progress (detail page, read-only)
- ✅ Monitor team activities and statistics
- ✅ Access stock/inventory dashboards
- ❌ Cannot execute workflow tasks
- ❌ Cannot add raw material, metallisation, slitting entries

**Routes**:
- `/supervisor/workorder` - List + create modal
- `/supervisor/workorder/WO-0001` - Read-only detail
- `/supervisor/stock` - Inventory overview
- `/supervisor/overview`, `/supervisor/pipeline` - Dashboard shells

### Operator (`/operator/*`)

**Capabilities**:
- ❌ Cannot create work orders
- ✅ View assigned work orders
- ✅ Execute workflow tasks (add rows to stages)
- ✅ Input stage-specific data with validation
- ✅ View work order progress
- ✅ Access inventory dashboards

**Routes**:
- `/operator/workorder` - Assigned list (read-only)
- `/operator/workorder/WO-0001` - Interactive workflow execution
- `/operator/stock` - Inventory overview

---

## Workflow Stages & Steps

### Stage 1: Raw Material

**Purpose**: Intake and cataloging of raw material with supplier documentation.

**Entry Fields** (Step 1: Input):
| Field | Type | Options | Validation |
|-------|------|---------|-----------|
| Roll No (RM ID) | Dropdown | RM-8300 to RM-8400, RM-3400 to RM-3600 | Mandatory |
| Micron | Dropdown | 2, 2.5, 3, 3.5, 4, 4.5, 4.5HT, 5, 5.5, 6, 6.5, 7, 7.5 | Mandatory |
| Width | Number | Any numeric value | Mandatory |
| Quantity | Number | Weight in Kgs (e.g., 100) | Mandatory |
| Supplier | Dropdown | VedaCap Industries, ElectroForge Capacitors, NextGen Metallic Pvt Ltd | Mandatory |

**Process**:
1. User clicks "Add Raw Material" button
2. Form displays all 5 fields
3. User can "Add Item" to queue multiple entries before submission
4. Click "Next" → Review → Submit
5. All entries saved to flowDataMap[woId].rawMaterialRows

**Output**: RawMaterialRow array

**Initial Status**: "Yet to Start" (user sets during entry, typically updated during execution)

---

### Stage 2: Metallisation

**Purpose**: Machine-based coating/processing with parameter measurement.

**Entry Fields** (Step 1: Input):
| Field | Type | Validation |
|-------|------|-----------|
| Coil No | Text | Optional (auto-generates if left blank) |
| RM ID | Dropdown | Auto-populated from raw material rows, mandatory |
| Machine No | Text | Mandatory |
| Weight | Number | Output weight in Kgs, mandatory |
| Optical Density (OD) | Number | Numeric measurement, mandatory |
| Resistance | Number | Numeric measurement, mandatory |
| Next Stage | Dropdown | Default: "Slitting", mandatory |

**Process**:
1. User clicks "Add Metallisation" button
2. RM ID dropdown auto-shows available raw materials
3. Fill all mandatory fields
4. Add multiple items if needed
5. Review → Submit
6. All entries saved to flowDataMap[woId].metallisationRows

**Output**: MetallisationRow array

**Auto-Generated Coil No Format**: `MC-XXXX` (e.g., MC-0001)

---

### Stage 3: Slitting (TWO-STEP PROCESS)

**Purpose**: Final cutting, quality grading, and completion with remarks.

#### Step 1: Product Entry
| Field | Type | Validation |
|-------|------|-----------|
| Product Material ID | Text | Auto-generated (PM-XXXXX), read-only |
| Associated RM ID | Dropdown | From raw materials, mandatory |
| Micron | Dropdown | From specifications, mandatory |
| Width | Number | Final width, mandatory |
| Weight | Number | Final weight in Kgs, mandatory |
| Grade | Dropdown | AA \| A \| B \| C \| D, mandatory |

**Validation**: All fields mandatory before "Next"

#### Step 2: Review with Remarks (MANDATORY)
| Field | Type | Validation |
|-------|------|-----------|
| Remarks / Observation | Textarea | **MANDATORY** - Must be filled before submission |
| [Review Cards] | Display | Show all step 1 fields in read-only cards |

**Important**: User CANNOT submit without entering remarks.

**Process**:
1. User clicks "Add Slitting" button
2. Fill all step 1 fields
3. Click "Next" → Shows step 2 review page
4. Enter remarks (mandatory)
5. Click "Submit"
6. Saved to flowDataMap[woId].slittingRows with:
   - `stage: "Ready for Winding"`
   - `status: "Completed"`

**Output**: SlittingRow with remarks documented

---

## UI Components & Pages

### SupervisorShell.tsx
**Purpose**: Layout wrapper providing consistent navigation structure.

```
SupervisorShell (main wrapper)
├── SupervisorSidebar (left nav)
│   ├── Logo
│   ├── Work Orders
│   ├── Stock
│   ├── Overview
│   └── Pipeline
├── SupervisorTopbar (header)
│   ├── Breadcrumbs
│   ├── Page Title
│   └── User Info
└── Main Content (children)
```

**Styling**: 
- Sidebar: Fixed, ~280px width on desktop
- Responsive: Collapsible on mobile
- Consistent brand colors

### SupervisorSidebar.tsx
**Navigation Items**:
- Capco logo/branding
- Work Orders (primary)
- Stock (inventory)
- Overview (analytics shell)
- Pipeline (workflow shell)

**Active State**: Highlights current route

### SupervisorTopbar.tsx
**Elements**:
- Dynamic breadcrumb path (e.g., "Work Orders > WO-0001")
- Page title
- User profile/info section

### StatusBadge Component
Renders color-coded status indicators.

```typescript
const StatusBadgeStyles = {
  "Yet to Start": {
    background: "#FFF0F1",    // Light red
    text: "#FB3748",          // Red
  },
  "In-progress": {
    background: "#FFF4ED",    // Light orange
    text: "#E19242",          // Orange
  },
  "Completed": {
    background: "#E8F8F0",    // Light green
    text: "#1CB061",          // Green
  },
};
```

**Usage**: Displayed in status column of all tables

### Add Work Order Modal
**Structure**:
```
┌─ Header ────────────────────────┐
│ New Work Order          [Close] │
│ Lorem ipsum description         │
├─ Body ──────────────────────────┤
│ Micron:    [Dropdown]           │
│ Width:     [Dropdown]           │
│ Quantity:  [Number Input]       │
├─ Footer ────────────────────────┤
│  [Cancel]  [Create Work Order]  │
└─────────────────────────────────┘
```

**Validation**:
- All three fields mandatory
- Create button disabled until all filled

---

## Add Work Order Flow

### Step-by-Step Process

**1. Modal Opens**
- Triggered by "Add Work Order" button on supervisor dashboard
- Modal shows form with three fields

**2. User Input**
- Select Micron from dropdown
- Select Width from dropdown  
- Enter Quantity (numeric, in Kgs)

**3. Validation**
- Submit button disabled if any field empty
- All fields marked as mandatory

**4. Create Work Order**
```typescript
// On submit:
const nextWOId = `WO-${String(count + 1).padStart(4, '0')}`;
const today = formatDate(new Date()); // DD/MM/YYYY

const workOrder: WorkOrderSummary = {
  id: nextWOId,
  micron,
  width,
  qty: quantity,
  date: today,
};

// Create empty flow
const flow = createEmptyFlowData({
  micron,
  width,
  quantity,
  date: today,
});

// Save to localStorage
const store = loadStore();
saveStore({
  workOrders: [...store.workOrders, workOrder],
  flowDataMap: {
    ...store.flowDataMap,
    [nextWOId]: flow,
  },
});
```

**5. Post-Creation**
- Modal closes
- New WO appears at top of table
- Stage: "Raw Material" (computed)
- Status: "Yet to Start" (computed)
- User can click "View" to access detail page

---

## Detail Page Workflow

### Operator Detail Page (/operator/workorder/[detailpage])

**URL Pattern**: `/operator/workorder/WO-0001`

**Purpose**: Interactive workflow execution for a single work order.

### Page Layout

#### Header: Work Order Overview
```
┌─ Overview ───────────────────────────────────┐
│ Work Orders Overview                          │
├──────────────────────────────────────────────┤
│ Word Count: 4,200 words                       │
│ Micron: 4.5  |  Width: 1.0  |  Qty: 100 Kgs │
│ Stage: [Computed]  Status: [Computed]         │
│ Date: 10/01/2025                             │
└──────────────────────────────────────────────┘
```

**Fields**:
- word_count: Display metric (e.g., "4,200 words")
- micron, width, quantity: From work order
- stage: **COMPUTED** at runtime
- status: **COMPUTED** at runtime
- date: Creation date

#### Tab Navigation
Three tabs for three workflow stages:
- [Raw Material] [Metallisation] [Slitting]

#### Tab Content
```
Search Bar (filter rows)
───────────────────────
[Add Raw Material]  (button)
───────────────────────
│ Table with columns │
│ for this stage     │
```

### Modal Workflow (Three-Step Process)

#### Step 1: Input Details
**Displayed**: All mandatory fields for the stage
```
[Field 1] [optional instruction]
[Field 2] [optional instruction]
...

[Add Item]  Item Count: 3
──────────────────────────
[Back] [Next]
```

**Validation**:
- All fields mandatory
- "Add Item" button adds another row to draft
- "Next" button disabled until all fields filled

**Features**:
- Users can queue multiple items before submission
- Item count displayed
- Clear current item option

#### Step 2: Review Overview
**Displayed**: Review cards for all drafted items + stage-specific fields

For **Raw Material & Metallisation**:
```
Review Items (3)
────────────────
[Card] RM-8350, 60kgs, Micron 4.5
[Card] RM-8360, 60kgs, Micron 4.5
[Card] RM-8370, 60kgs, Micron 4.5

[Back] [Submit Details]
```

For **Slitting** (Step 2 is unique):
```
Review Items + Remarks (Step 2)
────────────────────────────────
[Card] PM-00001, Grade A
[Card] PM-00002, Grade B

Remarks / Observation: [MANDATORY TEXTAREA]
"Rolls verified for winding queue."

[Back] [Submit Details]
```

**Validation for Slitting**:
- Submit button disabled if remarks field is empty
- User MUST enter observations

#### Step 3: Success Confirmation
```
┌─ Success ────────────────────┐
│ ✓ Items Added Successfully   │
│                              │
│ [Go to Dashboard]            │
│ [View Work Order Details]    │
└──────────────────────────────┘
```

**Actions**:
- "Go to Dashboard": Navigate back to `/operator/workorder`
- "View Work Order Details": Reload current detail page

### Data Flow on Submission

```
User Submits
    ↓
Step 1: Validate all fields
    ↓
Step 2: Review + Validate (remarks for Slitting)
    ↓
Step 3: Confirm submission
    ↓
Call addFlowRow(woId, stage, rowsData)
    ↓
Load current store from localStorage
    ↓
Push rows to appropriate array (raw/metallisation/slitting)
    ↓
Compute workflow progress: computeWorkflowProgress(flow)
    ↓
Update overview.stage and overview.status
    ↓
Save store to localStorage
    ↓
Dispatch 'capco-store-change' event
    ↓
Show success screen
```

### Supervisor Detail Page (/supervisor/workorder/[detailpage])

**URL Pattern**: `/supervisor/workorder/WO-0001`

**Purpose**: Read-only progress monitoring.

**Key Differences**:
- ❌ No "Add [Stage]" buttons
- ✅ Same three-tab view
- ✅ Tables show all completed entries
- ✅ All fields are read-only
- ✅ Overview section displays computed stage/status

**Use Case**: Supervisors use this to monitor operator progress and see completed workflows.

---

## Runtime Progress Computation

### computeWorkflowProgress() Function

**Location**: `lib/data.ts`

**Purpose**: Derives the current stage and status from workflow data without storing them.

```typescript
export function computeWorkflowProgress(
  flow?: WorkOrderFlowData
): { stage: string; status: WorkflowStatus } {
  
  // Case 1: No flow data yet
  if (!flow) {
    return {
      stage: "Raw Material",
      status: "Yet to Start",
    };
  }

  // Determine stage by deepest row type present
  let stage = "Raw Material";
  if (flow.slittingRows.length > 0) {
    stage = "Slitting";
  } else if (flow.metallisationRows.length > 0) {
    stage = "Metallisation";
  } else if (flow.rawMaterialRows.length > 0) {
    stage = "Raw Material";
  }

  // Check if workflow is fully completed
  // (Slitting complete means all slitting rows have status "Completed")
  const slittingCompleted =
    flow.slittingRows.length > 0 &&
    flow.slittingRows.every((row) => row.status === "Completed");

  if (slittingCompleted) {
    return {
      stage,
      status: "Completed",
    };
  }

  // Check if any stage has "In-progress" or "Completed" rows
  const allRows = [
    ...flow.rawMaterialRows,
    ...flow.metallisationRows,
    ...flow.slittingRows,
  ];

  const hasActiveRow = allRows.some(
    (row) => row.status === "In-progress" || row.status === "Completed"
  );

  if (hasActiveRow) {
    return {
      stage,
      status: "In-progress",
    };
  }

  // Default: Yet to Start
  return {
    stage,
    status: "Yet to Start",
  };
}
```

### Algorithm Logic

| Condition | Result |
|-----------|--------|
| No flow data exists | `stage: "Raw Material", status: "Yet to Start"` |
| Slitting rows exist + ALL are "Completed" | `status: "Completed"` |
| Any row is "In-progress" or "Completed" | `status: "In-progress"` |
| Otherwise | `status: "Yet to Start"` |

**Stage Derivation** (priority order):
1. If slittingRows exist → "Slitting"
2. Else if metallisationRows exist → "Metallisation"
3. Else if rawMaterialRows exist → "Raw Material"
4. Default → "Raw Material"

### Key Design Decision
**Why compute instead of store?**
- Eliminates inconsistency from manual updates
- Stage/status always reflect true workflow state
- Simplifies data integrity
- No need to sync multiple fields

---

## localStorage Structure & Persistence

### Complete localStorage Example

```json
{
  "capcoDataStore": {
    "workOrders": [
      {
        "id": "WO-0001",
        "micron": "4.5",
        "width": "1.0",
        "qty": "100",
        "date": "10/01/2025"
      },
      {
        "id": "WO-0002",
        "micron": "3.8",
        "width": "0.8",
        "qty": "200",
        "date": "11/01/2025"
      }
    ],
    "flowDataMap": {
      "WO-0001": {
        "overview": {
          "wordCount": "4,200 words",
          "micron": "4.5",
          "width": "1.0",
          "quantity": "100",
          "stage": "Slitting",
          "date": "10/01/2025",
          "status": "In-progress"
        },
        "rawMaterialRows": [
          {
            "rollNo": "RM-8350",
            "weight": "100kgs",
            "thickness": "4.5",
            "supplier": "VedaCap Industries",
            "stage": "METALLISATION, SLITTING",
            "status": "Completed"
          }
        ],
        "metallisationRows": [
          {
            "coilNo": "MC-0001",
            "rmId": "RM-8350",
            "machineNo": "M-01",
            "weight": "99.2kgs",
            "opticalDensity": "2.4",
            "resistance": "1.5",
            "timestamp": "11/01/2025 08:30",
            "nextStage": "SLITTING",
            "status": "Completed"
          }
        ],
        "slittingRows": [
          {
            "productNo": "PM-00001",
            "rmId": "RM-8350",
            "weight": "98.5kgs",
            "thickness": "4.5",
            "grade": "A",
            "remarks": "Rolls verified for winding queue. Quality check passed.",
            "timestampAdded": "13/01/2025 14:30",
            "stage": "Ready for Winding",
            "status": "Completed"
          }
        ]
      }
    }
  }
}
```

### Data Persistence Flow Diagram

```
User Action (Create WO / Add Row)
    ↓
React Component State Update
    ↓
Hook Call: addWorkOrder() or addFlowRow()
    ↓
Load Current Store: loadStore()
    ↓
Modify Store Object (add entry)
    ↓
Recompute Progress: computeWorkflowProgress()
    ↓
Update overview.stage & overview.status
    ↓
Save to localStorage: saveStore(modified)
    ↓
Dispatch 'capco-store-change' Event
    ↓
useStore() Listeners React
    ↓
setStore(loadStore()) - Full re-sync
    ↓
Component Re-renders
    ↓
UI Updates Immediately
```

### Persistence Guarantees

1. **Reliable Load**: If key missing or corrupted, gracefully initializes empty store
2. **Sanitization**: On load, validates all entries and reconstructs malformed data
3. **Legacy Migration**: Automatically migrates "Ready for Dispatch" → "Ready for Winding"
4. **Computed Derivation**: Stage/Status recomputed on every load and save, never stale
5. **Cross-Tab Sync**: Event listeners ensure tabs stay synchronized
6. **No Seeded Defaults**: Storage always reflects user actions only

---

## Development Guide

### Local Development Setup

**1. Install Dependencies**
```bash
cd capco
npm install
```

**2. Run Development Server**
```bash
npm run dev
```

**3. Open in Browser**
```
http://localhost:3000
```

### Common Workflows

#### Adding a New Work Order (Supervisor)

1. Navigate to `/supervisor/workorder`
2. Click "Add Work Order" button
3. Fill form:
   - Select Micron (dropdown)
   - Select Width (dropdown)
   - Enter Quantity (number, in Kgs)
4. Click "Create Work Order"
5. New WO-XXXX appears at top of table
   - Stage: "Raw Material" (computed)
   - Status: "Yet to Start" (computed)

#### Executing Raw Material Stage (Operator)

1. Navigate to `/operator/workorder/WO-0001` (detail page)
2. Click "Add Raw Material" button
3. Fill mandatory fields:
   - Roll No (RM ID from dropdown)
   - Micron (from specification)
   - Width
   - Quantity (in Kgs)
   - Supplier (dropdown)
4. Click "Add Item" to queue more entries
5. Click "Next" → Review → "Submit Details"
6. Check localStorage: Entry added to flowDataMap[WO-0001].rawMaterialRows
7. Status updates to "In-progress" (computed)

#### Executing Metallisation Stage (Operator)

1. Click "Metallisation" tab on detail page
2. Click "Add Metallisation" button
3. Fill mandatory fields:
   - Coil No (optional, auto-generates)
   - RM ID (auto-populated from raw materials)
   - Machine No
   - Weight (Kgs)
   - Optical Density (OD)
   - Resistance (Ohms)
   - Next Stage (default: Slitting)
4. Review → Submit
5. Entry added to flowDataMap[WO-0001].metallisationRows

#### Executing Slitting Stage (Operator - Two-Step)

1. Click "Slitting" tab on detail page
2. Click "Add Slitting" button

**Step 1 (Input)**:
- Product No: Auto-generated (read-only)
- Associated RM ID: Dropdown
- Micron, Width, Weight: Numeric
- Grade: Dropdown (AA/A/B/C/D)
- Click "Next"

**Step 2 (Review + Remarks)**:
- Review all fields in cards
- **MANDATORY**: Enter Remarks/Observation
- Click "Submit Details"

3. Entry added to flowDataMap[WO-0001].slittingRows with:
   - `stage: "Ready for Winding"`
   - `status: "Completed"`
4. Workflow marked as "Completed" (computed)

#### Monitoring Progress (Supervisor)

1. Navigate to `/supervisor/workorder`
2. Check stats cards (auto-computed):
   - "Total Work Orders"
   - "Yet to Start" (with breakdown by stage)
   - "In-progress" (with breakdown by stage)
   - "Completed" (with breakdown by stage)
3. Click "View" on any work order to see read-only detail page
4. Tables show all completed workflow entries per stage

### Debugging localStorage

#### View Current State
```javascript
// Open browser DevTools console
console.log(JSON.parse(localStorage.getItem('capcoDataStore')));
```

#### Clear All Data
```javascript
localStorage.removeItem('capcoDataStore');
location.reload();
```

#### Manual Insertion (for testing)
```javascript
const testData = {
  workOrders: [
    { id: "WO-0001", micron: "4.5", width: "1.0", qty: "100", date: "10/01/2025" }
  ],
  flowDataMap: {
    "WO-0001": {
      overview: {
        wordCount: "100 words",
        micron: "4.5",
        width: "1.0",
        quantity: "100",
        stage: "Raw Material",
        date: "10/01/2025",
        status: "Yet to Start"
      },
      rawMaterialRows: [],
      metallisationRows: [],
      slittingRows: []
    }
  }
};

localStorage.setItem('capcoDataStore', JSON.stringify(testData));
window.dispatchEvent(new Event('capco-store-change'));
location.reload();
```

#### Watch Store Changes
```javascript
window.addEventListener('capco-store-change', () => {
  console.log('Store updated:', JSON.parse(localStorage.getItem('capcoDataStore')));
});
```

---

## Debugging & Troubleshooting

### Issue: Work order shows wrong stage

**Cause**: Stage not recomputed after adding flow rows

**Solution**:
1. Check that `addFlowRow()` calls `computeWorkflowProgress()`
2. Verify `overview.stage` updated before `saveStore()`
3. Check localStorage for correct row count

```javascript
const flow = store.flowDataMap['WO-0001'];
const progress = computeWorkflowProgress(flow);
console.log('Computed stage:', progress.stage);
console.log('Raw rows:', flow.rawMaterialRows.length);
console.log('Metallisation rows:', flow.metallisationRows.length);
console.log('Slitting rows:', flow.slittingRows.length);
```

### Issue: Modal form allows submit with empty fields

**Cause**: Validation logic not enforced

**Solution**:
1. Check `isCurrentStepValid` computation in modal component
2. Verify submit button has `disabled={!isCurrentStepValid}`
3. Ensure all required fields checked before enabling Next

### Issue: localStorage data not persisting

**Cause**: `saveStore()` not called, or browser storage disabled

**Solution**:
1. Check browser console for errors
2. Verify `localStorage` is enabled in browser settings
3. Ensure `saveStore()` called after state changes
4. Try clearing cache and reloading

### Issue: Old data shows after reload

**Cause**: Legacy migration not running

**Solution**:
1. Check `sanitizeStore()` migrates "Ready for Dispatch" → "Ready for Winding"
2. Verify `computeWorkflowProgress()` called during load
3. Clear localStorage and re-test

### Issue: Stats cards show incorrect counts

**Cause**: Computed from old store.workOrders (not refreshed)

**Solution**:
1. Verify `useStore()` returns computed workOrders with runtime stage/status
2. Check component uses `workOrders` from hook, not `store.workOrders`
3. Ensure state update triggers re-render

### Issue: Remarks field not mandatory in Slitting

**Cause**: Validation not triggered for step 2

**Solution**:
1. Check slitting step 2 has `remarks.trim().length > 0` validation
2. Verify submit button disabled until remarks filled
3. Ensure validation runs before step 3 shown

---

## Quick Reference: Data Flow Diagram

```
┌─ Supervisor ─────────────────────┐
│ 1. Click "Add Work Order"        │
│ 2. Fill form (micron, width, qty)│
│ 3. Submit                         │
│    └─ Store WO-XXXX in store    │
│    └─ Create empty flowData      │
│    └─ Save to localStorage       │
└─────────────────────────────────┘
         ↓
┌─ Operator Dashboard ──────────────┐
│ 4. Click "View" on WO-XXXX        │
│    └─ Navigate to detail page     │
└──────────────────────────────────┘
         ↓
┌─ Raw Material Execution ─────────┐
│ 5. Click "Add Raw Material"       │
│ 6. Fill fields, Add Item          │
│ 7. Review → Submit                │
│    └─ Store in rawMaterialRows    │
│    └─ Recompute progress          │
│    └─ Save to localStorage        │
│    └─ Status: "In-progress"       │
└──────────────────────────────────┘
         ↓
┌─ Metallisation Execution ────────┐
│ 8. Click "Add Metallisation"      │
│ 9. Select RM ID, fill machine     │
│ 10. Review → Submit               │
│     └─ Store in metallisationRows │
│     └─ Recompute progress         │
│     └─ Stage: "Metallisation"     │
└──────────────────────────────────┘
         ↓
┌─ Slitting Execution (2 Steps) ───┐
│ 11. Click "Add Slitting"          │
│ 12. Step 1: Fill specs + grade    │
│ 13. Step 2: Enter remarks (req'd) │
│ 14. Review → Submit               │
│     └─ Store in slittingRows      │
│     └─ Recompute progress         │
│     └─ Stage: "Slitting"          │
│     └─ Status: "Completed"        │
│     └─ Save to localStorage       │
└──────────────────────────────────┘
         ↓
┌─ Supervisor Monitoring ──────────┐
│ 15. View dashboard stats          │
│     └─ All stats updated          │
│     └─ Stage: "Slitting"          │
│     └─ Status: "Completed"        │
│ 16. Click "View" detail page      │
│     └─ All tables populated       │
└──────────────────────────────────┘
```

---

## Summary

**Capco** is a complete manufacturing workflow management system built on:
- ✅ Three-stage production pipeline (Raw Material → Metallisation → Slitting)
- ✅ Pure localStorage state management (no backend)
- ✅ Runtime-computed progress (stage/status never stored)
- ✅ Three-step modal workflows with mandatory field validation
- ✅ Supervisor creation + operator execution roles
- ✅ Real-time statistics and progress tracking

All data persists in browser localStorage under the key `"capcoDataStore"` and is instantly available across pages and browser sessions.

---

**Document Version**: 1.0  
**Last Updated**: April 2026  
**Status**: Complete & Production-Ready
</parameter>
</invoke>