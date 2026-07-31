// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
// import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
// import {Vault} from "src/Vault.sol";
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
    error Escrow__TradeExpired(uint64 deadline);
    error Escrow__InvalidTradeId();
    error Escrow__TradeIdAlreadyFunded();
    error Escrow__TradeAlreadyReleasedOrDisputed();
    error Escrow__TradeConditionsHaveNotBeenMet();
    error Escrow__AllTradeConditionsMustBeMet();
    error Escrow__TradeIdNotFunded();
    error Escrow__ShippedConditionsNotMet();
    error Escrow__ReceivedGoodsConditionsNotMet();
    error Escrow__ClearedCustomsConditionsNotMet();
    error Escrow__TradeNotExpired(uint64 deadline);
    error Escrow__NotATradeParty();
    error Escrow__TradeNotDisputable();
    error Escrow__TradeNotDisputed();
    error Escrow__TradeNotCancellable();
    error Escrow__DifferentAddressesForBuyerAndSupplier();

    /*//////////////////////////////////////////////////////////////
                            TYPE DECLARATIONS
    //////////////////////////////////////////////////////////////*/
    enum Status {
        Created,
        Funded,
        ConditionsMet,
        Disputed,
        Cancelled,
        Refunded,
        Released
    }

    struct Trade {
        address buyer;
        address supplier;
        address arbiter; // Mutual agreement between Buyer and Supplier at trade creation — both must agree on a neutral third party before funds move (this is how real trade finance/escrow works — an agreed inspector, chamber of commerce, or trade finance institution)
        uint256 amount;
        uint64 deadline; // question: What exactly is this deadline supposed to protect against; late funding, late conditions met or late delivery confirmation?
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
    event TradeFundsReleasedToSupplier(uint256 indexed tradeId, address indexed supplier, uint256 indexed amount);
    event AllTradeConditionsMet(uint256 indexed tradeId);
    event ShippedConditionsMet(uint256 indexed tradeId);
    event ClearedCustomsConditionsMet(uint256 indexed tradeId);
    event ReceivedGoodsConditionsMet(uint256 indexed tradeId);
    event TradeRefunded(uint256 indexed tradeId, address indexed buyer, uint256 indexed amount);
    event TradeDisputed(uint256 indexed tradeId, address indexed);
    event TradeCancelled(uint256 indexed tradeId, address indexed);

    /*/////////////////////////////////////////////////////////
                            MODIFIERS
    /////////////////////////////////////////////////////////*/
    modifier validTradeId(uint256 tradeId) {
        if (tradeId >= s_nextTradeId) {
            revert Escrow__InvalidTradeId();
        }
        _;
    }

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
        nonReentrant
        returns (uint256 tradeId)
    {
        tradeId = _createTrade(buyer, supplier, amount, arbiter, deadline);
    }

    function fundTrade(uint256 tradeId) external nonReentrant {
        _fundTrade(tradeId);
    }

    function confirmDelivery(uint256 tradeId) external nonReentrant {
        _confirmDelivery(tradeId);
    }

    function meetTradeConditions(uint256 tradeId) external nonReentrant {
        _meetTradeConditions(tradeId);
    }

    function confirmShipped(uint256 tradeId, bool shipped) external nonReentrant {
        _confirmShipped(tradeId, shipped);
    }

    function confirmCustomsCleared(uint256 tradeId, bool customsCleared) external nonReentrant {
        _confirmCustomsCleared(tradeId, customsCleared);
    }

    function confirmGoodsReceived(uint256 tradeId, bool goodsReceived) external nonReentrant {
        _confirmGoodsReceived(tradeId, goodsReceived);
    }

    /*////////////////////////////////////////////////////////////////
                    EDGE CASES EXTERNAL FUNCTIONS
    ////////////////////////////////////////////////////////////////*/

    function raiseDispute(uint256 tradeId) external nonReentrant {
        _raiseDispute(tradeId);
    }

    function resolveDispute(uint256 tradeId, bool releaseToSupplier) external nonReentrant {
        _resolveDispute(tradeId, releaseToSupplier);
    }

    function claimRefund(uint256 tradeId) external nonReentrant {
        _claimRefund(tradeId);
    }

    // Trade ID is never rescinded — trade IDs should be permanent and never reused/deleted.
    // cancelTrade should just set status = Status.Cancelled (a new enum value you'll need to add).
    // Reusing IDs risks collisions with historical events/logs referencing that ID.
    // cancelTrade only applies to Status.Created (unfunded) trades.
    // No money has moved yet, so there's nothing in the Vault to return.
    function cancelTrade(uint256 tradeId) external nonReentrant {
        _cancelTrade(tradeId);
    }

    /*////////////////////////////////////////////////////////////////
                        INTERNAL FUNCTIONS
    ////////////////////////////////////////////////////////////////*/
    function _createTrade(address buyer, address supplier, uint256 amount, address arbiter, uint64 deadline)
        internal
        returns (uint256 tradeId)
    {
        // CHECKS
        if (buyer == address(0)) {
            revert Escrow__NoneZeroAddress();
        }
        if (supplier == address(0)) {
            revert Escrow__NoneZeroAddress();
        }
        if (supplier == buyer) {
            revert Escrow__DifferentAddressesForBuyerAndSupplier();
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
            revert Escrow__OnlyBuyer(); // to-do: OnlyBuyer modifier
        }

        // EFFECTS
        // t.deadline = block.timestamp + 2 days

        tradeId = s_nextTradeId++; // The post-increment and pre-increment operators are implemented by reading the variable’s value before or after modifying it. i++``returns the value of ``i before incrementing, and ++i returns the value of i after incrementing.
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

    function _fundTrade(uint256 tradeId) internal {
        // CHECKS

        if (tradeId >= s_nextTradeId) {
            revert Escrow__InvalidTradeId(); // to-do: Valid-trade ID Modifier
        }

        Trade storage t = s_trades[tradeId];

        if (t.status != Status.Created) {
            revert Escrow__TradeIdAlreadyFunded();
        }

        if (msg.sender != t.buyer) {
            revert Escrow__OnlyBuyer();
        }
        if (block.timestamp >= t.deadline) {
            revert Escrow__TradeExpired(t.deadline); // to-do: Active TradeId
        }

        // EFFECTS
        t.status = Status.Funded; // question: what if the vault tx fails, does it mean this enum won't reflect that?

        // INTERACTIONS
        i_vault.depositERC(tradeId, t.buyer, t.amount); // question: should this tx function call return probably a bool to ascertain if it went through?

        emit TradeFunded(tradeId, msg.sender, t.supplier, t.amount);
    }

    function _confirmDelivery(uint256 tradeId) internal {
        // CHECKS
        if (tradeId >= s_nextTradeId) {
            revert Escrow__InvalidTradeId();
        }

        Trade storage t = s_trades[tradeId];

        if (msg.sender != t.arbiter) {
            revert Escrow__OnlyArbiterAddress(); // to-do: OnlyArbiter Modifier
        }

        // if (t.status == Status.Released || t.status == Status.Disputed) {
        //     revert Escrow__TradeAlreadyReleasedOrDisputed();
        // }
        if (t.status != Status.ConditionsMet) {
            revert Escrow__TradeConditionsHaveNotBeenMet();
        }

        // EFFECTS
        t.status = Status.Released;

        // INTERACTIONS
        i_vault.withdrawERC(tradeId, t.supplier, t.amount);

        emit TradeFundsReleasedToSupplier(tradeId, t.supplier, t.amount);
    }

    function _meetTradeConditions(uint256 tradeId) internal {
        // CHECKS
        if (tradeId >= s_nextTradeId) {
            revert Escrow__InvalidTradeId();
        }

        Trade storage t = s_trades[tradeId];

        if (t.status != Status.Funded) {
            revert Escrow__TradeIdNotFunded(); // to-do : Notfunded modifier
        }
        if (msg.sender != t.arbiter) {
            revert Escrow__OnlyArbiterAddress(); // to-do : Modifier
        }
        // without it, the Arbiter could confirm conditions and release funds after the deadline has already passed — defeating the point of having a deadline at all. The deadline should act as a hard cutoff: past it, the only valid action left is claimRefund().
        if (block.timestamp >= t.deadline) {
            revert Escrow__TradeExpired(t.deadline); // to-do: modifier
        }

        // EFFECTS
        if (t.shipped && t.customsCleared && t.goodsReceived) {
            t.status = Status.ConditionsMet;
        } else {
            revert Escrow__AllTradeConditionsMustBeMet();
        }

        // INTERACTIONS
        emit AllTradeConditionsMet(tradeId);
    }

    function _confirmShipped(uint256 tradeId, bool shipped) internal {
        // CHECKS
        if (tradeId >= s_nextTradeId) {
            revert Escrow__InvalidTradeId();
        }

        Trade storage t = s_trades[tradeId];

        if (t.status != Status.Funded) {
            revert Escrow__TradeIdNotFunded();
        }
        if (msg.sender != t.arbiter) {
            revert Escrow__OnlyArbiterAddress();
        }
        if (block.timestamp >= t.deadline) {
            revert Escrow__TradeExpired(t.deadline);
        }

        // EFFECTS
        // t.shipped = true;
        if (shipped) {
            t.shipped = shipped;
        } else {
            revert Escrow__ShippedConditionsNotMet();
        }

        // INTERACTIONS
        emit ShippedConditionsMet(tradeId);
    }

    function _confirmCustomsCleared(uint256 tradeId, bool customsCleared) internal {
        // CHECKS
        if (tradeId >= s_nextTradeId) {
            revert Escrow__InvalidTradeId();
        }

        Trade storage t = s_trades[tradeId];

        if (t.status != Status.Funded) {
            revert Escrow__TradeIdNotFunded();
        }
        if (msg.sender != t.arbiter) {
            revert Escrow__OnlyArbiterAddress();
        }
        if (block.timestamp >= t.deadline) {
            revert Escrow__TradeExpired(t.deadline);
        }
        // EFFECTS
        if (customsCleared) {
            t.customsCleared = customsCleared;
        } else {
            revert Escrow__ClearedCustomsConditionsNotMet();
        }

        // INTERACTIONS
        emit ClearedCustomsConditionsMet(tradeId);
    }

    function _confirmGoodsReceived(uint256 tradeId, bool goodsReceived) internal {
        // CHECKS
        if (tradeId >= s_nextTradeId) {
            revert Escrow__InvalidTradeId();
        }

        Trade storage t = s_trades[tradeId];

        if (t.status != Status.Funded) {
            revert Escrow__TradeIdNotFunded();
        }
        if (msg.sender != t.arbiter) {
            revert Escrow__OnlyArbiterAddress();
        }
        if (block.timestamp >= t.deadline) {
            revert Escrow__TradeExpired(t.deadline);
        }

        // EFFECTS
        if (goodsReceived) {
            t.goodsReceived = goodsReceived;
        } else {
            revert Escrow__ReceivedGoodsConditionsNotMet();
        }

        // INTERACTIONS
        emit ReceivedGoodsConditionsMet(tradeId);
    }

    function _raiseDispute(uint256 tradeId) internal {
        // CHECKS
        if (tradeId >= s_nextTradeId) {
            revert Escrow__InvalidTradeId();
        }
        Trade storage t = s_trades[tradeId];
        if (msg.sender != t.buyer && msg.sender != t.supplier) {
            revert Escrow__NotATradeParty();
        }
        if (t.status != Status.Funded && t.status != Status.ConditionsMet) {
            revert Escrow__TradeNotDisputable();
        }
        if (block.timestamp >= t.deadline) {
            revert Escrow__TradeExpired(t.deadline);
        }

        // EFFECTS
        t.status = Status.Disputed;

        // INTERACTIONS
        emit TradeDisputed(tradeId, msg.sender);
    }

    function _resolveDispute(uint256 tradeId, bool releaseToSupplier) internal {
        // CHECKS
        if (tradeId >= s_nextTradeId) {
            revert Escrow__InvalidTradeId();
        }

        Trade storage t = s_trades[tradeId];

        if (t.status != Status.Disputed) {
            revert Escrow__TradeNotDisputed();
        }
        if (msg.sender != t.arbiter) {
            revert Escrow__OnlyArbiterAddress();
        }

        // EFFECTS & INTERACTIONS
        if (releaseToSupplier) {
            _release(tradeId);
        } else {
            _refund(tradeId);
        }
    }

    function _claimRefund(uint256 tradeId) internal {
        // CHECKS
        if (tradeId >= s_nextTradeId) {
            revert Escrow__InvalidTradeId();
        }
        Trade storage t = s_trades[tradeId];
        if (msg.sender != t.buyer) {
            revert Escrow__OnlyBuyer();
        }
        if (t.status != Status.Funded) {
            revert Escrow__TradeIdNotFunded();
        }
        if (block.timestamp < t.deadline) {
            revert Escrow__TradeNotExpired(t.deadline);
        }

        // EFFECTS & INTERACTIONS
        _refund(tradeId);
    }

    function _cancelTrade(uint256 tradeId) internal {
        // CHECKS
        if (tradeId >= s_nextTradeId) {
            revert Escrow__InvalidTradeId();
        }

        Trade storage t = s_trades[tradeId];

        if (msg.sender != t.buyer) {
            revert Escrow__OnlyBuyer();
        }
        if (t.status != Status.Created) {
            revert Escrow__TradeNotCancellable();
        }

        // EFFECTS
        t.status = Status.Cancelled;

        // INTERACTIONS
        emit TradeCancelled(tradeId, msg.sender);
    }

    function _release(uint256 tradeId) internal {
        Trade storage t = s_trades[tradeId];
        t.status = Status.Released;

        i_vault.withdrawERC(tradeId, t.supplier, t.amount);

        emit TradeFundsReleasedToSupplier(tradeId, t.supplier, t.amount);
    }

    function _refund(uint256 tradeId) internal {
        Trade storage t = s_trades[tradeId];
        t.status = Status.Refunded;

        i_vault.withdrawERC(tradeId, t.buyer, t.amount);
        emit TradeRefunded(tradeId, t.buyer, t.amount);
    }

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

    // getDisputeStatus(tradeId)

    // question: how can i get a tradeid incase the parties involved forget
}

