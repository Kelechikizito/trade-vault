"use client";

import { WalletProvider } from "@/lib/wallet-context";
import { ReactNode } from "react";

export function AppLayout({ children }: { children: ReactNode }) {
  return <WalletProvider>{children}</WalletProvider>;
}
