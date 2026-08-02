import { Trade, TradeStatus, TradeConditions, Dispute } from "./types";

/* In-memory mock contract storage */
const trades: Map<string, Trade> = new Map();
let tradeCounter = 1000;

/* Helper to generate trade ID */
function generateTradeId(): string {
  return `TRADE-${++tradeCounter}`;
}

/* Helper to get current timestamp */
function now(): number {
  return Math.floor(Date.now() / 1000);
}

/* CREATE TRADE */
export function createTrade(
  buyer: string,
  supplier: string,
  arbiter: string,
  amount: number,
  currency: string,
  description: string,
  fundingDeadlineHours: number = 48,
): string {
  const tradeId = generateTradeId();
  const trade: Trade = {
    id: tradeId,
    buyer,
    supplier,
    arbiter,
    amount,
    currency,
    description,
    status: "Created",
    conditions: {
      shipped: false,
      customsCleared: false,
      goodsReceived: false,
    },
    createdAt: now(),
    fundingDeadline: now() + fundingDeadlineHours * 3600,
    disputes: [],
  };
  trades.set(tradeId, trade);
  return tradeId;
}

/* GET TRADE */
export function getTrade(tradeId: string): Trade | null {
  return trades.get(tradeId) || null;
}

/* GET ALL TRADES */
export function getAllTrades(): Trade[] {
  return Array.from(trades.values());
}

/* GET TRADE CONDITIONS */
export function getTradeConditions(tradeId: string): TradeConditions | null {
  const trade = trades.get(tradeId);
  return trade ? trade.conditions : null;
}

/* FUND TRADE */
export function fundTrade(tradeId: string): boolean {
  const trade = trades.get(tradeId);
  if (!trade || trade.status !== "Created") return false;

  trade.status = "Funded";
  trade.fundedAt = now();
  return true;
}

/* RAISE DISPUTE */
export function raiseDispute(
  tradeId: string,
  raisedBy: string,
  reason: string,
): boolean {
  const trade = trades.get(tradeId);
  if (!trade) return false;

  trade.status = "Dispute";
  const dispute: Dispute = {
    id: `DISPUTE-${tradeId}-${Date.now()}`,
    tradeId,
    raisedBy,
    reason,
    createdAt: now(),
  };
  trade.disputes?.push(dispute);
  return true;
}

/* CLAIM REFUND */
export function claimRefund(tradeId: string): boolean {
  const trade = trades.get(tradeId);
  if (!trade || trade.status !== "Funded") return false;
  if (now() < trade.fundingDeadline) return false; // Deadline not passed

  trade.status = "Refunded";
  return true;
}

/* CANCEL TRADE */
export function cancelTrade(tradeId: string): boolean {
  const trade = trades.get(tradeId);
  if (!trade) return false;

  // Only allow cancellation in early stages
  if (trade.status !== "Created" && trade.status !== "Funded") return false;

  trade.status = "Cancelled";
  return true;
}

/* CONFIRM SHIPPED */
export function confirmShipped(tradeId: string, shipped: boolean): boolean {
  const trade = trades.get(tradeId);
  if (!trade) return false;

  trade.conditions.shipped = shipped;
  if (shipped && trade.status === "Funded") {
    trade.status = "Shipped";
    trade.shippedAt = now();
  }
  return true;
}

/* CONFIRM CUSTOMS CLEARED */
export function confirmCustomsCleared(
  tradeId: string,
  cleared: boolean,
): boolean {
  const trade = trades.get(tradeId);
  if (!trade) return false;

  trade.conditions.customsCleared = cleared;
  return true;
}

/* CONFIRM GOODS RECEIVED */
export function confirmGoodsReceived(
  tradeId: string,
  received: boolean,
): boolean {
  const trade = trades.get(tradeId);
  if (!trade) return false;

  trade.conditions.goodsReceived = received;
  if (received) {
    trade.deliveredAt = now();
  }
  return true;
}

/* MEET TRADE CONDITIONS */
export function meetTradeConditions(tradeId: string): boolean {
  const trade = trades.get(tradeId);
  if (!trade) return false;

  const allMet =
    trade.conditions.shipped &&
    trade.conditions.customsCleared &&
    trade.conditions.goodsReceived;
  if (allMet && trade.status === "Shipped") {
    trade.status = "Conditions Met";
    return true;
  }
  return false;
}

/* CONFIRM DELIVERY */
export function confirmDelivery(tradeId: string): boolean {
  const trade = trades.get(tradeId);
  if (!trade || trade.status !== "Conditions Met") return false;

  trade.status = "Released";
  return true;
}

/* RESOLVE DISPUTE */
export function resolveDispute(
  tradeId: string,
  releaseToSupplier: boolean,
): boolean {
  const trade = trades.get(tradeId);
  if (!trade || trade.status !== "Dispute") return false;

  const dispute = trade.disputes?.[0];
  if (dispute) {
    dispute.resolvedAt = now();
    dispute.resolution = releaseToSupplier ? "release" : "refund";
  }

  trade.status = releaseToSupplier ? "Released" : "Refunded";
  return true;
}

/* INITIALIZE MOCK DATA */
export function initializeMockData() {
  // Create some sample trades for demo purposes
  const mockBuyer = "0x1234567890123456789012345678901234567890";
  const mockSupplier = "0x0987654321098765432109876543210987654321";
  const mockArbiter = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd";

  const tradeIds = [
    createTrade(
      mockBuyer,
      mockSupplier,
      mockArbiter,
      50000,
      "USD",
      "Electronics shipment from Shanghai",
      48,
    ),
    createTrade(
      mockBuyer,
      mockSupplier,
      mockArbiter,
      25000,
      "USD",
      "Textile order from Vietnam",
      72,
    ),
  ];

  // Fund and advance first trade
  if (tradeIds[0]) {
    fundTrade(tradeIds[0]);
    confirmShipped(tradeIds[0], true);
  }

  // Leave second trade in Created status
}
