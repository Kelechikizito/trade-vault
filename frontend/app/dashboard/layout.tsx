"use client";

import { type ReactNode } from "react";
import { useAccount } from "wagmi";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { isConnected } = useAccount();

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <p className="text-xl font-bold text-foreground">
            Please connect your wallet to continue
          </p>
          <p className="text-muted-foreground text-sm">
            You need a connected wallet to view trades or create a new one.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
