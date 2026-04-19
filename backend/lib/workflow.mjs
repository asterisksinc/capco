export const roles = [
  "super_admin",
  "head_of_operations",
  "production_head",
  "person_a",
  "person_b",
  "person_c",
  "person_d",
];

export const workflowStages = [
  "raw_material",
  "metallisation",
  "slitting",
  "winding",
  "spray",
  "soldening",
  "epoxy",
  "test_print_pack",
  "finished_goods",
  "production_head_review",
  "head_of_operations_review",
  "completed",
];

export const stageLabels = {
  raw_material: "Raw Material",
  metallisation: "Metallisation",
  slitting: "Slitting",
  winding: "Winding",
  spray: "Spray",
  soldening: "Soldening",
  epoxy: "Epoxy",
  test_print_pack: "Test, Print & Pack",
  finished_goods: "Finished Goods",
  production_head_review: "Production Head Review",
  head_of_operations_review: "Head of Operations Review",
  completed: "Completed",
};

export const stageOwners = {
  raw_material: "person_a",
  metallisation: "person_a",
  slitting: "person_a",
  winding: "person_b",
  spray: "person_b",
  soldening: "person_c",
  epoxy: "person_c",
  test_print_pack: "person_d",
  finished_goods: "person_d",
  production_head_review: "production_head",
  head_of_operations_review: "head_of_operations",
  completed: "super_admin",
};

export const roleStageScopes = {
  super_admin: workflowStages,
  head_of_operations: ["head_of_operations_review", "completed"],
  production_head: ["raw_material", "production_head_review", "completed"],
  person_a: ["raw_material", "metallisation", "slitting"],
  person_b: ["winding", "spray"],
  person_c: ["soldening", "epoxy"],
  person_d: ["test_print_pack", "finished_goods"],
};

export function displayStage(stage) {
  return stageLabels[stage] || stage;
}

export function normalizeStage(stage) {
  return String(stage || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

export function nextStage(currentStage) {
  const index = workflowStages.indexOf(normalizeStage(currentStage));
  if (index === -1 || index === workflowStages.length - 1) return "completed";
  return workflowStages[index + 1];
}

export function previousStage(currentStage) {
  const index = workflowStages.indexOf(normalizeStage(currentStage));
  if (index <= 0) return "raw_material";
  return workflowStages[index - 1];
}

export function ownerRoleForStage(stage) {
  return stageOwners[normalizeStage(stage)] || "production_head";
}

export function canHandleStage(role, stage) {
  const normalizedRole = String(role || "").trim().toLowerCase();
  if (normalizedRole === "super_admin") return true;
  const normalizedStage = normalizeStage(stage);
  return (roleStageScopes[normalizedRole] || []).includes(normalizedStage);
}

export function isReviewStage(stage) {
  const normalized = normalizeStage(stage);
  return normalized === "production_head_review" || normalized === "head_of_operations_review";
}

export function initialAssigneeRole() {
  return "person_a";
}

export function nextAssigneeRoleForStage(stage) {
  const normalized = normalizeStage(stage);
  return stageOwners[normalized] || "production_head";
}
