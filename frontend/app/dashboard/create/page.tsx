"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWallet } from "@/lib/wallet-context";
import { createTrade } from "@/lib/mock-contract";
import { WalletButton } from "@/components/wallet-button";

export default function CreateTradePage() {
  const router = useRouter();
  const { address, isConnected } = useWallet();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    supplier: "",
    arbiter: "",
    amount: "",
    currency: "USD",
    description: "",
    deadline: "48",
  });

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const tradeId = createTrade(
        address || "",
        formData.supplier,
        formData.arbiter,
        parseFloat(formData.amount),
        formData.currency,
        formData.description,
        parseInt(formData.deadline),
      );

      router.push(`/dashboard/trade/${tradeId}`);
    } catch (error) {
      console.error("Error creating trade:", error);
      setLoading(false);
    }
  };

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
            <WalletButton />
          </div>
        </header>
        <div className="max-w-6xl mx-auto px-4 py-20 text-center">
          <p className="text-muted-foreground">
            Please connect your wallet to create a trade.
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
          <WalletButton />
        </div>
      </header>

      {/* Form Content */}
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="text-primary hover:underline text-sm mb-4 inline-block"
          >
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-foreground">
            Create New Trade
          </h1>
          <p className="text-muted-foreground mt-2">
            Set up a new escrow trade with verification milestones
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="glass-panel p-8 rounded-lg space-y-6"
        >
          {/* Buyer Info */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Your Address (Buyer)
            </label>
            <input
              type="text"
              value={address || ""}
              disabled
              className="w-full px-4 py-2 rounded-lg bg-muted text-muted-foreground font-mono text-sm"
            />
          </div>

          {/* Supplier Address */}
          <div>
            <label
              htmlFor="supplier"
              className="block text-sm font-semibold text-foreground mb-2"
            >
              Supplier Address *
            </label>
            <input
              id="supplier"
              type="text"
              name="supplier"
              value={formData.supplier}
              onChange={handleChange}
              placeholder="0x..."
              required
              className="w-full px-4 py-2 rounded-lg bg-input border border-border text-foreground placeholder-muted-foreground"
            />
          </div>

          {/* Arbiter Address */}
          <div>
            <label
              htmlFor="arbiter"
              className="block text-sm font-semibold text-foreground mb-2"
            >
              Arbiter Address *
            </label>
            <input
              id="arbiter"
              type="text"
              name="arbiter"
              value={formData.arbiter}
              onChange={handleChange}
              placeholder="0x..."
              required
              className="w-full px-4 py-2 rounded-lg bg-input border border-border text-foreground placeholder-muted-foreground"
            />
          </div>

          {/* Amount & Currency */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label
                htmlFor="amount"
                className="block text-sm font-semibold text-foreground mb-2"
              >
                Amount *
              </label>
              <input
                id="amount"
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                placeholder="50000"
                min="0"
                step="1000"
                required
                className="w-full px-4 py-2 rounded-lg bg-input border border-border text-foreground placeholder-muted-foreground"
              />
            </div>
            <div>
              <label
                htmlFor="currency"
                className="block text-sm font-semibold text-foreground mb-2"
              >
                Currency
              </label>
              <select
                id="currency"
                name="currency"
                value={formData.currency}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-lg bg-input border border-border text-foreground"
              >
                <option>USD</option>
                <option>EUR</option>
                <option>GBP</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="description"
              className="block text-sm font-semibold text-foreground mb-2"
            >
              Trade Description *
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="e.g., Electronics shipment from Shanghai to New York"
              required
              rows={4}
              className="w-full px-4 py-2 rounded-lg bg-input border border-border text-foreground placeholder-muted-foreground resize-none"
            />
          </div>

          {/* Funding Deadline */}
          <div>
            <label
              htmlFor="deadline"
              className="block text-sm font-semibold text-foreground mb-2"
            >
              Funding Deadline (hours) *
            </label>
            <select
              id="deadline"
              name="deadline"
              value={formData.deadline}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-lg bg-input border border-border text-foreground"
            >
              <option value="24">24 hours</option>
              <option value="48">48 hours</option>
              <option value="72">72 hours</option>
              <option value="168">7 days</option>
            </select>
          </div>

          {/* Submit Button */}
          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Trade"}
            </button>
            <Link href="/dashboard" className="flex-1">
              <button
                type="button"
                className="w-full px-6 py-3 rounded-lg bg-secondary text-secondary-foreground font-semibold hover:opacity-90 transition-opacity"
              >
                Cancel
              </button>
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
