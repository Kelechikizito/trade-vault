"use client";

import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { escrowAbi } from "@/lib/abi/escrow-abi";

const ESCROW_ADDRESS = process.env.NEXT_PUBLIC_ESCROW_ADDRESS as `0x${string}`;

/**
 * Wraps a single Escrow write call with its confirmation lifecycle.
 * Usage:
 *   const { execute, isPending, isConfirming, isSuccess, error } = useEscrowWrite();
 *   execute("confirmDelivery", [tradeId]);
 */
export function useEscrowWrite() {
  const {
    writeContract,
    data: hash,
    isPending, // wallet confirmation / submission pending
    error: writeError,
    reset,
  } = useWriteContract();

  const {
    isLoading: isConfirming, // waiting for block confirmation
    isSuccess,
    error: receiptError,
  } = useWaitForTransactionReceipt({ hash });

  function execute(functionName: string, args: readonly unknown[]) {
    writeContract({
      address: ESCROW_ADDRESS,
      abi: escrowAbi,
      functionName: functionName as never,
      args: args as never,
    });
  }

  return {
    execute,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error: writeError ?? receiptError,
    reset,
  };
}
