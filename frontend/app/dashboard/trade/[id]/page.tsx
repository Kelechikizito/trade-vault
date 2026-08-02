"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
// import { useWallet } from "@/lib/wallet-context";
import { useAccount } from "wagmi";
import {
  getTrade,
  fundTrade,
  confirmShipped,
  confirmCustomsCleared,
  confirmGoodsReceived,
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
          console.log(`[v0] ${actionName} completed successfully`);
        }
      } else {
        console.log(`[v0] ${actionName} failed - invalid state`);
      }
    } catch (error) {
      console.error(`[v0] Error during ${actionName}:`, error);
    } finally {
      setLoading(false);
    }
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
  const canShip = userRole === "supplier" && trade.status === "Funded";
  const canConfirmMilestones =
    userRole === "arbiter" &&
    (trade.status === "Shipped" || trade.status === "Funded");
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
                    <button
                      onClick={() =>
                        handleAction(() => fundTrade(trade.id), "Fund Trade")
                      }
                      disabled={loading}
                      className="w-full px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      {loading
                        ? "Processing..."
                        : "Fund Trade (Approve & Deposit)"}
                    </button>
                  )}
                  {canRaiseDispute && (
                    <button
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
                      disabled={loading}
                      className="w-full px-6 py-3 rounded-lg bg-destructive text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      {loading ? "Processing..." : "Raise Dispute"}
                    </button>
                  )}
                  {canClaimRefund && (
                    <button
                      onClick={() =>
                        handleAction(
                          () => claimRefund(trade.id),
                          "Claim Refund",
                        )
                      }
                      disabled={loading}
                      className="w-full px-6 py-3 rounded-lg bg-accent text-accent-foreground font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      {loading
                        ? "Processing..."
                        : "Claim Refund (Deadline Passed)"}
                    </button>
                  )}
                  {canCancelTrade && (
                    <button
                      onClick={() =>
                        handleAction(
                          () => cancelTrade(trade.id),
                          "Cancel Trade",
                        )
                      }
                      disabled={loading}
                      className="w-full px-6 py-3 rounded-lg bg-muted text-muted-foreground font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      {loading ? "Processing..." : "Cancel Trade"}
                    </button>
                  )}
                </div>
              )}

              {/* Supplier Actions */}
              {userRole === "supplier" && (
                <div className="space-y-3">
                  {canShip && (
                    <button
                      onClick={() =>
                        handleAction(
                          () => confirmShipped(trade.id, true),
                          "Confirm Shipped",
                        )
                      }
                      disabled={loading}
                      className="w-full px-6 py-3 rounded-lg bg-secondary text-secondary-foreground font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      {loading ? "Processing..." : "Confirm Goods Shipped"}
                    </button>
                  )}
                  {canRaiseDispute && (
                    <button
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
                      disabled={loading}
                      className="w-full px-6 py-3 rounded-lg bg-destructive text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      {loading ? "Processing..." : "Raise Dispute"}
                    </button>
                  )}
                </div>
              )}

              {/* Arbiter Actions */}
              {userRole === "arbiter" && (
                <div className="space-y-3">
                  {canConfirmMilestones && (
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-foreground">
                        Confirm Milestones:
                      </label>
                      {!trade.conditions.customsCleared && (
                        <button
                          onClick={() =>
                            handleAction(
                              () => confirmCustomsCleared(trade.id, true),
                              "Confirm Customs",
                            )
                          }
                          disabled={loading}
                          className="w-full px-4 py-2 rounded-lg bg-secondary/50 text-secondary-foreground font-medium hover:bg-secondary transition-colors disabled:opacity-50"
                        >
                          {loading
                            ? "Processing..."
                            : "Confirm Customs Cleared"}
                        </button>
                      )}
                      {!trade.conditions.goodsReceived &&
                        trade.conditions.shipped && (
                          <button
                            onClick={() =>
                              handleAction(
                                () => confirmGoodsReceived(trade.id, true),
                                "Confirm Received",
                              )
                            }
                            disabled={loading}
                            className="w-full px-4 py-2 rounded-lg bg-secondary/50 text-secondary-foreground font-medium hover:bg-secondary transition-colors disabled:opacity-50"
                          >
                            {loading
                              ? "Processing..."
                              : "Confirm Goods Received"}
                          </button>
                        )}
                    </div>
                  )}
                  {canResolveDispute && (
                    <div className="space-y-2 pt-4 border-t border-border">
                      <p className="text-sm font-semibold text-foreground">
                        Resolve Dispute:
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() =>
                            handleAction(
                              () => resolveDispute(trade.id, true),
                              "Release to Supplier",
                            )
                          }
                          disabled={loading}
                          className="px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                          {loading ? "Processing..." : "Release to Supplier"}
                        </button>
                        <button
                          onClick={() =>
                            handleAction(
                              () => resolveDispute(trade.id, false),
                              "Refund to Buyer",
                            )
                          }
                          disabled={loading}
                          className="px-4 py-2 rounded-lg bg-orange-500/20 text-orange-700 dark:text-orange-300 font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                          {loading ? "Processing..." : "Refund to Buyer"}
                        </button>
                      </div>
                    </div>
                  )}
                  {canCancelTrade && (
                    <button
                      onClick={() =>
                        handleAction(
                          () => cancelTrade(trade.id),
                          "Cancel Trade",
                        )
                      }
                      disabled={loading}
                      className="w-full px-6 py-3 rounded-lg bg-muted text-muted-foreground font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      {loading ? "Processing..." : "Cancel Trade"}
                    </button>
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
    </main>
  );
}
