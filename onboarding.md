# TradeVault Security Review Onboarding

# Table of Contents

- [TradeVault Security Review Onboarding](#tradevault-security-review-onboarding)
- [Table of Contents](#table-of-contents)
- [About the project / Documentation](#about-the-project--documentation)
- [Stats](#stats)
- [Setup](#setup)
  - [Requirements](#requirements)
  - [Testing](#testing)
- [Security Review Scope](#security-review-scope)
  - [Commit Hash](#commit-hash)
  - [Repo URL](#repo-url)
  - [In scope vs out of scope contracts](#in-scope-vs-out-of-scope-contracts)
  - [Compatibilities](#compatibilities)
- [Roles](#roles)
- [Known Issues](#known-issues)

# About the project / Documentation

TradeVault is a DeFi-native escrow platform securing cross-border trade between businesses and overseas suppliers. Funds are locked in a smart contract and released automatically once agreed trade and delivery conditions are verified by a neutral, mutually-agreed arbiter.

**Core architecture:**

- `Escrow.sol` — the main user-facing contract. Holds all per-trade state (buyer, supplier, arbiter, amount, deadline, delivery conditions) and drives the trade lifecycle state machine. Calls into `Vault` to move funds when a transition requires it.
- `Vault.sol` — pure custody layer. Holds locked stablecoin balances keyed by trade ID. Has no awareness of trade conditions, disputes, or status — only accounting. Deposit/withdraw are callable only by the Escrow contract.
- `IVault.sol` — interface consumed by `Escrow` to call into `Vault`.

**Key design decisions:**

- Custody and trade logic are deliberately split across two contracts to minimize the attack surface of the contract that actually holds funds.
- Delivery conditions are confirmed individually and incrementally (`confirmShipped`, `confirmCustomsCleared`, `confirmGoodsReceived`) rather than as a single flag — each takes an explicit `bool` parameter by design choice, not inferred.
- `meetTradeConditions()` is a separate, explicit step that flips status to `ConditionsMet` once all three booleans are true — it does not happen automatically as a side effect of the third confirmation.
- Dispute handling (`raiseDispute`, `resolveDispute`) currently lives inside `Escrow.sol` itself rather than a separate `Arbitration` contract — a scope decision made for hackathon timeline reasons, not yet split out.
- `Vault.setEscrow()` is a one-time wiring step (owner-only) linking the Vault to its Escrow contract after both are deployed, since neither constructor can reference the other's not-yet-deployed address directly.

---

# Stats

Full test suite (unit + Arc Testnet fork tests):

```
Suite result: ok. 63 passed; 0 failed; 0 skipped; finished in 19.55s (37.59s CPU time)
Ran 2 test suites in 19.56s: 64 tests passed, 0 failed, 0 skipped (64 total tests)
```

Coverage (`forge coverage`):

| File                                         | % Lines              | % Statements         | % Branches         | % Funcs            |
| -------------------------------------------- | -------------------- | -------------------- | ------------------ | ------------------ |
| `script/deployment/DeployEscrowScript.s.sol` | 85.71% (6/7)         | 100.00% (7/7)        | 100.00% (0/0)      | 50.00% (1/2)       |
| `script/deployment/DeployVaultScript.s.sol`  | 85.71% (6/7)         | 100.00% (7/7)        | 100.00% (0/0)      | 50.00% (1/2)       |
| `script/interactions/SetEscrowScript.s.sol`  | 83.33% (5/6)         | 100.00% (4/4)        | 100.00% (0/0)      | 50.00% (1/2)       |
| `src/Escrow.sol`                             | 95.90% (187/195)     | 95.24% (160/168)     | 91.38% (53/58)     | 96.67% (29/30)     |
| `src/Vault.sol`                              | 92.31% (24/26)       | 77.27% (17/22)       | 0.00% (0/5)        | 100.00% (7/7)      |
| **Total**                                    | **94.61% (228/241)** | **93.75% (195/208)** | **84.13% (53/63)** | **90.70% (39/43)** |

- **Security Review Timeline:** 2 days

---

# Setup

## Requirements

```bash
# Clone the repository
git clone https://github.com/Kelechikizito/trade-vault
cd trade-vault

# Install dependencies
forge install OpenZeppelin/openzeppelin-contracts --no-commit

# Build
forge build
```

Requires:

- [Foundry](https://getfoundry.sh/) (latest)
- An Arc Testnet RPC URL set in `.env` for fork tests:

```bash
# .env
ARC_TESTNET_RPC_URL=<YOUR_ARC_TESTNET_RPC_URL>
```

## Testing

```bash
# Run all tests
forge test

# Run with verbosity (recommended for fork tests)
forge test -vvvv

# Run only Arc Testnet fork tests
forge test --match-test "OnArc" -vvvv

# Coverage report
forge coverage
```

> Note: Fork tests require a valid Arc Testnet RPC URL in `foundry.toml` or `.env`. These tests fork Arc Testnet to verify the deposit → confirm → release flow against real network conditions.

---

# Security Review Scope

## Commit Hash

[`c6fd07e`](https://github.com/Kelechikizito/trade-vault/commit/c6fd07e57441e23599d06174d466409848a2885f)

## Repo URL

`https://github.com/Kelechikizito/trade-vault`

## In scope vs out of scope contracts

**In scope:**
| Contract | Path |
|---|---|
| Escrow | `src/Escrow.sol` |
| Vault | `src/Vault.sol` |
| IVault | `src/interfaces/IVault.sol` |

**Out of scope:**

- OpenZeppelin library contracts
- Deployment and interaction scripts (`script/`)
- All test files (`test/`)

## Compatibilities

- **Solc Version:** `0.8.30`
- **Chain(s) to deploy to:**
  - Arc Testnet
- **Tokens:**
  - Strictly standard ERC20 tokens (USDC-like). Fee-on-transfer, rebasing, and other non-standard ERC20 behaviors are not supported.

---

# Roles

```
Actors:

  Buyer:
    - Calls createTrade() to define trade terms (supplier, arbiter, amount, deadline)
    - Calls fundTrade() to deposit the agreed stablecoin amount into the Vault
    - Can call raiseDispute() if delivery or conditions are contested
    - Can call claimRefund() if the deadline passes with conditions unmet
    - Can call cancelTrade() only while the trade is unfunded (status: Created)

  Supplier:
    - Ships goods off-chain once a trade is created and funded
    - Can call raiseDispute() if delivery or payment doesn't proceed as agreed
    - Has no on-chain confirmation power — cannot self-confirm delivery or trigger release

  Arbiter:
    - Neutral third party, set per-trade at creation — mutually agreed by buyer and supplier
    - Calls confirmShipped(), confirmCustomsCleared(), confirmGoodsReceived() individually to confirm each delivery milestone
    - Calls meetTradeConditions() once all three milestones are confirmed, flipping status to ConditionsMet
    - Calls confirmDelivery() to trigger final release of funds to the supplier
    - Calls resolveDispute() to resolve a disputed trade, releasing to the supplier or refunding the buyer

  Owner (Vault):
    - Deployed the Vault contract
    - Calls setEscrow() once, to wire the Vault to its Escrow contract post-deployment
    - Has no access to move or withdraw locked trade funds directly
```

---

# Known Issues

1. **Fuzz and invariant tests not yet written** — the current 64 tests are unit and Arc Testnet fork tests only. Fuzz tests (particularly on trade amounts and deadlines) and invariant tests (e.g. Vault balance always reconciles against sum of active trade amounts) are planned but not yet implemented.

2. **`Vault.sol` branch coverage is 0% (0/5)** — while line/statement/function coverage on `Vault.sol` is high, no test currently exercises its conditional branches directly (e.g. the `Vault__InsufficientBalance` revert path). Worth flagging for reviewers as an under-tested area relative to `Escrow.sol`.

3. **Dispute logic is not isolated in a separate contract** — `raiseDispute()`/`resolveDispute()` currently live inside `Escrow.sol` rather than a dedicated `Arbitration` contract. This was a scope decision for hackathon timeline reasons; the mixing of core trust-flow logic and dispute-resolution logic in one contract increases `Escrow.sol`'s surface area relative to a split design.

4. **`Vault.setEscrow()` is an ownable, single-key operation** — while intended as a one-time wiring step post-deployment, the function itself has no on-chain enforcement preventing repeated calls by the owner. A compromised or malicious owner key could re-point `s_escrow` to an attacker-controlled address after initial setup. No timelock or multisig currently gates this function.

5. **Deployment/interaction script coverage sits at 50% function coverage** — expected, since these scripts include both a `run()` entrypoint and helper functions not all exercised in the same test pass; not a contract-logic concern, flagged for completeness only.
