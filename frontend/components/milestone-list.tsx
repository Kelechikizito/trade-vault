import { Trade } from "@/lib/types";

export function MilestoneList({ trade }: { trade: Trade }) {
  const milestones = [
    {
      title: "Order Created",
      completed: !!trade.createdAt,
      date: trade.createdAt ? new Date(trade.createdAt * 1000) : null,
      description: "Trade terms agreed and documented",
    },
    {
      title: "Payment Funded",
      completed: !!trade.fundedAt,
      date: trade.fundedAt ? new Date(trade.fundedAt * 1000) : null,
      description: "Buyer has funded the escrow account",
    },
    {
      title: "Goods Shipped",
      completed: trade.conditions.shipped,
      date: trade.shippedAt ? new Date(trade.shippedAt * 1000) : null,
      description: "Supplier has dispatched the order",
    },
    {
      title: "Customs Cleared",
      completed: trade.conditions.customsCleared,
      date: null,
      description: "Goods have cleared customs inspection",
    },
    {
      title: "Goods Received",
      completed: trade.conditions.goodsReceived,
      date: trade.deliveredAt ? new Date(trade.deliveredAt * 1000) : null,
      description: "Buyer has confirmed receipt of goods",
    },
    {
      title: "Payment Released",
      completed: trade.status === "Released",
      date: null,
      description: "Funds released to supplier",
    },
  ];

  return (
    <div className="space-y-4">
      {milestones.map((milestone, index) => (
        <div key={index} className="flex gap-4">
          {/* Timeline dot */}
          <div className="flex flex-col items-center">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                milestone.completed
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground border-2 border-border"
              }`}
            >
              {milestone.completed ? "✓" : index + 1}
            </div>
            {index < milestones.length - 1 && (
              <div
                className={`w-1 h-8 mt-2 ${milestone.completed ? "bg-primary" : "bg-border"}`}
              />
            )}
          </div>

          {/* Milestone content */}
          <div className="flex-1 pt-1">
            <h4 className="font-semibold text-foreground">{milestone.title}</h4>
            <p className="text-sm text-muted-foreground">
              {milestone.description}
            </p>
            {milestone.date && (
              <p className="text-xs text-muted-foreground mt-1">
                {milestone.date.toLocaleString()}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
