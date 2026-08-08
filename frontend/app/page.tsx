"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { LiquidButton } from "@/components/ui/liquid-button";

export default function Page() {
  const { isConnected } = useAccount();

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold text-primary">TradeVault</div>
          <ConnectButton />
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-4 py-20 text-center">
        <div className="space-y-6">
          <h1 className="text-5xl md:text-6xl font-bold text-foreground">
            Secure Cross-Border
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
              Trade Finance
            </span>
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Decentralized escrow and milestone tracking for international trade
            settlements. Powered by smart contracts and cryptographic
            verification.
          </p>

          <div className="flex gap-4 justify-center pt-4">
            {isConnected ? (
              <>
                <Link href="/dashboard">
                  <LiquidButton variant="primary" className="px-8 py-3 text-lg">
                    Go to Dashboard
                  </LiquidButton>
                </Link>
                <Link href="/dashboard/create">
                  <LiquidButton
                    variant="secondary"
                    className="px-8 py-3 text-lg"
                  >
                    Create New Trade
                  </LiquidButton>
                </Link>
              </>
            ) : (
              <div className="text-muted-foreground">
                Connect your wallet to get started
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-foreground mb-12 text-center">
          Why TradeVault
        </h2>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              title: "Multi-Party Escrow",
              description:
                "Secure escrow with buyer, supplier, and independent arbiter verification",
            },
            {
              title: "Milestone Tracking",
              description:
                "Transparent shipment tracking with customs clearance and delivery verification",
            },
            {
              title: "Dispute Resolution",
              description:
                "Fair arbitration process for resolving trade disputes",
            },
            {
              title: "Instant Settlement",
              description:
                "Funds released automatically when all conditions are met",
            },
            {
              title: "Global Access",
              description:
                "No geographic restrictions - trade with anyone, anywhere",
            },
            {
              title: "Low Fees",
              description:
                "Transparent, efficient settlement with minimal overhead",
            },
          ].map((feature, idx) => (
            <div key={idx} className="glass-panel p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-muted-foreground text-sm">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="glass-panel p-12 rounded-lg">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Ready to Start Trading?
          </h2>
          <p className="text-muted-foreground mb-8">
            Connect your wallet and create your first trade in minutes.
          </p>
          {isConnected ? (
            <Link href="/dashboard">
              <LiquidButton variant="primary" className="px-8 py-3 text-lg">
                Enter Dashboard
              </LiquidButton>
            </Link>
          ) : (
            <p className="text-muted-foreground">
              Connect your wallet to continue
            </p>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border mt-20 py-8">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
          <p className="text-muted-foreground">
            TradeVault - Decentralized Trade Finance Platform
          </p>
          <nav
            aria-label="Footer navigation"
            className="flex items-center gap-6"
          >
            <a
              href="https://github.com/Kelechikizito/trade-vault"
              target="_blank"
              rel="noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              GitHub
            </a>
            <a
              href="https://github.com/Kelechikizito/trade-vault/blob/main/README.md"
              target="_blank"
              rel="noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              README / Docs
            </a>
            <a
              href="https://x.com/0xkelechii"
              target="_blank"
              rel="noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              X
            </a>
          </nav>
        </div>
      </footer>
    </main>
  );
}
