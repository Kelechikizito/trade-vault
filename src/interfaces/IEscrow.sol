// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface IEscrow {
    /*//////////////////////////////////////////////////////////////
                            TYPE DECLARATIONS
    //////////////////////////////////////////////////////////////*/
     enum Status {
        Created,
        Funded,
        ConditionsMet,
        Disputed,
        // Cancelled,
        // Refunded,
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



    function createTrade(address buyer, address supplier, uint256 amount, address arbiter, uint64 deadline) external returns(uint256);

    function fundTrade(uint256 tradeId) external;

    function confirmDelivery(uint256 tradeId) external;

    function meetTradeConditions(uint256 tradeId) external;

    function confirmShipped(uint256 tradeId, bool shipped) external ;

    function confirmCustomsCleared(uint256 tradeId, bool customsCleared) external;

    function confirmGoodsReceived(uint256 tradeId, bool goodsReceived) external;

    /*//////////////////////////////////////////////////////////////
                        VIEW & PURE FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    function getTradeArbiter(uint256 tradeId) external view returns (address);

    function getTrade(uint256 tradeId) external view returns (Trade memory);

       function getTradeConditions(uint256 tradeId)
        external
        view
        returns (bool shipped, bool customsCleared, bool goodsReceived);
}