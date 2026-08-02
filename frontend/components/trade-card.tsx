import Link from "next/link";
import { Trade } from "@/lib/types";
import { StatusBadge } from "./status-badge";

export function TradeCard({ trade }: { trade: Trade }) {
  return (
    <Link href={`/dashboard/trade/${trade.id}`}>
      <div className="glass-panel p-6 rounded-lg cursor-pointer hover:shadow-lg transition-shadow">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              {trade.id}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {trade.description}
            </p>
          </div>
          <StatusBadge status={trade.status} />
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-xs text-muted-foreground">Amount</p>
            <p className="font-semibold text-foreground">
              {trade.amount.toLocaleString()} {trade.currency}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Supplier</p>
            <p className="font-mono text-sm text-foreground">
              {trade.supplier.slice(0, 8)}...
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>
            Created: {new Date(trade.createdAt * 1000).toLocaleDateString()}
          </span>
        </div>
      </div>
    </Link>
  );
}
