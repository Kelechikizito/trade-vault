// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
// import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
// import {Vault} from "src/Vault.sol";
import {IVault} from "src/interfaces/IVault.sol";

/**
 * @title Escrow
 * @author Kelechi Kizito Ugwu
 * @notice The Escrow holds the per-trade logic for the TradeVault project. It allows users to create and manage Trades for their global/regional/local shipments.
 * @notice Each Trade contains info; buyer, supplier, arbiter, amount, conditions, deadlines, and status. Each identified by a tradeID.
 */

contract Escrow is ReentrancyGuard, Ownable {
    /*, AccessControl */
    /*//////////////////////////////////////////////////////////////
                              ERRORS
    //////////////////////////////////////////////////////////////*/
    /// @dev This error is thrown when the operation demands the msg.sender be the arbiter.
    error Escrow__OnlyArbiterAddress();
    /// @dev This error is thrown when a zero address is provided
    error Escrow__NoneZeroAddress();.
    /// @dev This error is thrown when an invalid amount is provided.
    error Escrow__InvalidAmount();
    /// @dev This error is thrown when an address isn't different from the buyer or supplier.
    error Escrow__ArbiterShouldBeNeutralThirdParty(address arbiter);
    /// @dev This error is thrown when the opeartion demands only the buyer.
    error Escrow__OnlyBuyer();
    /// @dev This error is thrown when the deadline doesn't conincide with the rule of the opeartion.
    error Escrow__InvalidDeadline();
    /// @dev This error is thrown when an expired trade deadline is provided.
    error Escrow__TradeExpired(uint256 deadline);
    /// @dev This error is thrown when an invalid tradeId is provided.
    error Escrow__InvalidTradeId();
    /// @dev This error is thrown when the tradeId has already been funded and the operation demands it be unfunded.
    error Escrow__TradeIdAlreadyFunded();
    /// @dev This 
    error Escrow__TradeConditionsHaveNotBeenMet();
    error Escrow__AllTradeConditionsMustBeMet();
    error Escrow__TradeIdNotFunded();
    error Escrow__ShippedConditionsNotMet();
    error Escrow__ReceivedGoodsConditionsNotMet();
    error Escrow__ClearedCustomsConditionsNotMet();
    error Escrow__TradeNotExpired(uint256 deadline);
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
        uint256 deadline; // question: What exactly is this deadline supposed to protect against; late funding, late conditions met or late delivery confirmation?
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

    function createTrade(address buyer, address supplier, uint256 amount, address arbiter, uint256 deadline)
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
    /**
     * @dev This function creates a new trade and stores it in the s_trades mapping. It performs various checks to ensure that the trade parameters are valid, such as checking for non-zero addresses, different addresses for buyer and supplier, valid amount and deadline, and ensuring that the arbiter is a neutral third party. If all checks pass, it creates a new Trade struct and emits a TradeCreated event.
     * @param buyer The buyer address of the trade.
     * @param supplier The supplier address of the trade.
     * @param amount The amount of the trade.
     * @param arbiter The arbiter address of the trade.
     * @param deadline The deadline timestamp for the trade.
     * @return tradeId The unique identifier of the newly created trade.
     */
    function _createTrade(address buyer, address supplier, uint256 amount, address arbiter, uint256 deadline)
        internal
        returns (uint256 tradeId)
    {
        // check if msg.sender == buyer?
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

    /**
     * @dev This function allows the buyer to fund a trade by depositing the specified amount into the vault. It performs various checks to ensure that the trade is valid, such as checking if the trade ID is valid, if the trade has already been funded, if the caller is the buyer, and if the trade has not expired. If all checks pass, it updates the trade status to Funded and calls the depositERC function of the vault to transfer the funds. Finally, it emits a TradeFunded event.
     * @param tradeId The unique identifier of the trade to be funded.
     */
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

    /**
     * @dev This function allows the arbiter to confirm the delivery of goods for a trade. It performs various checks to ensure that the trade is valid, such as checking if the trade ID is valid, if the caller is the arbiter, and if the trade conditions have been met. If all checks pass, it updates the trade status to Released and calls the withdrawERC function of the vault to transfer the funds to the supplier. Finally, it emits a TradeFundsReleasedToSupplier event.
     * @param tradeId The unique identifier of the trade to be funded.
     */
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

    /**
     * @dev This function allows the arbiter to confirm that all trade conditions have been met for a specific trade. It performs various checks to ensure that the trade is valid, such as checking if the trade ID is valid, if the trade has been funded, if the caller is the arbiter, and if the trade has not expired. If all checks pass and all conditions (shipped, customs cleared, goods received) are met, it updates the trade status to ConditionsMet and emits an AllTradeConditionsMet event.
     * @param tradeId The unique identifier of the trade.
     */
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

    /**
     * @dev This function allows the arbiter to confirm that the goods have been shipped for a specific trade. It performs various checks to ensure that the trade is valid, such as checking if the trade ID is valid, if the trade has been funded, if the caller is the arbiter, and if the trade has not expired. If all checks pass and the shipped condition is met, it updates the shipped status of the trade and emits a ShippedConditionsMet event.
     * @param tradeId The unique identifier of the trade.
     * @param shipped A boolean indicating whether the goods have been shipped.
     */
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

    /**
     * @dev This function allows the arbiter to confirm that the goods have been cleared for a specific trade. 
     * @param tradeId The unique identifier of the trade.
     * @param customsCleared A boolean indicating whether the goods have been customs cleared.
     */
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

    /**
     * @dev This function allows the arbiter to confirm that the goods have been received for a specific trade. It performs various checks to ensure that the trade is valid, such as checking if the trade ID is valid, if the trade has been funded, if the caller is the arbiter, and if the trade has not expired. If all checks pass and the goods received condition is met, it updates the goods received status of the trade and emits a ReceivedGoodsConditionsMet event.
     * @param tradeId The unique identifier of the trade.
     * @param goodsReceived A boolean indicating whether the goods have been received.
     */
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

    /**
     * @dev This function allows the buyer or supplier to raise a dispute for a specific trade. It performs various checks to ensure that the trade is valid, such as checking if the trade ID is valid, if the caller is either the buyer or supplier, if the trade status allows for disputes, and if the trade has not expired. If all checks pass, it updates the trade status to Disputed and emits a TradeDisputed event.
     * @param tradeId The unique identifier of the trade.
     */
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

    /**
     * @dev This function allows the arbiter to resolve a dispute for a specific trade. It performs various checks to ensure that the trade is valid and that the caller is the arbiter. If all checks pass, it updates the trade status based on the resolution and emits a TradeResolved event.
     * @param tradeId The unique identifier of the trade to be resolved.
     * @param releaseToSupplier A boolean indicating whether the funds should be released to the supplier.
     */
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

    /**
     * @dev This function allows the buyer to claim a refund for a specific trade if the trade has expired and the conditions have not been met. It performs various checks to ensure that the trade is valid, such as checking if the trade ID is valid, if the caller is the buyer, if the trade has been funded, and if the trade has expired. If all checks pass, it calls the _refund function to process the refund.
     * @param tradeId The unique identifier of the trade.
     */
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

    /**
     * @dev This function allows the buyer to cancel a trade if it is still in the Created status. It performs various checks to ensure that the trade is valid, such as checking if the trade ID is valid, if the caller is the buyer, and if the trade is in the Created status. If all checks pass, it updates the trade status to Cancelled and emits a TradeCancelled event.
     * @param tradeId The unique identifier of the trade to be cancelled.
     */
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

    /**
     * @dev Internal helper function to withdraw ERC from the vault contract to the supplier.
     * @param tradeId The unique identifier of the trade.
     */
    function _release(uint256 tradeId) internal {
        Trade storage t = s_trades[tradeId];
        t.status = Status.Released;

        i_vault.withdrawERC(tradeId, t.supplier, t.amount);

        emit TradeFundsReleasedToSupplier(tradeId, t.supplier, t.amount);
    }

    /**
     * @dev Internal helper function to withdraw ERC from the vault contract to the buyer.
     * @param tradeId The unique identifier of the trade.
     */
    function _refund(uint256 tradeId) internal {
        Trade storage t = s_trades[tradeId];
        t.status = Status.Refunded;

        i_vault.withdrawERC(tradeId, t.buyer, t.amount);
        emit TradeRefunded(tradeId, t.buyer, t.amount);
    }

    /*//////////////////////////////////////////////////////////////
                    EXTERNAL VIEW & PURE FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    /**
     * @dev Getter function to return a trade arbiter address.
     * @param tradeId The unique identifier of the trade.
     * @return The address of the arbiter for the specified trade ID.
     */
    function getTradeArbiter(uint256 tradeId) external view returns (address) {
        return s_trades[tradeId].arbiter;
    }

    /**
     * @dev Getter function to return a trade struct.
     * @param tradeId The unique identifier of the trade.
     * @return The Trade struct for the specified trade ID.
     */
    function getTrade(uint256 tradeId) external view returns (Trade memory) {
        return s_trades[tradeId];
    }

    /**
     * @dev Getter function to return the conditions of a trade.
     * @param tradeId The unique identifier of the trade.
     * @return A tuple containing the shipping status, customs clearance status, and goods receipt status.
     */
    function getTradeConditions(uint256 tradeId)
        external
        view
        returns (bool shipped, bool customsCleared, bool goodsReceived)
    {
        Trade storage t = s_trades[tradeId];
        return (t.shipped, t.customsCleared, t.goodsReceived);
    }

    /**
     * @dev Getter function to return the status of a trade.
     * @param tradeId The unique identifier of the trade.
     * @return The status of the specified trade ID.
     */
    function getTradeStatus(uint256 tradeId) external view returns (Status) {
        return s_trades[tradeId].status;
    }

    // getDisputeStatus(tradeId)

    // question: how can i get a tradeid incase the parties involved forget
}

