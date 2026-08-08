"use client";

import { useReadContract, useReadContracts } from "wagmi";
import { escrowAbi } from "@/lib/abi/escrow-abi"; // adjust to your actual ABI export
import { Trade, TradeStatus } from "@/lib/types";

const ESCROW_ADDRESS = process.env.NEXT_PUBLIC_ESCROW_ADDRESS as `0x${string}`;

/* Maps the on-chain Status enum (uint8) to your frontend's TradeStatus string union.
   Order MUST match your Solidity enum exactly:
   Created, Funded, ConditionsMet, Disputed, Cancelled, Refunded, Released */
const STATUS_MAP: TradeStatus[] = [
  "Created",
  "Funded",
  "Conditions Met",
  "Dispute",
  "Cancelled",
  "Refunded",
  "Released",
];

/* Raw struct shape returned by getTrade(tradeId) — matches your Solidity Trade struct field order */
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

function mapRawTrade(tradeId: number, raw: RawTrade): Trade {
  return {
    id: `TRADE-${tradeId}`,
    buyer: raw.buyer,
    supplier: raw.supplier,
    arbiter: raw.arbiter,
    amount: Number(raw.amount) / 1e6, // USDC has 6 decimals — adjust if using a different token
    currency: "USDC",
    description: "", // not stored on-chain; contract has no description field
    status: STATUS_MAP[raw.status],
    conditions: {
      shipped: raw.shipped,
      customsCleared: raw.customsCleared,
      goodsReceived: raw.goodsReceived,
    },
    createdAt: 0, // not returned by getTrade — see note below
    fundingDeadline: Number(raw.deadline),
    disputes: [],
  };
}

/**
 * Reads every trade from the deployed Escrow contract.
 * Loops tradeId 0..s_nextTradeId-1 and batches the reads into one multicall.
 * Returns trades sorted ascending by tradeId (smallest first) —
 * reverse at render time if you want newest-first display.
 */
export function useAllTrades() {
  const { data: nextTradeId, isLoading: loadingCount } = useReadContract({
    address: ESCROW_ADDRESS,
    abi: escrowAbi,
    functionName: "s_nextTradeId",
  });

  const count = nextTradeId ? Number(nextTradeId) : 0;

  const { data: results, isLoading: loadingTrades } = useReadContracts({
    contracts: Array.from({ length: count }, (_, i) => ({
      address: ESCROW_ADDRESS,
      abi: escrowAbi,
      functionName: "getTrade",
      args: [BigInt(i)],
    })),
    query: {
      enabled: count > 0,
    },
  });

  const trades: Trade[] =
    results
      ?.map((result, i) =>
        result.status === "success"
          ? mapRawTrade(i, result.result as RawTrade)
          : null,
      )
      .filter((t): t is Trade => t !== null) ?? [];

  return {
    trades, // ascending by tradeId
    isLoading: loadingCount || loadingTrades,
  };
}
