"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import { useAllTrades } from "@/lib/hooks/useAllTrades";
import { TradeCard } from "@/components/trade-card";
import { LiquidButton } from "@/components/ui/liquid-button";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export default function DashboardPage() {
  const { isConnected, address } = useAccount();
  const { trades, isLoading } = useAllTrades();

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
            Please connect your wallet to view your trades.
          </p>
        </div>
      </main>
    );
  }

  const myTrades = trades.filter(
    (trade) =>
      trade.buyer === address ||
      trade.supplier === address ||
      trade.arbiter === address,
  );

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
            <Link href="/dashboard/create">
              <LiquidButton variant="primary">New Trade</LiquidButton>
            </Link>
            <ConnectButton />
          </div>
        </div>
      </header>

      {/* Dashboard Content */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">My Trades</h1>
          <div className="glass-panel px-4 py-2 rounded-lg inline-block">
            <p className="text-sm text-muted-foreground">
              Address:{" "}
              <span className="font-mono text-foreground">
                {address?.slice(0, 10)}...
              </span>
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="glass-panel p-12 rounded-lg text-center">
            <p className="text-muted-foreground">Loading trades…</p>
          </div>
        ) : myTrades.length === 0 ? (
          <div className="glass-panel p-12 rounded-lg text-center">
            <p className="text-muted-foreground mb-4">
              You don&apos;t have any trades yet.
            </p>
            <Link href="/dashboard/create">
              <LiquidButton variant="primary">
                Create Your First Trade
              </LiquidButton>
            </Link>
          </div>
        ) : (
          <div className="grid gap-6">
            {[...myTrades].reverse().map((trade) => (
              <TradeCard key={trade.id} trade={trade} viewerAddress={address} />
            ))}
          </div>
        )}

        {/* All Trades Section */}
        {!isLoading && trades.length > myTrades.length && (
          <div className="mt-16">
            <h2 className="text-2xl font-bold text-foreground mb-6">
              All Available Trades
            </h2>
            <div className="grid gap-6">
              {[...trades]
                .filter((t) => !myTrades.some((m) => m.id === t.id))
                .reverse()
                .map((trade) => (
                  <TradeCard
                    key={trade.id}
                    trade={trade}
                    viewerAddress={address}
                  />
                ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
