// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

// This contract isolates the "what happens when things go wrong" logic away from the core Escrow trust flow —
// dispute-raising and dispute-resolution, nothing else.
contract Arbitration {
    constructor() {}

    // suggestion: might implement a text to show the reason behind a dispute
    function raiseDispute(uint256 tradeId) external {
        Trade storage t = trades[tradeId];
        require(msg.sender == t.buyer || msg.sender == t.supplier, "not a party");
        t.status = Status.Disputed;
    }

    function resolveDispute(uint256 tradeId, bool releaseToSupplier) external onlyArbiter {
        Trade storage t = trades[tradeId];
        require(t.status == Status.Disputed, "no dispute");
        if (msg.sender != t.arbiter) {
            revert Arbitration__OnlyArbiterAddress();
        }
        if (releaseToSupplier) {
            _release(tradeId);
        } else {
            _refund(tradeId);
        }
    }

    function raiseDispute(uint256 tradeId) external {}

    function resolveDispute(uint256 tradeId) external {}
}
