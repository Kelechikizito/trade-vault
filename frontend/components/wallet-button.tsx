"use client";

import { useWallet } from "@/lib/wallet-context";

export function WalletButton() {
  const { address, isConnected, connect, disconnect } = useWallet();

  const displayAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : "Connect Wallet";

  return (
    <button
      onClick={isConnected ? disconnect : connect}
      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
        isConnected
          ? "bg-primary text-primary-foreground hover:opacity-90"
          : "bg-secondary text-secondary-foreground hover:opacity-90"
      }`}
    >
      {displayAddress}
    </button>
  );
}
