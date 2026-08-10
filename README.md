# TradeVault

TradeVault is a DeFi-native escrow platform securing cross-border trade between businesses and overseas suppliers. Funds are locked in a smart contract and released automatically once agreed trade and delivery conditions are verified by a neutral, mutually-agreed arbiter.

⚠ This repository was built for the Arc hackathon and is a proof-of-concept — not audited, not production-ready.

A live frontend demo is available at [trade-vault-gamma.vercel.app](https://trade-vault-gamma.vercel.app/).

**Live on Arc Testnet:**

- Vault: [`0x194b050678eb50923b84fE5aDC8E6f8176D43335`](https://testnet.arcscan.app/address/0x194b050678eb50923b84fe5adc8e6f8176d43335)
- Escrow: [`0xce0c01B9c2E407af328eB25D06aea0f1929aaBC7`](https://testnet.arcscan.app/address/0xce0c01b9c2e407af328eb25d06aea0f1929aabc7)

## Table of Contents

- [TradeVault](#tradevault)
  - [Table of Contents](#table-of-contents)
  - [Overview](#overview)
  - [System Actors](#system-actors)
  - [Contracts/Architecture](#contractsarchitecture)
  - [Trade Lifecycle](#trade-lifecycle)
  - [OpenZeppelin Integrations](#openzeppelin-integrations)
    - [Ownable](#ownable)
    - [ReentrancyGuard](#reentrancyguard)
    - [SafeERC20](#safeerc20)
  - [Frontend](#frontend)
  - [Deployment and Interaction](#deployment-and-interaction)
  - [Testing](#testing)
    - [Unit Tests](#unit-tests)
    - [Arc Testnet Fork Tests](#arc-testnet-fork-tests)
  - [Testnet Deployments](#testnet-deployments)
  - [Future Developments](#future-developments)
  - [Acknowledgement](#acknowledgement)

## Overview

**Problem statement**: Cross-border trade between businesses and overseas suppliers runs on trust that doesn't scale. Buyers who pay upfront risk suppliers who never ship; suppliers who ship first risk buyers who never pay. Traditional instruments — bank wires, letters of credit — are slow, expensive, and still depend on institutional trust, with no fast or fair mechanism to resolve disputes when something goes wrong.

**Solution**: TradeVault splits custody and trade logic into two single-responsibility contracts. A `Vault` contract holds locked stablecoin funds with no awareness of trade terms. An `Escrow` contract holds all trade-specific state — buyer, supplier, arbiter, amount, deadline, and delivery conditions — and drives a state machine (`Created → Funded → ConditionsMet → Released`, with `Disputed`, `Cancelled`, and `Refunded` branches) that gates when the Vault is instructed to move funds. Delivery conditions (shipped, customs cleared, goods received) are confirmed individually by a neutral, mutually-agreed arbiter, and funds only release once all three are met and the arbiter explicitly confirms delivery.

## System Actors

**Buyer** creates a trade (defining supplier, arbiter, amount, and deadline), funds the trade in stablecoin, and can raise a dispute or claim a refund if the deadline passes without delivery being confirmed. Only the buyer can cancel an unfunded trade.

**Supplier** ships goods off-chain once a trade is created and funded, and can raise a dispute if delivery or payment doesn't proceed as agreed. The supplier has no on-chain confirmation power — they wait on the arbiter.

**Arbiter** is a neutral third party, agreed on by the buyer and supplier at trade creation (e.g. an inspector, chamber of commerce, or trade finance institution). The arbiter confirms each delivery milestone individually, marks conditions met once all three are confirmed, triggers final release of funds to the supplier, and resolves disputes if either party raises one.

## Contracts/Architecture

The system is split into two contracts to isolate custody from trade logic, minimizing the attack surface of the contract that actually holds funds.

**`Vault.sol`** is a pure custody layer. It holds stablecoin balances keyed by trade ID and exposes deposit/withdraw functions callable only by the `Escrow` contract, enforced via an `onlyEscrow` access check. It has no concept of trade conditions, disputes, or state — only accounting.

**`Escrow.sol`** holds all per-trade state in a `Trade` struct (buyer, supplier, arbiter, amount, deadline, shipped, customsCleared, goodsReceived, status) and drives the trade lifecycle through its `Status` enum. It validates every state transition, calls into the Vault to move funds when a transition requires it, and is the only contract users interact with directly.

See [`./src/Vault.sol`](./src/Vault.sol) and [`./src/Escrow.sol`](./src/Escrow.sol).

## Trade Lifecycle

```
Created → Funded → ConditionsMet → Released
              │           │
              └─────► Disputed ──► Released or Refunded
              │
              └─────► Refunded (deadline passes, unresolved)

Created ──► Cancelled (buyer cancels before funding)
```

- **Created** — buyer defines trade terms; no funds moved yet.
- **Funded** — buyer deposits the agreed amount into the Vault via `fundTrade()`.
- **ConditionsMet** — arbiter has confirmed all three delivery milestones (`confirmShipped`, `confirmCustomsCleared`, `confirmGoodsReceived`) and called `meetTradeConditions()`.
- **Released** — arbiter calls `confirmDelivery()`; Vault pays the supplier.
- **Disputed** — either buyer or supplier calls `raiseDispute()` while funded or conditions-met, before the deadline; arbiter resolves via `resolveDispute()`, releasing to the supplier or refunding the buyer.
- **Refunded** — buyer calls `claimRefund()` after the deadline passes with no conditions met, or via dispute resolution.
- **Cancelled** — buyer calls `cancelTrade()` on an unfunded trade; no funds were ever locked.

## OpenZeppelin Integrations

### Ownable

Used in both contracts for administrative control — `Vault` uses it to gate `setEscrow()`, the one-time wiring step that links the Vault to its Escrow contract.

### ReentrancyGuard

Applied to every external state-changing function in both contracts via `nonReentrant`, protecting fund-moving calls (`depositERC`, `withdrawERC`) against reentrancy.

### SafeERC20

Used for all stablecoin transfers (`safeTransferFrom`, `safeTransfer`) in `Vault.sol`, guarding against non-standard ERC20 tokens (e.g. USDT-style tokens that don't return a bool on transfer).

## Frontend

The frontend is built with Next.js and Tailwind, using `wagmi`/`viem` with RainbowKit for wallet connection, scaffolded in part with v0.dev. It provides a single app with role-based dashboard routing — the connected wallet address is compared against each trade's `buyer`/`supplier`/`arbiter` field to determine which actions are shown, rather than separate pages per role.

Live demo: [trade-vault-gamma.vercel.app](https://trade-vault-gamma.vercel.app/)

## Deployment and Interaction

Contracts were deployed to Arc Testnet in three steps, in order — Vault first (with a temporary placeholder escrow address), then Escrow (which resolves the just-deployed Vault's address automatically via `foundry-devops`), then a final call to wire the two together:

```bash
make deploy-usdc-vault-arc-testnet
make deploy-escrow-arc-testnet
make set-actual-escrow-script-arc-testnet
```

Equivalent to running each script directly:

```bash
forge script script/deployment/DeployVaultScript.s.sol:DeployVaultScript \
  --sig "run(address,address)" <USDC_TOKEN_ADDRESS> <DEPLOYER_ADDRESS> \
  --rpc-url <ARC_TESTNET_RPC_URL> --account <YOUR_FOUNDRY_KEYSTORE> \
  --broadcast --verify --verifier blockscout \
  --verifier-url https://testnet.arcscan.app/api/ -vvvv

forge script script/deployment/DeployEscrowScript.s.sol:DeployEscrowScript \
  --rpc-url <ARC_TESTNET_RPC_URL> --account <YOUR_FOUNDRY_KEYSTORE> \
  --broadcast --verify --verifier blockscout \
  --verifier-url https://testnet.arcscan.app/api/ -vvvv

forge script script/interactions/SetEscrowScript.s.sol:SetEscrowScript \
  --rpc-url <ARC_TESTNET_RPC_URL> --account <YOUR_FOUNDRY_KEYSTORE> \
  --broadcast -vvvv
```

`DeployEscrowScript` and `SetEscrowScript` both resolve the relevant contract addresses automatically from Foundry's broadcast history via `DevOpsTools.get_most_recent_deployment(...)` — no manual address copy-pasting required between steps, as long as they're run in order on the same chain.

## Testing

This project was built with [Foundry](https://getfoundry.sh/introduction/installation/). To run the tests, Foundry and the project's dependencies need to be installed.

```
foundryup
forge install
```

### Unit Tests

Unit tests cover the full trade lifecycle — creation, funding, milestone confirmation, conditions-met, delivery/release, disputes, refunds, and cancellation — using Foundry's `forge-std/Test.sol`. Tests use `vm.prank` to simulate buyer/supplier/arbiter calls, `deal`/`forceApprove` for stablecoin setup, and `vm.expectRevert` to assert every custom error path.

```
forge test --match-contract EscrowTest
forge test --match-contract VaultTest
```

### Arc Testnet Fork Tests

Selected tests run against a live fork of Arc Testnet via `vm.createSelectFork("arc_testnet")`, verifying the full deposit → confirm → release flow against real network conditions rather than local simulated state.

```
forge test --match-test OnArc -vvvv
```

## Testnet Deployments

| Contract | Address                                      | Explorer                                                                                          |
| -------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Vault    | `0x194b050678eb50923b84fE5aDC8E6f8176D43335` | [View on Arcscan](https://testnet.arcscan.app/address/0x194b050678eb50923b84fe5adc8e6f8176d43335) |
| Escrow   | `0xce0c01B9c2E407af328eB25D06aea0f1929aaBC7` | [View on Arcscan](https://testnet.arcscan.app/address/0xce0c01b9c2e407af328eb25d06aea0f1929aabc7) |

Both contracts are verified on Blockscout — source, ABI, and a read/write UI are available at the links above.

## Future Developments

- Finish swapping the frontend's remaining mock-data reads over to the live deployed contracts above.
- Add a dedicated `Arbitration` contract to separate dispute logic from core Escrow trust flow.
- Expand test coverage with fuzz tests on trade amounts and deadlines.
- Multi-token support beyond a single hardcoded stablecoin (planned as separate Vault/Escrow pairs per token).
- Timelock/multisig governance on `setEscrow()` in place of a single-owner key.

## Acknowledgement

Architecture, contract review, and this README were developed with assistance from Claude.
