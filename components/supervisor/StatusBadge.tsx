type StatusBadgeProps = {
  status: string;
};

function normalizeStatus(status: string): string {
  return status.trim().toLowerCase().replace(/\s+/g, "_");
}

function getLabel(status: string): string {
  const key = normalizeStatus(status);

  if (key === "yet_to_start") return "Yet to Start";
  if (key === "in_progress") return "In Progress";
  if (key === "completed") return "Completed";
  if (key === "critical") return "Critical";

  return status;
}

function getClasses(status: string): string {
  const key = normalizeStatus(status);

  if (key === "yet_to_start") {
    return "bg-[#F2F4F7] text-[#667085]";
  }

  if (key === "in_progress") {
    return "bg-[#EAF3FF] text-[#4F8EE8]";
  }

  if (key === "completed") {
    return "bg-[#EAF8F1] text-[#39B979]";
  }

  if (key === "critical") {
    return "bg-[#FFF0E7] text-[#F08A46]";
  }

  return "bg-[#F2F4F7] text-[#667085]";
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex h-[26px] items-center rounded-full px-3 text-[12px] font-semibold ${getClasses(
        status
      )}`}
    >
      {getLabel(status)}
    </span>
  );
}
