// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface IVault {
    function depositERC(uint256 tradeId, address from, uint256 amount) external;
}
