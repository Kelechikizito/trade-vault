"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { isAddress } from "viem";
import { createTrade } from "@/lib/mock-contract";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { LiquidButton } from "@/components/ui/liquid-button";

// Amount input: digits with at most one decimal point — blocks letters,
// multiple dots, and negative signs at the keystroke level.
const AMOUNT_PATTERN = /^\d*\.?\d*$/;

export default function CreateTradePage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    supplier: "",
    arbiter: "",
    amount: "",
    description: "",
    deadline: "48",
  });
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const errors = useMemo(() => {
    const e: Record<string, string> = {};

    if (formData.supplier && !isAddress(formData.supplier)) {
      e.supplier = "Not a valid address";
    } else if (
      formData.supplier &&
      address &&
      formData.supplier.toLowerCase() === address.toLowerCase()
    ) {
      e.supplier = "Supplier can't be the same as the buyer";
    }

    if (formData.arbiter && !isAddress(formData.arbiter)) {
      e.arbiter = "Not a valid address";
    } else if (
      formData.arbiter &&
      address &&
      formData.arbiter.toLowerCase() === address.toLowerCase()
    ) {
      e.arbiter = "Arbiter can't be the same as the buyer";
    } else if (
      formData.arbiter &&
      formData.supplier &&
      formData.arbiter.toLowerCase() === formData.supplier.toLowerCase()
    ) {
      e.arbiter = "Arbiter can't be the same as the supplier";
    }

    if (formData.amount) {
      const amountNum = parseFloat(formData.amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        e.amount = "Amount must be greater than 0";
      }
    }

    return e;
  }, [formData, address]);

  const isFormValid =
    Object.keys(errors).length === 0 &&
    formData.supplier &&
    formData.arbiter &&
    formData.amount &&
    formData.description;

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;

    if (name === "amount") {
      // Reject the keystroke entirely if it breaks the numeric pattern,
      // rather than validating after the fact.
      if (value !== "" && !AMOUNT_PATTERN.test(value)) return;
    }

    if (name === "supplier" || name === "arbiter") {
      // Addresses are case-sensitive in checksum form but comparisons
      // below are case-insensitive, so just trim stray whitespace here.
      setFormData((prev) => ({ ...prev, [name]: value.trim() }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setTouched((prev) => ({ ...prev, [e.target.name]: true }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ supplier: true, arbiter: true, amount: true });
    if (!isFormValid) return;

    setLoading(true);
    try {
      const tradeId = createTrade(
        address || "",
        formData.supplier,
        formData.arbiter,
        parseFloat(formData.amount),
        "USDC",
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
            <ConnectButton />
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
          <ConnectButton />
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
              onBlur={handleBlur}
              placeholder="0x..."
              required
              className={`w-full px-4 py-2 rounded-lg bg-input border font-mono text-sm text-foreground placeholder-muted-foreground ${
                touched.supplier && errors.supplier
                  ? "border-destructive"
                  : "border-border"
              }`}
            />
            {touched.supplier && errors.supplier && (
              <p className="text-xs text-destructive mt-1">{errors.supplier}</p>
            )}
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
              onBlur={handleBlur}
              placeholder="0x..."
              required
              className={`w-full px-4 py-2 rounded-lg bg-input border font-mono text-sm text-foreground placeholder-muted-foreground ${
                touched.arbiter && errors.arbiter
                  ? "border-destructive"
                  : "border-border"
              }`}
            />
            {touched.arbiter && errors.arbiter && (
              <p className="text-xs text-destructive mt-1">{errors.arbiter}</p>
            )}
          </div>

          {/* Amount */}
          <div>
            <label
              htmlFor="amount"
              className="block text-sm font-semibold text-foreground mb-2"
            >
              Amount (USDC) *
            </label>
            <div className="relative">
              <input
                id="amount"
                type="text"
                inputMode="decimal"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="50000"
                required
                className={`w-full px-4 py-2 pr-16 rounded-lg bg-input border text-foreground placeholder-muted-foreground ${
                  touched.amount && errors.amount
                    ? "border-destructive"
                    : "border-border"
                }`}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                USDC
              </span>
            </div>
            {touched.amount && errors.amount && (
              <p className="text-xs text-destructive mt-1">{errors.amount}</p>
            )}
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
              Funding Deadline *
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
            <LiquidButton
              type="submit"
              variant="primary"
              disabled={loading || !isFormValid}
              className="flex-1 py-3"
            >
              {loading ? "Creating..." : "Create Trade"}
            </LiquidButton>
            <Link href="/dashboard" className="flex-1">
              <LiquidButton
                type="button"
                variant="secondary"
                className="w-full py-3"
              >
                Cancel
              </LiquidButton>
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
