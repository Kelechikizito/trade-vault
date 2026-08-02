import { TradeStatus } from "@/lib/types";

interface Step {
  label: string;
  completed: boolean;
  status: TradeStatus;
}

const steps: Step[] = [
  { label: "Created", completed: false, status: "Created" },
  { label: "Funded", completed: false, status: "Funded" },
  { label: "Shipped", completed: false, status: "Shipped" },
  { label: "Conditions Met", completed: false, status: "Conditions Met" },
  { label: "Released", completed: false, status: "Released" },
];

const statusToStepIndex: Record<TradeStatus, number> = {
  Created: 0,
  Funded: 1,
  Shipped: 2,
  Dispute: 2,
  "Conditions Met": 3,
  Released: 4,
  Cancelled: -1,
  Refunded: -1,
};

export function StepTimeline({ status }: { status: TradeStatus }) {
  const currentStepIndex = statusToStepIndex[status];

  return (
    <div className="flex items-center justify-between w-full py-8">
      {steps.map((step, index) => {
        const isCompleted = index <= currentStepIndex && currentStepIndex >= 0;
        const isCurrent = index === currentStepIndex;

        return (
          <div key={step.label} className="flex flex-col items-center flex-1">
            {/* Circle */}
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 font-semibold text-sm transition-colors ${
                isCompleted
                  ? "bg-primary text-primary-foreground"
                  : isCurrent
                    ? "bg-secondary text-secondary-foreground border-2 border-primary"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {isCompleted ? "✓" : index + 1}
            </div>

            {/* Label */}
            <p
              className={`text-xs font-medium text-center ${isCompleted ? "text-foreground" : "text-muted-foreground"}`}
            >
              {step.label}
            </p>

            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div
                className={`h-1 flex-1 mx-2 mt-2 ${
                  isCompleted ? "bg-primary" : "bg-border"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
