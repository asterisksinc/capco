# Capco Phase-2 Integration Gap Analysis and Estimation

Date: 2026-04-19

## 1) Scope
This document compares:
1. Phase-1 frontend implementation (localStorage workflow and basic UI).
2. Phase-2 backend deliverables (schema, API routes, Postman collection, role workflow).

Goal: define what must be added or changed for backend-aligned implementation and estimate effort.

## 2) Current Phase-1 Snapshot (Frontend)
Observed implementation:
1. Frontend state is localStorage-only with key capcoDataStore.
2. Workflows are computed client-side from local rows, not from backend status/stage.
3. Active workflow has only 3 production tabs:
   - Raw Material
   - Metallisation
   - Slitting
4. Supervisor creates work orders in UI without backend persistence.
5. Operator submits stage data through modal steps and local addFlowRow calls.
6. No frontend consumption of backend work-order APIs yet.

Primary files:
- hooks/useStore.ts
- lib/data.ts
- app/supervisor/workorder/page.tsx
- app/supervisor/workorder/[detailpage]/page.tsx
- app/operator/workorder/page.tsx
- app/operator/workorder/[detailpage]/page.tsx

## 3) Phase-2 Backend Snapshot
Observed backend contracts:
1. Auth + profile model with role-based permissions.
2. Work order lifecycle with stage ownership and assignee transitions.
3. Extended workflow stages:
   - raw_material, metallisation, slitting, winding, spray, soldening, epoxy, test_print_pack, finished_goods, production_head_review, head_of_operations_review, completed
4. Status lifecycle:
   - yet_to_start, in_progress, awaiting_production_head_review, awaiting_head_of_operations_review, completed
5. Tables include:
   - profiles
   - work_orders
   - raw_materials
   - stage_records
   - product_orders
   - workflow_events
6. Endpoints include:
   - /auth/login, /auth/logout, /me
   - /users, /users/:id
   - /work-orders, /work-orders/:id
   - /work-orders/:id/raw-materials
   - /work-orders/:id/stages/:stage
   - /work-orders/:id/advance
   - /inbox
   - /product-orders

Primary files:
- backend/schema.sql
- backend/server.mjs
- backend/lib/workflow.mjs
- backend/postman/Capco Backend.postman_collection.json
- backend/seed.sql

## 4) Differences and Required Changes

### A) Workflow Model Gap
Current:
- Frontend supports 3 stages only.

Backend:
- Workflow is 12-stage with review and approval hops.

Need:
1. Extend stage model and UI to handle all backend stages.
2. Add review screens for production head and head of operations.
3. Replace local stage computation with server-driven current_stage and status.

### B) Status Model Gap
Current:
- Yet to Start, In-progress, Completed.

Backend:
- yet_to_start, in_progress, awaiting_production_head_review, awaiting_head_of_operations_review, completed.

Need:
1. Introduce status mapping layer for backend-to-UI labels.
2. Update badge logic and table filters to include awaiting review states.

### C) Identity and Roles Gap
Current:
- Role model in UI is effectively supervisor/operator.

Backend:
- super_admin, production_head, head_of_operations, person_a, person_b, person_c, person_d with stage_scope and ownership.

Need:
1. Add login/session storage for backend tokens.
2. Fetch /me and derive role-based routes/permissions.
3. Restrict stage actions by role and assignment.

### D) Data Contract Gap
Current:
- Local rows with frontend-specific fields and generated IDs.

Backend:
- Canonical IDs and records split across work_orders, raw_materials, stage_records, workflow_events.

Need:
1. Create frontend API models for backend payload/response shapes.
2. Map local field names to backend fields.
3. Move from local random IDs to backend-generated identifiers.

### E) Persistence and Audit Gap
Current:
- No durable audit trail beyond browser state.

Backend:
- workflow_events and stage_records provide timeline.

Need:
1. Build timeline/event history section in detail pages.
2. Surface created_by, assignee, timestamps, and next_action from API detail response.

### F) Product Orders and Inbox Gap
Current:
- Not integrated in current workflow UI.

Backend:
- /product-orders and /inbox endpoints are available.

Need:
1. Add inbox view for user-specific tasks.
2. Add product orders list/create UI if required in scope.

## 5) Recommended Implementation Plan

### P0 (Must Do First)
1. API client foundation
   - token handling
   - common request wrapper
   - error normalization
2. Auth integration
   - login/logout
   - /me bootstrap and role-aware session
3. Work orders migration
   - list/create/get/update via backend endpoints
4. Detail page write integration (first 3 stages)
   - POST raw material
   - POST stage metallisation/slitting
5. Status/stage mapping layer in UI

### P1 (Core Workflow Completion)
1. Add remaining stages: winding, spray, soldening, epoxy, test_print_pack, finished_goods.
2. Add review transitions using /work-orders/:id/advance.
3. Introduce inbox and assignee-driven task views.
4. Add workflow event timeline.

### P2 (Stabilization and Production Readiness)
1. Remove or gate localStorage fallback mode.
2. Add retry/toast/error UX for all API actions.
3. Add end-to-end regression checklist using Postman collection.
4. Add role-specific QA matrix and UAT scripts.

## 6) Effort Estimation
Assumptions:
1. Existing UI screens remain mostly reusable.
2. Backend contracts are stable (no major schema or endpoint changes).
3. One frontend dev primary, backend dev available for clarifications.

Estimated effort (frontend-heavy):
1. P0: 5 to 7 dev days
2. P1: 6 to 9 dev days
3. P2: 3 to 4 dev days

Total:
- 14 to 20 dev days
- Approx 3 to 4 calendar weeks with one frontend developer
- Approx 2 to 3 calendar weeks with two people in parallel

Parallelization suggestion (2 people):
1. Person 1: auth/session + list/detail read integration + status mapping
2. Person 2: stage submit integration + inbox/review flows + timeline

## 7) Documentation To Add or Update

### Update Existing
1. DOCUMENTATION.md
   - Add backend architecture section.
   - Replace local-only state section with dual mode (temporary) then backend-only target.
   - Expand workflow stages/status sections to match backend enums.

### Add New Docs
1. API_CONTRACT_MAP.md
   - Endpoint-by-endpoint request/response examples tied to UI actions.
2. ROLE_STAGE_PERMISSION_MATRIX.md
   - Role to stage ownership and allowed actions.
3. DATA_MAPPING_LOCAL_TO_BACKEND.md
   - Field-level mapping from old local model to backend model.
4. QA_UAT_WORKFLOW_CHECKLIST.md
   - Scenario tests by role and stage.

## 8) Key Risks and Dependency Notes
1. Stage payload structure is currently generic in stage_records payload; frontend and backend should align on payload keys per stage to avoid drift.
2. Review stage transitions rely on role correctness and seeded profiles; environment setup must be validated early.
3. Any late change in role-stage ownership will affect route guards and button visibility logic.

## 9) Immediate Next Actions
1. Freeze API payload contracts for each stage (raw, metallisation, slitting, winding, spray, soldening, epoxy, test_print_pack, finished_goods).
2. Implement P0 integration behind a feature toggle if fallback is needed.
3. Run Postman smoke tests after each major frontend integration milestone.
4. Schedule combined QA pass for role-based transitions and advance approvals.
