import { TradeStatus } from "@/lib/types";

const statusColors: Record<
  TradeStatus,
  { bg: string; text: string; border: string }
> = {
  Created: {
    bg: "bg-slate-100 dark:bg-slate-900",
    text: "text-slate-800 dark:text-slate-200",
    border: "border-slate-300 dark:border-slate-700",
  },
  Funded: {
    bg: "bg-blue-100 dark:bg-blue-900",
    text: "text-blue-800 dark:text-blue-200",
    border: "border-blue-300 dark:border-blue-700",
  },
  Shipped: {
    bg: "bg-teal-100 dark:bg-teal-900",
    text: "text-teal-800 dark:text-teal-200",
    border: "border-teal-300 dark:border-teal-700",
  },
  Dispute: {
    bg: "bg-red-100 dark:bg-red-900",
    text: "text-red-800 dark:text-red-200",
    border: "border-red-300 dark:border-red-700",
  },
  "Conditions Met": {
    bg: "bg-amber-100 dark:bg-amber-900",
    text: "text-amber-800 dark:text-amber-200",
    border: "border-amber-300 dark:border-amber-700",
  },
  Released: {
    bg: "bg-emerald-100 dark:bg-emerald-900",
    text: "text-emerald-800 dark:text-emerald-200",
    border: "border-emerald-300 dark:border-emerald-700",
  },
  Cancelled: {
    bg: "bg-gray-100 dark:bg-gray-900",
    text: "text-gray-800 dark:text-gray-200",
    border: "border-gray-300 dark:border-gray-700",
  },
  Refunded: {
    bg: "bg-orange-100 dark:bg-orange-900",
    text: "text-orange-800 dark:text-orange-200",
    border: "border-orange-300 dark:border-orange-700",
  },
};

export function StatusBadge({ status }: { status: TradeStatus }) {
  const colors = statusColors[status];

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${colors.bg} ${colors.text} ${colors.border}`}
    >
      {status}
    </span>
  );
}
