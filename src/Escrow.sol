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

// Escrow contract (per-trade logic)
// Holds trade-specific state: buyer, supplier, arbiter, amount, conditions, deadlines, status
// Handles the state machine (Created → Funded → ConditionsMet → Released/Disputed)
// One instance per trade (or a mapping-based single contract, depending on your factory pattern)

contract Escrow is ReentrancyGuard, Ownable/*, AccessControl */{
    /*//////////////////////////////////////////////////////////////
                              ERRORS
    //////////////////////////////////////////////////////////////*/
    error Escrow__OnlyArbiterAddress();
    error Escrow__InvalidSupplier();
    error Escrow__InvalidAmount();

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

    uint256 public s_nextTradeId;

    mapping(uint256 tradeId => Trade) private s_trades;


    /*/////////////////////////////////////////////////////////
                            EVENTS
    /////////////////////////////////////////////////////////*/

    /*/////////////////////////////////////////////////////////
                            CONSTRUCTOR
    /////////////////////////////////////////////////////////*/
    constructor() Ownable(msg.sender) {}

    /*//////////////////////////////////////////////////////////////
                        EXTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    function confirmDelivery(uint256 tradeId) external onlyArbiter {
        trades[tradeId].conditionsMet = true;
        _release(tradeId);
    }

    function createTrade(address buyer, address supplier, uint256 amount, uint64 deadline) external {
        t.status = Status.Created;
    }

    function release(uint256 tradeId) external {

    }

    /*////////////////////////////////////////////////////////////////
                        INTERNAL FUNCTIONS
    ////////////////////////////////////////////////////////////////*/

    /*//////////////////////////////////////////////////////////////
                    EXTERNAL VIEW & PURE FUNCTIONS
    //////////////////////////////////////////////////////////////*/
   
}
