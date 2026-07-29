// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface IVault {
    function depositERC(uint256 tradeId, address from, uint256 amount) external;
    function withdrawERC(uint256 tradeId, address to, uint256 amount) external;
}
