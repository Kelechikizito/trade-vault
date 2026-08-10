"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useAccount, useConfig, useReadContract } from "wagmi";
import {
  writeContract,
  waitForTransactionReceipt,
  readContract,
} from "@wagmi/core";
import { parseUnits } from "viem";
import { escrowAbi } from "@/lib/abi/escrow-abi";
import { erc20Abi } from "@/lib/abi/erc20-abi";
import { Trade, TradeStatus, UserRole } from "@/lib/types";
import { StatusBadge } from "@/components/status-badge";
import { StepTimeline } from "@/components/step-timeline";
import { ShipmentMap } from "@/components/shipment-map";
import { MilestoneList } from "@/components/milestone-list";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { LiquidButton } from "@/components/ui/liquid-button";
import { ConfirmActionModal } from "@/components/confirm-action-modal";
import { useEscrowWrite } from "@/lib/hooks/useEscrowWrite";

const ESCROW_ADDRESS = process.env.NEXT_PUBLIC_ESCROW_ADDRESS as `0x${string}`;
const VAULT_ADDRESS = process.env.NEXT_PUBLIC_VAULT_ADDRESS as `0x${string}`;
const USDC_ADDRESS =
  "0x3600000000000000000000000000000000000000" as `0x${string}`;

// Order MUST match the Solidity Status enum exactly:
// Created, Funded, ConditionsMet, Disputed, Cancelled, Refunded, Released
const STATUS_MAP: TradeStatus[] = [
  "Created",
  "Funded",
  "Conditions Met",
  "Dispute",
  "Cancelled",
  "Refunded",
  "Released",
];

type RawTrade = {
  buyer: `0x${string}`;
  supplier: `0x${string}`;
  arbiter: `0x${string}`;
  amount: bigint;
  deadline: bigint;
  shipped: boolean;
  customsCleared: boolean;
  goodsReceived: boolean;
  status: number;
};

function mapRawTrade(tradeIdStr: string, raw: RawTrade): Trade {
  const {
    buyer,
    supplier,
    arbiter,
    amount,
    deadline,
    shipped,
    customsCleared,
    goodsReceived,
    status,
  } = raw;
  return {
    id: tradeIdStr,
    buyer,
    supplier,
    arbiter,
    amount: Number(amount) / 1e6, // USDC, 6 decimals
    currency: "USDC",
    description: "",
    status: STATUS_MAP[status],
    conditions: { shipped, customsCleared, goodsReceived },
    createdAt: 0,
    fundingDeadline: Number(deadline),
    disputes: [],
  };
}

type PendingAction = {
  functionName: string;
  args: readonly unknown[];
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
  const config = useConfig();
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [isFunding, setIsFunding] = useState(false);
  const [fundStep, setFundStep] = useState<"idle" | "approving" | "depositing">(
    "idle",
  );
  const [fundError, setFundError] = useState<string | null>(null);
  const { execute, isPending, isConfirming, isSuccess, error } =
    useEscrowWrite();

  const numericId = id.replace("TRADE-", "");
  const tradeIdBigInt = /^\d+$/.test(numericId) ? BigInt(numericId) : null;

  const { data, isLoading, isError, refetch } = useReadContract({
    address: ESCROW_ADDRESS,
    abi: escrowAbi,
    functionName: "getTrade",
    args: tradeIdBigInt !== null ? [tradeIdBigInt] : undefined,
    query: { enabled: tradeIdBigInt !== null },
  });

  const trade: Trade | null =
    data && tradeIdBigInt !== null
      ? mapRawTrade(id, data as unknown as RawTrade)
      : null;

  let userRole: UserRole = "none";
  if (trade && address) {
    if (address.toLowerCase() === trade.buyer.toLowerCase()) userRole = "buyer";
    else if (address.toLowerCase() === trade.supplier.toLowerCase())
      userRole = "supplier";
    else if (address.toLowerCase() === trade.arbiter.toLowerCase())
      userRole = "arbiter";
  }

  const isBusy = isPending || isConfirming;

  // Once a write confirms on-chain, refetch the trade and close any open modal.
  useEffect(() => {
    if (isSuccess) {
      refetch();
      setPendingAction(null);
    }
  }, [isSuccess, refetch]);

  const runDirect = (functionName: string, args: readonly unknown[]) => {
    execute(functionName, args);
  };

  const handleFund = async () => {
    if (!address || !trade) return;
    setFundError(null);
    setIsFunding(true);

    try {
      const amountRaw = parseUnits(trade.amount.toString(), 6);

      // Check current allowance first — skip the approve tx entirely if
      // a sufficient allowance already exists (e.g. from a prior attempt).
      const currentAllowance = await readContract(config, {
        address: USDC_ADDRESS,
        abi: erc20Abi,
        functionName: "allowance",
        args: [address, VAULT_ADDRESS],
      });

      if (currentAllowance < amountRaw) {
        setFundStep("approving");
        const approveHash = await writeContract(config, {
          address: USDC_ADDRESS,
          abi: erc20Abi,
          functionName: "approve",
          args: [VAULT_ADDRESS, amountRaw],
        });
        await waitForTransactionReceipt(config, { hash: approveHash });
      }

      setFundStep("depositing");
      const fundHash = await writeContract(config, {
        address: ESCROW_ADDRESS,
        abi: escrowAbi,
        functionName: "fundTrade",
        args: [tradeIdBigInt as bigint],
      });
      await waitForTransactionReceipt(config, { hash: fundHash });

      await refetch();
    } catch (err) {
      console.error("Fund trade failed:", err);
      setFundError(
        err instanceof Error
          ? err.message
          : "Funding failed. Please try again.",
      );
    } finally {
      setIsFunding(false);
      setFundStep("idle");
    }
  };

  const requestConfirmation = (details: NonNullable<PendingAction>) => {
    setPendingAction(details);
  };

  if (
    tradeIdBigInt === null ||
    isError ||
    (!isLoading &&
      (!trade || trade.buyer === "0x0000000000000000000000000000000000000000"))
  ) {
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

  if (isLoading || !trade) {
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
          <p className="text-muted-foreground">Loading trade from chain…</p>
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
    userRole === "arbiter" && trade.status === "Funded";
  const canMeetConditions =
    userRole === "arbiter" &&
    trade.status === "Funded" &&
    trade.conditions.shipped &&
    trade.conditions.customsCleared &&
    trade.conditions.goodsReceived;
  const canReleasePayment =
    userRole === "arbiter" && trade.status === "Conditions Met";
  const canRaiseDispute =
    (userRole === "buyer" || userRole === "supplier") &&
    (trade.status === "Funded" || trade.status === "Conditions Met");
  const canClaimRefund = userRole === "buyer" && trade.status === "Funded";
  const canCancelTrade = userRole === "buyer" && trade.status === "Created";
  const canResolveDispute =
    userRole === "arbiter" && trade.status === "Dispute";

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

      <div className="max-w-6xl mx-auto px-4 py-8">
        <Link
          href="/dashboard"
          className="text-primary hover:underline text-sm mb-6 inline-block"
        >
          ← Back to Dashboard
        </Link>

        <div className="glass-panel p-8 rounded-lg mb-8">
          <div className="flex justify-between items-start mb-4">
            <h1 className="text-3xl font-bold text-foreground">{trade.id}</h1>
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
          </div>
        </div>

        <div className="glass-panel p-8 rounded-lg mb-8">
          <h2 className="text-xl font-bold text-foreground mb-6">
            Trade Progress
          </h2>
          <StepTimeline status={trade.status} />
        </div>

        <div className="mb-8">
          <ShipmentMap trade={trade} />
        </div>

        <div className="glass-panel p-8 rounded-lg mb-8">
          <h2 className="text-xl font-bold text-foreground mb-6">
            Shipment Milestones
          </h2>
          <MilestoneList trade={trade} />
        </div>

        <div className="glass-panel p-8 rounded-lg">
          <h2 className="text-xl font-bold text-foreground mb-6">Actions</h2>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-4 py-3 mb-4">
              {error.message}
            </p>
          )}

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
                      disabled={isFunding || isBusy}
                      onClick={handleFund}
                    >
                      {fundStep === "approving"
                        ? "Approving USDC..."
                        : fundStep === "depositing"
                          ? "Depositing..."
                          : "Fund Trade"}
                    </LiquidButton>
                  )}
                  {fundError && (
                    <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-4 py-3">
                      {fundError}
                    </p>
                  )}
                  {canRaiseDispute && (
                    <LiquidButton
                      variant="destructive"
                      className="w-full py-3"
                      disabled={isBusy}
                      onClick={() => runDirect("raiseDispute", [tradeIdBigInt])}
                    >
                      {isBusy ? "Processing..." : "Raise Dispute"}
                    </LiquidButton>
                  )}
                  {canClaimRefund && (
                    <LiquidButton
                      variant="secondary"
                      className="w-full py-3"
                      disabled={isBusy}
                      onClick={() => runDirect("claimRefund", [tradeIdBigInt])}
                    >
                      {isBusy
                        ? "Processing..."
                        : "Claim Refund (Deadline Passed)"}
                    </LiquidButton>
                  )}
                  {canCancelTrade && (
                    <LiquidButton
                      variant="secondary"
                      className="w-full py-3"
                      disabled={isBusy}
                      onClick={() => runDirect("cancelTrade", [tradeIdBigInt])}
                    >
                      {isBusy ? "Processing..." : "Cancel Trade"}
                    </LiquidButton>
                  )}
                </div>
              )}

              {/* Supplier Actions */}
              {userRole === "supplier" && canRaiseDispute && (
                <LiquidButton
                  variant="destructive"
                  className="w-full py-3"
                  disabled={isBusy}
                  onClick={() => runDirect("raiseDispute", [tradeIdBigInt])}
                >
                  {isBusy ? "Processing..." : "Raise Dispute"}
                </LiquidButton>
              )}

              {/* Arbiter Actions */}
              {userRole === "arbiter" && (
                <div className="space-y-3">
                  {canConfirmShipped && (
                    <LiquidButton
                      variant="secondary"
                      className="w-full py-3"
                      disabled={isBusy}
                      onClick={() =>
                        runDirect("confirmShipped", [tradeIdBigInt, true])
                      }
                    >
                      {isBusy ? "Processing..." : "Confirm Goods Shipped"}
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
                          disabled={isBusy}
                          onClick={() =>
                            runDirect("confirmCustomsCleared", [
                              tradeIdBigInt,
                              true,
                            ])
                          }
                        >
                          {isBusy ? "Processing..." : "Confirm Customs Cleared"}
                        </LiquidButton>
                      )}
                      {!trade.conditions.goodsReceived &&
                        trade.conditions.shipped && (
                          <LiquidButton
                            variant="secondary"
                            className="w-full"
                            disabled={isBusy}
                            onClick={() =>
                              runDirect("confirmGoodsReceived", [
                                tradeIdBigInt,
                                true,
                              ])
                            }
                          >
                            {isBusy
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
                      disabled={isBusy}
                      onClick={() =>
                        runDirect("meetTradeConditions", [tradeIdBigInt])
                      }
                    >
                      {isBusy ? "Processing..." : "Mark All Conditions Met"}
                    </LiquidButton>
                  )}

                  {canReleasePayment && (
                    <LiquidButton
                      variant="primary"
                      className="w-full py-3"
                      disabled={isBusy}
                      onClick={() =>
                        requestConfirmation({
                          functionName: "confirmDelivery",
                          args: [tradeIdBigInt],
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
                          disabled={isBusy}
                          onClick={() =>
                            requestConfirmation({
                              functionName: "resolveDispute",
                              args: [tradeIdBigInt, true],
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
                          disabled={isBusy}
                          onClick={() =>
                            requestConfirmation({
                              functionName: "resolveDispute",
                              args: [tradeIdBigInt, false],
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
                </div>
              )}
            </div>
          )}
        </div>

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
          loading={isBusy}
          onConfirm={() =>
            execute(pendingAction.functionName, pendingAction.args)
          }
          onCancel={() => setPendingAction(null)}
        />
      )}
    </main>
  );
}
