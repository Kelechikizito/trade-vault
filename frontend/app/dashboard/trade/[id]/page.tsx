"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import {
  getTrade,
  fundTrade,
  confirmShipped,
  confirmCustomsCleared,
  confirmGoodsReceived,
  meetTradeConditions,
  confirmDelivery,
  raiseDispute,
  claimRefund,
  cancelTrade,
  resolveDispute,
} from "@/lib/mock-contract";
import { Trade, UserRole } from "@/lib/types";
import { StatusBadge } from "@/components/status-badge";
import { StepTimeline } from "@/components/step-timeline";
import { ShipmentMap } from "@/components/shipment-map";
import { MilestoneList } from "@/components/milestone-list";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { LiquidButton } from "@/components/ui/liquid-button";
import { ConfirmActionModal } from "@/components/confirm-action-modal";

type PendingAction = {
  action: () => boolean;
  name: string;
  title: string;
  description: string;
  confirmLabel: string;
  confirmVariant: "primary" | "destructive";
} | null;

export default function TradeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { address } = useAccount();
  const [trade, setTrade] = useState<Trade | null>(null);
  const [userRole, setUserRole] = useState<UserRole>("none");
  const [loading, setLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  useEffect(() => {
    const loadedTrade = getTrade(id);
    setTrade(loadedTrade);

    if (loadedTrade && address) {
      if (address === loadedTrade.buyer) setUserRole("buyer");
      else if (address === loadedTrade.supplier) setUserRole("supplier");
      else if (address === loadedTrade.arbiter) setUserRole("arbiter");
    }
  }, [id, address]);

  const handleAction = (action: () => boolean, actionName: string) => {
    if (!trade) return;
    setLoading(true);

    try {
      const success = action();
      if (success) {
        const updated = getTrade(trade.id);
        if (updated) {
          setTrade(updated);
        }
      } else {
        console.log(`[v0] ${actionName} failed - invalid state`);
      }
    } catch (error) {
      console.error(`[v0] Error during ${actionName}:`, error);
    } finally {
      setLoading(false);
      setPendingAction(null);
    }
  };

  // Actions with real financial consequence route through the confirmation
  // modal instead of firing directly on click.
  const requestConfirmation = (details: NonNullable<PendingAction>) => {
    setPendingAction(details);
  };

  if (!trade) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-border">
          <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
            <Link href="/">
              <div className="text-2xl font-bold text-primary cursor-pointer">
                TradeVault
              </div>
            </Link>
            <ConnectButton />
          </div>
        </header>
        <div className="max-w-6xl mx-auto px-4 py-20 text-center">
          <p className="text-muted-foreground">Trade not found</p>
        </div>
      </main>
    );
  }

  const canFund = userRole === "buyer" && trade.status === "Created";
  const canConfirmShipped =
    userRole === "arbiter" &&
    trade.status === "Funded" &&
    !trade.conditions.shipped;
  const canConfirmMilestones =
    userRole === "arbiter" &&
    (trade.status === "Shipped" || trade.status === "Funded");
  const canMeetConditions =
    userRole === "arbiter" &&
    trade.status === "Shipped" &&
    trade.conditions.shipped &&
    trade.conditions.customsCleared &&
    trade.conditions.goodsReceived;
  const canReleasePayment =
    userRole === "arbiter" && trade.status === "Conditions Met";
  const canRaiseDispute =
    (userRole === "buyer" || userRole === "supplier") &&
    trade.status === "Funded";
  const canClaimRefund = userRole === "buyer" && trade.status === "Funded";
  const canCancelTrade =
    userRole === "buyer" &&
    (trade.status === "Created" || trade.status === "Funded");
  const canResolveDispute =
    userRole === "arbiter" && trade.status === "Dispute";

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/">
            <div className="text-2xl font-bold text-primary cursor-pointer">
              TradeVault
            </div>
          </Link>
          <ConnectButton />
        </div>
      </header>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Link
          href="/dashboard"
          className="text-primary hover:underline text-sm mb-6 inline-block"
        >
          ← Back to Dashboard
        </Link>

        {/* Trade Header */}
        <div className="glass-panel p-8 rounded-lg mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">{trade.id}</h1>
              <p className="text-muted-foreground mt-1">{trade.description}</p>
            </div>
            <StatusBadge status={trade.status} />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 pt-6 border-t border-border">
            <div>
              <p className="text-xs text-muted-foreground">Trade Amount</p>
              <p className="text-lg font-bold text-foreground">
                {trade.amount.toLocaleString()} {trade.currency}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Your Role</p>
              <p className="text-lg font-bold text-foreground capitalize">
                {userRole || "Observer"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Funding Deadline</p>
              <p className="text-lg font-bold text-foreground">
                {new Date(trade.fundingDeadline * 1000).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Created</p>
              <p className="text-lg font-bold text-foreground">
                {new Date(trade.createdAt * 1000).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Status Timeline */}
        <div className="glass-panel p-8 rounded-lg mb-8">
          <h2 className="text-xl font-bold text-foreground mb-6">
            Trade Progress
          </h2>
          <StepTimeline status={trade.status} />
        </div>

        {/* Shipment Map */}
        <div className="mb-8">
          <ShipmentMap trade={trade} />
        </div>

        {/* Milestones */}
        <div className="glass-panel p-8 rounded-lg mb-8">
          <h2 className="text-xl font-bold text-foreground mb-6">
            Shipment Milestones
          </h2>
          <MilestoneList trade={trade} />
        </div>

        {/* Action Buttons */}
        <div className="glass-panel p-8 rounded-lg">
          <h2 className="text-xl font-bold text-foreground mb-6">Actions</h2>

          {userRole === "none" ? (
            <p className="text-muted-foreground">
              You are not involved in this trade.
            </p>
          ) : (
            <div className="space-y-4">
              {/* Buyer Actions */}
              {userRole === "buyer" && (
                <div className="space-y-3">
                  {canFund && (
                    <LiquidButton
                      variant="primary"
                      className="w-full py-3"
                      disabled={loading}
                      onClick={() =>
                        handleAction(() => fundTrade(trade.id), "Fund Trade")
                      }
                    >
                      {loading
                        ? "Processing..."
                        : "Fund Trade (Approve & Deposit)"}
                    </LiquidButton>
                  )}
                  {canRaiseDispute && (
                    <LiquidButton
                      variant="destructive"
                      className="w-full py-3"
                      disabled={loading}
                      onClick={() =>
                        handleAction(
                          () =>
                            raiseDispute(
                              trade.id,
                              address || "",
                              "Goods not received",
                            ),
                          "Raise Dispute",
                        )
                      }
                    >
                      {loading ? "Processing..." : "Raise Dispute"}
                    </LiquidButton>
                  )}
                  {canClaimRefund && (
                    <LiquidButton
                      variant="secondary"
                      className="w-full py-3"
                      disabled={loading}
                      onClick={() =>
                        handleAction(
                          () => claimRefund(trade.id),
                          "Claim Refund",
                        )
                      }
                    >
                      {loading
                        ? "Processing..."
                        : "Claim Refund (Deadline Passed)"}
                    </LiquidButton>
                  )}
                  {canCancelTrade && (
                    <LiquidButton
                      variant="secondary"
                      className="w-full py-3"
                      disabled={loading}
                      onClick={() =>
                        handleAction(
                          () => cancelTrade(trade.id),
                          "Cancel Trade",
                        )
                      }
                    >
                      {loading ? "Processing..." : "Cancel Trade"}
                    </LiquidButton>
                  )}
                </div>
              )}

              {/* Supplier Actions */}
              {userRole === "supplier" && (
                <div className="space-y-3">
                  {canRaiseDispute && (
                    <LiquidButton
                      variant="destructive"
                      className="w-full py-3"
                      disabled={loading}
                      onClick={() =>
                        handleAction(
                          () =>
                            raiseDispute(
                              trade.id,
                              address || "",
                              "Payment not received",
                            ),
                          "Raise Dispute",
                        )
                      }
                    >
                      {loading ? "Processing..." : "Raise Dispute"}
                    </LiquidButton>
                  )}
                </div>
              )}

              {/* Arbiter Actions */}
              {userRole === "arbiter" && (
                <div className="space-y-3">
                  {canConfirmShipped && (
                    <LiquidButton
                      variant="secondary"
                      className="w-full py-3"
                      disabled={loading}
                      onClick={() =>
                        handleAction(
                          () => confirmShipped(trade.id, true),
                          "Confirm Shipped",
                        )
                      }
                    >
                      {loading ? "Processing..." : "Confirm Goods Shipped"}
                    </LiquidButton>
                  )}

                  {canConfirmMilestones && (
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-foreground">
                        Confirm Milestones:
                      </label>
                      {!trade.conditions.customsCleared && (
                        <LiquidButton
                          variant="secondary"
                          className="w-full"
                          disabled={loading}
                          onClick={() =>
                            handleAction(
                              () => confirmCustomsCleared(trade.id, true),
                              "Confirm Customs",
                            )
                          }
                        >
                          {loading
                            ? "Processing..."
                            : "Confirm Customs Cleared"}
                        </LiquidButton>
                      )}
                      {!trade.conditions.goodsReceived &&
                        trade.conditions.shipped && (
                          <LiquidButton
                            variant="secondary"
                            className="w-full"
                            disabled={loading}
                            onClick={() =>
                              handleAction(
                                () => confirmGoodsReceived(trade.id, true),
                                "Confirm Received",
                              )
                            }
                          >
                            {loading
                              ? "Processing..."
                              : "Confirm Goods Received"}
                          </LiquidButton>
                        )}
                    </div>
                  )}

                  {canMeetConditions && (
                    <LiquidButton
                      variant="primary"
                      className="w-full py-3"
                      disabled={loading}
                      onClick={() =>
                        handleAction(
                          () => meetTradeConditions(trade.id),
                          "Mark Conditions Met",
                        )
                      }
                    >
                      {loading ? "Processing..." : "Mark All Conditions Met"}
                    </LiquidButton>
                  )}

                  {canReleasePayment && (
                    <LiquidButton
                      variant="primary"
                      className="w-full py-3"
                      disabled={loading}
                      onClick={() =>
                        requestConfirmation({
                          action: () => confirmDelivery(trade.id),
                          name: "Confirm Delivery",
                          title: "Release payment to supplier?",
                          description:
                            "This confirms delivery and releases the locked funds to the supplier. This cannot be undone once submitted.",
                          confirmLabel: "Release Payment",
                          confirmVariant: "primary",
                        })
                      }
                    >
                      Confirm Delivery & Release Payment
                    </LiquidButton>
                  )}

                  {canResolveDispute && (
                    <div className="space-y-2 pt-4 border-t border-border">
                      <p className="text-sm font-semibold text-foreground">
                        Resolve Dispute:
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <LiquidButton
                          variant="primary"
                          disabled={loading}
                          onClick={() =>
                            requestConfirmation({
                              action: () => resolveDispute(trade.id, true),
                              name: "Release to Supplier",
                              title: "Release payment to supplier?",
                              description:
                                "This resolves the dispute in the supplier's favor and releases the locked funds to them. This cannot be undone once submitted.",
                              confirmLabel: "Release to Supplier",
                              confirmVariant: "primary",
                            })
                          }
                        >
                          Release to Supplier
                        </LiquidButton>
                        <LiquidButton
                          variant="secondary"
                          disabled={loading}
                          onClick={() =>
                            requestConfirmation({
                              action: () => resolveDispute(trade.id, false),
                              name: "Refund to Buyer",
                              title: "Refund payment to buyer?",
                              description:
                                "This resolves the dispute in the buyer's favor and refunds the locked funds to them. This cannot be undone once submitted.",
                              confirmLabel: "Refund to Buyer",
                              confirmVariant: "primary",
                            })
                          }
                        >
                          Refund to Buyer
                        </LiquidButton>
                      </div>
                    </div>
                  )}

                  {canCancelTrade && (
                    <LiquidButton
                      variant="secondary"
                      className="w-full py-3"
                      disabled={loading}
                      onClick={() =>
                        handleAction(
                          () => cancelTrade(trade.id),
                          "Cancel Trade",
                        )
                      }
                    >
                      {loading ? "Processing..." : "Cancel Trade"}
                    </LiquidButton>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Trade Details Section */}
        <div className="grid md:grid-cols-3 gap-6 mt-8">
          <div className="glass-panel p-6 rounded-lg">
            <p className="text-xs text-muted-foreground mb-2">Buyer</p>
            <p className="font-mono text-sm text-foreground break-all">
              {trade.buyer}
            </p>
          </div>
          <div className="glass-panel p-6 rounded-lg">
            <p className="text-xs text-muted-foreground mb-2">Supplier</p>
            <p className="font-mono text-sm text-foreground break-all">
              {trade.supplier}
            </p>
          </div>
          <div className="glass-panel p-6 rounded-lg">
            <p className="text-xs text-muted-foreground mb-2">Arbiter</p>
            <p className="font-mono text-sm text-foreground break-all">
              {trade.arbiter}
            </p>
          </div>
        </div>
      </div>

      {pendingAction && (
        <ConfirmActionModal
          trade={trade}
          title={pendingAction.title}
          description={pendingAction.description}
          confirmLabel={pendingAction.confirmLabel}
          confirmVariant={pendingAction.confirmVariant}
          loading={loading}
          onConfirm={() =>
            handleAction(pendingAction.action, pendingAction.name)
          }
          onCancel={() => setPendingAction(null)}
        />
      )}
    </main>
  );
}
