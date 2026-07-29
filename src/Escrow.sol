// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

// Layout of the contract file:
// version
// imports
// interfaces, libraries, contract
// errorssss

// Inside Contract:
// Type declarations
// State variables
// Events
// Modifiers

// Layout of Functions:
// constructor
// receive function (if exists)
// fallback function (if exists)
// external
// public
// internal
// private

// view & pure functions

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Vault} from "src/Vault.sol";
import {IVault} from "src/interfaces/IVault.sol";

// Escrow contract (per-trade logic)
// Holds trade-specific state: buyer, supplier, arbiter, amount, conditions, deadlines, status
// Handles the state machine (Created → Funded → ConditionsMet → Released/Disputed)
// One instance per trade (or a mapping-based single contract, depending on your factory pattern)

contract Escrow is ReentrancyGuard, Ownable {
    /*, AccessControl */
    /*//////////////////////////////////////////////////////////////
                              ERRORS
    //////////////////////////////////////////////////////////////*/
    error Escrow__OnlyArbiterAddress();
    error Escrow__InvalidSupplier();
    error Escrow__InvalidBuyer();
    error Escrow__NoneZeroAddress();
    error Escrow__InvalidAmount();
    error Escrow__ArbiterShouldBeNeutralThirdParty(address arbiter);
    error Escrow__OnlyBuyer();
    error Escrow__InvalidDeadline();
    error Escrow__TradeExpired(uint256 deadline);
    error Escrow__InvalidTradeId();
    error Escrow__TradeIdAlreadyFunded();

    /*//////////////////////////////////////////////////////////////
                            TYPE DECLARATIONS
    //////////////////////////////////////////////////////////////*/
    enum Status {
        Created,
        Funded,
        ConditionsMet,
        Disputed,
        Released
    }

    struct Trade {
        address buyer;
        address supplier;
        address arbiter; // Mutual agreement between Buyer and Supplier at trade creation — both must agree on a neutral third party before funds move (this is how real trade finance/escrow works — an agreed inspector, chamber of commerce, or trade finance institution)
        uint256 amount;
        uint64 deadline;
        bool shipped;
        bool customsCleared;
        bool goodsReceived;
        Status status;
    }

    /*//////////////////////////////////////////////////////////////
                            STATE VARIABLES
    //////////////////////////////////////////////////////////////*/
    // bytes32 private constant ARBITER_ROLE = keccak256("ARBITER_ROLE");

    IVault private immutable i_vault;

    uint256 public s_nextTradeId;

    mapping(uint256 tradeId => Trade) private s_trades;

    /*/////////////////////////////////////////////////////////
                            EVENTS
    /////////////////////////////////////////////////////////*/
    event TradeCreated(
        uint256 indexed tradeId, address indexed buyer, address supplier, address indexed arbiter, uint256 amount
    );
    event TradeFunded(uint256 indexed tradeId, address indexed buyer, address supplier, uint256 indexed amount);

    /*/////////////////////////////////////////////////////////
                            CONSTRUCTOR
    /////////////////////////////////////////////////////////*/
    constructor(address vaultAddress) Ownable(msg.sender) {
        if (vaultAddress == address(0)) {
            revert Escrow__NoneZeroAddress();
        }

        i_vault = IVault(vaultAddress);
    }

    /*//////////////////////////////////////////////////////////////
                        EXTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function createTrade(address buyer, address supplier, uint256 amount, address arbiter, uint64 deadline)
        external
        returns (uint256)
    {
        // CHECKS
        if (buyer == address(0)) {
            revert Escrow__NoneZeroAddress();
        }
        if (supplier == address(0)) {
            revert Escrow__NoneZeroAddress();
        }
        if (amount == 0) {
            revert Escrow__InvalidAmount();
        }
        if (deadline == 0) {
            revert Escrow__InvalidDeadline();
        }
        if (arbiter == address(0)) {
            revert Escrow__NoneZeroAddress();
        }
        if (block.timestamp >= deadline) {
            revert Escrow__TradeExpired(deadline);
        }
        if (arbiter == buyer || arbiter == supplier) {
            revert Escrow__ArbiterShouldBeNeutralThirdParty(arbiter);
        }
        if (msg.sender != buyer) {
            revert Escrow__OnlyBuyer();
        }

        // EFFECTS
        // t.deadline = block.timestamp + 2 days

        uint256 tradeId = s_nextTradeId++;
        s_trades[tradeId] = Trade({
            buyer: msg.sender,
            supplier: supplier,
            arbiter: arbiter,
            amount: amount,
            deadline: deadline,
            shipped: false,
            customsCleared: false,
            goodsReceived: false,
            status: Status.Created
        });

        // INTERACTIONS
        emit TradeCreated(tradeId, msg.sender, supplier, arbiter, amount);
        return tradeId;
    }

    function fundTrade(uint256 tradeId) external {
        // CHECKS

        if (tradeId > s_nextTradeId || tradeId == 0) {
            revert Escrow__InvalidTradeId();
        }

        if (s_trades[tradeId].status != Status.Created) {
            revert Escrow__TradeIdAlreadyFunded();
        }

        Trade storage t = s_trades[tradeId];

        if (msg.sender != t.buyer) {
            revert Escrow__OnlyBuyer();
        }
        if (block.timestamp >= t.deadline) {
            revert Escrow__TradeExpired(t.deadline);
        }

        // EFFECTS
        t.status = Status.Funded;

        // INTERACTIONS
        i_vault.depositERC(tradeId, t.buyer, t.amount);

        emit TradeFunded(tradeId, msg.sender, t.supplier, t.amount);
    }

    function confirmDelivery(uint256 tradeId) external {
        // CHECKS
        if (tradeId > s_nextTradeId || tradeId == 0) {
            revert Escrow__InvalidTradeId();
        }

        Trade storage t = s_trades[tradeId];
        
        if (msg.sender != t.arbiter) {
            revert Escrow__OnlyArbiterAddress();
        }

        // EFFECTS

        // INTERACTIONS
        i_vault.withdrawERC(tradeId, t.buyer, t.amount);
    }
    function release(uint256 tradeId) external {}


    /*////////////////////////////////////////////////////////////////
                        INTERNAL FUNCTIONS
    ////////////////////////////////////////////////////////////////*/

    /*//////////////////////////////////////////////////////////////
                    EXTERNAL VIEW & PURE FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    function getTradeArbiter(uint256 tradeId) external view returns (address) {
        return s_trades[tradeId].arbiter;
    }

    function getTrade(uint256 tradeId) external view returns (Trade memory) {
        return s_trades[tradeId];
    }

    function getTradeConditions(uint256 tradeId)
        external
        view
        returns (bool shipped, bool customsCleared, bool goodsReceived)
    {
        Trade storage t = s_trades[tradeId];
        return (t.shipped, t.customsCleared, t.goodsReceived);
    }
}
