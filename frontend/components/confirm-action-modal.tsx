"use client";

import { Trade } from "@/lib/types";
import { LiquidButton } from "@/components/ui/liquid-button";

interface ConfirmActionModalProps {
  trade: Trade;
  title: string;
  description: string;
  confirmLabel: string;
  confirmVariant?: "primary" | "destructive";
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmActionModal({
  trade,
  title,
  description,
  confirmLabel,
  confirmVariant = "primary",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmActionModalProps) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div className="glass-panel w-full max-w-lg rounded-lg p-8">
        <h2
          id="confirm-modal-title"
          className="text-xl font-bold text-foreground mb-2"
        >
          {title}
        </h2>
        <p className="text-sm text-muted-foreground mb-6">{description}</p>

        <div className="rounded-lg bg-muted/30 p-4 space-y-3 mb-6">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Trade ID</span>
            <span className="font-mono text-foreground">{trade.id}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Amount</span>
            <span className="font-semibold text-foreground">
              {trade.amount.toLocaleString()} {trade.currency}
            </span>
          </div>
          <div className="pt-2 border-t border-border space-y-2">
            <div>
              <p className="text-xs text-muted-foreground">Buyer</p>
              <p className="font-mono text-xs text-foreground break-all">
                {trade.buyer}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Supplier</p>
              <p className="font-mono text-xs text-foreground break-all">
                {trade.supplier}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Arbiter</p>
              <p className="font-mono text-xs text-foreground break-all">
                {trade.arbiter}
              </p>
            </div>
          </div>
        </div>

        <p className="text-xs text-destructive font-medium mb-6">
          This action is irreversible once submitted on-chain.
        </p>

        <div className="flex gap-4">
          <LiquidButton
            type="button"
            variant="secondary"
            className="flex-1"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </LiquidButton>
          <LiquidButton
            type="button"
            variant={confirmVariant}
            className="flex-1"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Processing..." : confirmLabel}
          </LiquidButton>
        </div>
      </div>
    </div>
  );
}
