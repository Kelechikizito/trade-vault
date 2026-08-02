/* Trade Status */
export type TradeStatus =
  | "Created"
  | "Funded"
  | "Shipped"
  | "Dispute"
  | "Conditions Met"
  | "Released"
  | "Cancelled"
  | "Refunded";

/* Trade Conditions */
export interface TradeConditions {
  shipped: boolean;
  customsCleared: boolean;
  goodsReceived: boolean;
}

/* Trade Record */
export interface Trade {
  id: string;
  buyer: string;
  supplier: string;
  arbiter: string;
  amount: number; // in USD or token units
  currency: string;
  status: TradeStatus;
  conditions: TradeConditions;
  createdAt: number; // Unix timestamp
  fundedAt?: number;
  shippedAt?: number;
  deliveredAt?: number;
  fundingDeadline: number; // Unix timestamp
  description: string;
  shipmentLocation?: {
    lat: number;
    lng: number;
    address: string;
  };
  disputes?: Dispute[];
}

/* Dispute Record */
export interface Dispute {
  id: string;
  tradeId: string;
  raisedBy: string;
  reason: string;
  createdAt: number;
  resolvedAt?: number;
  resolution?: "refund" | "release";
}

/* User Role in a Trade */
export type UserRole = "buyer" | "supplier" | "arbiter" | "none";

/* Wallet Context */
export interface WalletContextType {
  address: string | null;
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
  balance: string;
}
