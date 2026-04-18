import Link from "next/link";

import { StatusBadge } from "./StatusBadge";

export type WorkOrderRow = {
  id: string;
  micron: string;
  width: string;
  qty: string;
  stage: string;
  date: string;
  status: string;
  actionHref: string;
};

type WorkOrderTableProps = {
  title?: string;
  firstColumnLabel?: string;
  rows: WorkOrderRow[];
};

export function WorkOrderTable({
  title,
  firstColumnLabel = "Work Orders ID",
  rows,
}: WorkOrderTableProps) {
  return (
    <section className="overflow-hidden rounded-[12px] border border-[#EAECF0] bg-white">
      {title ? (
        <div className="border-b border-[#EAECF0] px-6 py-4">
          <p className="text-[28px] font-semibold tracking-[-0.02em] text-[#171717]">{title}</p>
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] border-collapse">
          <thead>
            <tr className="border-b border-[#EAECF0] bg-[#F9FAFB]">
              <th className="px-6 py-3.5 text-left text-[13px] font-semibold text-[#667085]">{firstColumnLabel}</th>
              <th className="px-6 py-3.5 text-left text-[13px] font-semibold text-[#667085]">Micron</th>
              <th className="px-6 py-3.5 text-left text-[13px] font-semibold text-[#667085]">Width</th>
              <th className="px-6 py-3.5 text-left text-[13px] font-semibold text-[#667085]">Qty (kg)</th>
              <th className="px-6 py-3.5 text-left text-[13px] font-semibold text-[#667085]">Stage</th>
              <th className="px-6 py-3.5 text-left text-[13px] font-semibold text-[#667085]">Date</th>
              <th className="px-6 py-3.5 text-left text-[13px] font-semibold text-[#667085]">Status</th>
              <th className="px-6 py-3.5 text-left text-[13px] font-semibold text-[#667085]">Action</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => (
              <tr key={`${row.id}-${row.stage}`} className="border-b border-[#EAECF0] last:border-b-0">
                <td className="px-6 py-4 text-[14px] font-semibold text-[#344054]">{row.id}</td>
                <td className="px-6 py-4 text-[14px] text-[#475467]">{row.micron}</td>
                <td className="px-6 py-4 text-[14px] text-[#475467]">{row.width}</td>
                <td className="px-6 py-4 text-[14px] text-[#475467]">{row.qty}</td>
                <td className="px-6 py-4 text-[14px] text-[#475467]">{row.stage}</td>
                <td className="px-6 py-4 text-[14px] text-[#475467]">{row.date}</td>
                <td className="px-6 py-4 text-[14px]">
                  <StatusBadge status={row.status} />
                </td>
                <td className="px-6 py-4">
                  <Link
                    href={row.actionHref}
                    className="text-[14px] font-semibold text-white underline-offset-2 hover:underline"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
