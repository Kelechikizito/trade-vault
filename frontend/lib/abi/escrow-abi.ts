interface ContractsConfig {
  [chainId: number]: {
    escrow: string;
    no_check: string | null;
  };
}

export const chainsToEscrow: ContractsConfig = {
  5042002: {
    escrow: "0xce0c01B9c2E407af328eB25D06aea0f1929aaBC7",
    no_check: null,
  },
};

export const escrowAbi = [
  {
    type: "constructor",
    inputs: [
      { name: "vaultAddress", type: "address", internalType: "address" },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "cancelTrade",
    inputs: [{ name: "tradeId", type: "uint256", internalType: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "claimRefund",
    inputs: [{ name: "tradeId", type: "uint256", internalType: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "confirmCustomsCleared",
    inputs: [
      { name: "tradeId", type: "uint256", internalType: "uint256" },
      { name: "customsCleared", type: "bool", internalType: "bool" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "confirmDelivery",
    inputs: [{ name: "tradeId", type: "uint256", internalType: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "confirmGoodsReceived",
    inputs: [
      { name: "tradeId", type: "uint256", internalType: "uint256" },
      { name: "goodsReceived", type: "bool", internalType: "bool" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "confirmShipped",
    inputs: [
      { name: "tradeId", type: "uint256", internalType: "uint256" },
      { name: "shipped", type: "bool", internalType: "bool" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "createTrade",
    inputs: [
      { name: "buyer", type: "address", internalType: "address" },
      { name: "supplier", type: "address", internalType: "address" },
      { name: "amount", type: "uint256", internalType: "uint256" },
      { name: "arbiter", type: "address", internalType: "address" },
      { name: "deadline", type: "uint256", internalType: "uint256" },
    ],
    outputs: [{ name: "tradeId", type: "uint256", internalType: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "fundTrade",
    inputs: [{ name: "tradeId", type: "uint256", internalType: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getTrade",
    inputs: [{ name: "tradeId", type: "uint256", internalType: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        internalType: "struct Escrow.Trade",
        components: [
          { name: "buyer", type: "address", internalType: "address" },
          { name: "supplier", type: "address", internalType: "address" },
          { name: "arbiter", type: "address", internalType: "address" },
          { name: "amount", type: "uint256", internalType: "uint256" },
          { name: "deadline", type: "uint256", internalType: "uint256" },
          { name: "shipped", type: "bool", internalType: "bool" },
          { name: "customsCleared", type: "bool", internalType: "bool" },
          { name: "goodsReceived", type: "bool", internalType: "bool" },
          { name: "status", type: "uint8", internalType: "enum Escrow.Status" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getTradeArbiter",
    inputs: [{ name: "tradeId", type: "uint256", internalType: "uint256" }],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getTradeConditions",
    inputs: [{ name: "tradeId", type: "uint256", internalType: "uint256" }],
    outputs: [
      { name: "shipped", type: "bool", internalType: "bool" },
      { name: "customsCleared", type: "bool", internalType: "bool" },
      { name: "goodsReceived", type: "bool", internalType: "bool" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getTradeStatus",
    inputs: [{ name: "tradeId", type: "uint256", internalType: "uint256" }],
    outputs: [{ name: "", type: "uint8", internalType: "enum Escrow.Status" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "meetTradeConditions",
    inputs: [{ name: "tradeId", type: "uint256", internalType: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "owner",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "raiseDispute",
    inputs: [{ name: "tradeId", type: "uint256", internalType: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "renounceOwnership",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "resolveDispute",
    inputs: [
      { name: "tradeId", type: "uint256", internalType: "uint256" },
      { name: "releaseToSupplier", type: "bool", internalType: "bool" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "s_nextTradeId",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "transferOwnership",
    inputs: [{ name: "newOwner", type: "address", internalType: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "event",
    name: "AllTradeConditionsMet",
    inputs: [
      {
        name: "tradeId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "ClearedCustomsConditionsMet",
    inputs: [
      {
        name: "tradeId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "OwnershipTransferred",
    inputs: [
      {
        name: "previousOwner",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "newOwner",
        type: "address",
        indexed: true,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "ReceivedGoodsConditionsMet",
    inputs: [
      {
        name: "tradeId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "ShippedConditionsMet",
    inputs: [
      {
        name: "tradeId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "TradeCancelled",
    inputs: [
      {
        name: "tradeId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "buyer",
        type: "address",
        indexed: true,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "TradeCreated",
    inputs: [
      {
        name: "tradeId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "buyer",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "supplier",
        type: "address",
        indexed: false,
        internalType: "address",
      },
      {
        name: "arbiter",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "amount",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "TradeDisputed",
    inputs: [
      {
        name: "tradeId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "buyer",
        type: "address",
        indexed: true,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "TradeFunded",
    inputs: [
      {
        name: "tradeId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "buyer",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "supplier",
        type: "address",
        indexed: false,
        internalType: "address",
      },
      {
        name: "amount",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "TradeFundsReleasedToSupplier",
    inputs: [
      {
        name: "tradeId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "supplier",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "amount",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "TradeRefunded",
    inputs: [
      {
        name: "tradeId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "buyer",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "amount",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  { type: "error", name: "Escrow__AllTradeConditionsMustBeMet", inputs: [] },
  {
    type: "error",
    name: "Escrow__ArbiterShouldBeNeutralThirdParty",
    inputs: [{ name: "arbiter", type: "address", internalType: "address" }],
  },
  { type: "error", name: "Escrow__ClearedCustomsConditionsNotMet", inputs: [] },
  {
    type: "error",
    name: "Escrow__DifferentAddressesForBuyerAndSupplier",
    inputs: [],
  },
  { type: "error", name: "Escrow__InvalidAmount", inputs: [] },
  { type: "error", name: "Escrow__InvalidDeadline", inputs: [] },
  { type: "error", name: "Escrow__InvalidTradeId", inputs: [] },
  { type: "error", name: "Escrow__NoneZeroAddress", inputs: [] },
  { type: "error", name: "Escrow__NotATradeParty", inputs: [] },
  { type: "error", name: "Escrow__OnlyArbiterAddress", inputs: [] },
  { type: "error", name: "Escrow__OnlyBuyer", inputs: [] },
  { type: "error", name: "Escrow__ReceivedGoodsConditionsNotMet", inputs: [] },
  { type: "error", name: "Escrow__ShippedConditionsNotMet", inputs: [] },
  { type: "error", name: "Escrow__TradeConditionsHaveNotBeenMet", inputs: [] },
  {
    type: "error",
    name: "Escrow__TradeExpired",
    inputs: [{ name: "deadline", type: "uint256", internalType: "uint256" }],
  },
  { type: "error", name: "Escrow__TradeIdAlreadyFunded", inputs: [] },
  { type: "error", name: "Escrow__TradeIdNotFunded", inputs: [] },
  { type: "error", name: "Escrow__TradeNotCancellable", inputs: [] },
  { type: "error", name: "Escrow__TradeNotDisputable", inputs: [] },
  { type: "error", name: "Escrow__TradeNotDisputed", inputs: [] },
  {
    type: "error",
    name: "Escrow__TradeNotExpired",
    inputs: [{ name: "deadline", type: "uint256", internalType: "uint256" }],
  },
  {
    type: "error",
    name: "OwnableInvalidOwner",
    inputs: [{ name: "owner", type: "address", internalType: "address" }],
  },
  {
    type: "error",
    name: "OwnableUnauthorizedAccount",
    inputs: [{ name: "account", type: "address", internalType: "address" }],
  },
  { type: "error", name: "ReentrancyGuardReentrantCall", inputs: [] },
] as const;
