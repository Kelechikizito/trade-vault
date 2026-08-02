"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
// import { useWallet } from "@/lib/wallet-context";
import { useAccount } from "wagmi";
import { getAllTrades } from "@/lib/mock-contract";
import { Trade } from "@/lib/types";
import { TradeCard } from "@/components/trade-card";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export default function ArbiterDashboardPage() {
  const { address, isConnected } = useAccount();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [arbiterTrades, setArbiterTrades] = useState<Trade[]>([]);
  const [needsAction, setNeedsAction] = useState<Trade[]>([]);

  useEffect(() => {
    const allTrades = getAllTrades();
    setTrades(allTrades);

    if (address) {
      // Get trades where this address is the arbiter
      const myArbiterTrades = allTrades.filter((t) => t.arbiter === address);
      setArbiterTrades(myArbiterTrades);

      // Get trades that need arbiter action
      const actionNeeded = myArbiterTrades.filter(
        (t) =>
          t.status === "Funded" ||
          t.status === "Dispute" ||
          t.status === "Shipped",
      );
      setNeedsAction(actionNeeded);
    }
  }, [address]);

  if (!isConnected) {
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
          <p className="text-muted-foreground">
            Please connect your wallet to view arbiter dashboard.
          </p>
        </div>
      </main>
    );
  }

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
          <div className="flex gap-4 items-center">
            <Link href="/dashboard">
              <button className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground font-semibold hover:opacity-90 transition-opacity">
                My Trades
              </button>
            </Link>
            <ConnectButton />
          </div>
        </div>
      </header>

      {/* Dashboard Content */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Arbiter Dashboard
          </h1>
          <p className="text-muted-foreground">
            Manage disputes and confirm shipment milestones
          </p>
        </div>

        {/* Quick Action Panel */}
        {needsAction.length > 0 && (
          <div className="glass-panel p-6 rounded-lg mb-8 border-l-4 border-accent">
            <h2 className="text-xl font-bold text-foreground mb-4">
              Quick Actions Needed ({needsAction.length})
            </h2>
            <div className="space-y-3">
              {needsAction.map((trade) => (
                <Link key={trade.id} href={`/dashboard/trade/${trade.id}`}>
                  <div className="flex justify-between items-center p-4 bg-accent/10 hover:bg-accent/20 rounded-lg cursor-pointer transition-colors">
                    <div>
                      <p className="font-semibold text-foreground">
                        {trade.id}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {trade.description}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-accent/20 text-accent-foreground">
                        {trade.status === "Dispute"
                          ? "Needs Resolution"
                          : "Needs Confirmation"}
                      </span>
                      <span className="text-sm font-semibold text-foreground">
                        {trade.amount} {trade.currency}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* All Arbiter Trades */}
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-6">
            All Arbiter Trades ({arbiterTrades.length})
          </h2>

          {arbiterTrades.length === 0 ? (
            <div className="glass-panel p-12 rounded-lg text-center">
              <p className="text-muted-foreground">
                You are not an arbiter for any trades yet.
              </p>
            </div>
          ) : (
            <div className="grid gap-6">
              {arbiterTrades.map((trade) => (
                <TradeCard key={trade.id} trade={trade} />
              ))}
            </div>
          )}
        </div>

        {/* Stats Section */}
        {arbiterTrades.length > 0 && (
          <div className="grid md:grid-cols-4 gap-6 mt-12">
            <div className="glass-panel p-6 rounded-lg">
              <p className="text-xs text-muted-foreground mb-2">Total Trades</p>
              <p className="text-3xl font-bold text-foreground">
                {arbiterTrades.length}
              </p>
            </div>
            <div className="glass-panel p-6 rounded-lg">
              <p className="text-xs text-muted-foreground mb-2">
                Pending Action
              </p>
              <p className="text-3xl font-bold text-accent">
                {needsAction.length}
              </p>
            </div>
            <div className="glass-panel p-6 rounded-lg">
              <p className="text-xs text-muted-foreground mb-2">Total Value</p>
              <p className="text-3xl font-bold text-foreground">
                {arbiterTrades
                  .reduce((sum, t) => sum + t.amount, 0)
                  .toLocaleString()}
              </p>
            </div>
            <div className="glass-panel p-6 rounded-lg">
              <p className="text-xs text-muted-foreground mb-2">Disputes</p>
              <p className="text-3xl font-bold text-destructive">
                {arbiterTrades.filter((t) => t.status === "Dispute").length}
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
