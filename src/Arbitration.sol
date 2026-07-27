// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

contract Arbitration {
    constructor() {

    }
    
     function raiseDispute(uint256 tradeId) external {
        Trade storage t = trades[tradeId];
        require(msg.sender == t.buyer || msg.sender == t.supplier, "not a party");
        t.status = Status.Disputed;
    }

    function resolveDispute(uint256 tradeId, bool releaseToSupplier) external onlyArbiter {
        Trade storage t = trades[tradeId];
        require(t.status == Status.Disputed, "no dispute");
        if (releaseToSupplier) {
            _release(tradeId);
        } else {
            _refund(tradeId);
        }
    }
}