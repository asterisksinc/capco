import { useMemo } from "react";

export function useWorkOrderAccess(workOrders: any[]) {
  return useMemo(() => {
    if (!workOrders || workOrders.length === 0) {
      return { isLocked: () => false, accessibleYetToStart: [] };
    }

    const yetToStart = workOrders.filter((wo) => wo.status === "Yet to Start");

    const sortedYetToStart = yetToStart.sort((a, b) => {
      const timeA = new Date(a.created_at).getTime();
      const timeB = new Date(b.created_at).getTime();
      if (timeA !== timeB) return timeA - timeB;
      // Fallback to ID sorting if timestamps are identical
      return (a.work_order_no || a.id).localeCompare(b.work_order_no || b.id);
    });

    const accessibleYetToStart = sortedYetToStart.slice(0, 2).map((wo) => wo.id);

    const isLocked = (woOrId: any | string) => {
      // Find the work order if an ID is passed
      const wo = typeof woOrId === "string" ? workOrders.find((w) => w.id === woOrId || w.work_order_no === woOrId) : woOrId;
      if (!wo) return false;

      // Only "Yet to Start" work orders can be locked
      if (wo.status !== "Yet to Start") return false;

      return !accessibleYetToStart.includes(wo.id);
    };

    return { isLocked, accessibleYetToStart };
  }, [workOrders]);
}
